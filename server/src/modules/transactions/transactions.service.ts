import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { WarehouseInventory } from '../warehouse-inventory/entities/warehouse-inventory.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async create(
    user: { userId: string; companyId: string; warehouseId?: string; role: UserRole },
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const inventory = await queryRunner.manager
        .createQueryBuilder(WarehouseInventory, 'inv')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('inv.warehouse', 'warehouse')
        .where('inv.id = :id', { id: dto.warehouseInventoryId })
        .andWhere('warehouse.companyId = :companyId', { companyId: user.companyId })
        .getOne();

      if (!inventory) {
        throw new NotFoundException('Warehouse inventory record not found.');
      }

      if (user.role === UserRole.STAFF && inventory.warehouseId !== user.warehouseId) {
        throw new NotFoundException('Warehouse inventory record not found.');
      }

      if (dto.type === TransactionType.STOCK_OUT) {
        if (inventory.currentStock < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Current stock is ${inventory.currentStock}, requested stock out is ${dto.quantity}.`,
          );
        }
        inventory.currentStock -= dto.quantity;
      } else if (dto.type === TransactionType.STOCK_IN) {
        inventory.currentStock += dto.quantity;
      }

      await queryRunner.manager.save(WarehouseInventory, inventory);

      const transaction = queryRunner.manager.create(Transaction, {
        warehouseInventoryId: dto.warehouseInventoryId,
        quantity: dto.quantity,
        type: dto.type,
        reason: dto.reason,
        userId: user.userId,
      });

      const savedTransaction = await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      this.logger.log(
        `Created transaction ${savedTransaction.id} (${dto.type} ${dto.quantity}) by user ${user.userId}`,
      );

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Transaction creation failed, rolling back`, (error as Error).stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    user: { companyId: string; warehouseId?: string; role: UserRole },
    query: QueryTransactionDto,
  ): Promise<PaginatedResponse<Transaction>> {
    const { search, warehouseInventoryId, type, reason, page = 1, limit = 10 } = query;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .innerJoinAndSelect('tx.warehouseInventory', 'inv')
      .innerJoinAndSelect('inv.warehouse', 'warehouse')
      .innerJoinAndSelect('inv.product', 'product')
      .innerJoinAndSelect('tx.user', 'user')
      .where('warehouse.companyId = :companyId', { companyId: user.companyId });

    if (user.role === UserRole.STAFF) {
      if (!user.warehouseId) {
        return { data: [], page: 1, limit, total: 0, totalPages: 0 };
      }
      qb.andWhere('inv.warehouseId = :assignedWh', { assignedWh: user.warehouseId });
    }

    if (warehouseInventoryId) {
      qb.andWhere('tx.warehouseInventoryId = :warehouseInventoryId', { warehouseInventoryId });
    }

    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }

    if (reason) {
      qb.andWhere('tx.reason = :reason', { reason });
    }

    if (search?.trim()) {
      qb.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy('tx.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(
    user: { companyId: string; warehouseId?: string; role: UserRole },
    id: string,
  ): Promise<Transaction> {
    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .innerJoinAndSelect('tx.warehouseInventory', 'inv')
      .innerJoinAndSelect('inv.warehouse', 'warehouse')
      .innerJoinAndSelect('inv.product', 'product')
      .innerJoinAndSelect('tx.user', 'user')
      .where('tx.id = :id', { id })
      .andWhere('warehouse.companyId = :companyId', { companyId: user.companyId });

    if (user.role === UserRole.STAFF) {
      qb.andWhere('inv.warehouseId = :assignedWh', { assignedWh: user.warehouseId });
    }

    const tx = await qb.getOne();
    if (!tx) {
      throw new NotFoundException(`Transaction #${id} not found.`);
    }

    return tx;
  }
}