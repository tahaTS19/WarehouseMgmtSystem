import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseInventory } from '../warehouse-inventory/entities/warehouse-inventory.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { QueryReportDto } from './dto/query-report.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly inventoryRepo: Repository<WarehouseInventory>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  /**
   * 1. Low Stock Report
   * Returns clean WarehouseInventory entities where currentStock <= minimumStock.
   */
  async getLowStockReport(
    user: { companyId: string; role: UserRole },
    query: QueryReportDto,
  ): Promise<PaginatedResponse<WarehouseInventory>> {
    const { warehouseId, categoryId, page = 1, limit = 10 } = query;

    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoinAndSelect('inv.warehouse', 'warehouse')
      .innerJoinAndSelect('inv.product', 'product')
      .leftJoinAndSelect('product.category', 'category');

    // Rule #2: Explicit role check for companyId scoping
    if (user.role === UserRole.ADMIN) {
      qb.where('warehouse.companyId = :companyId', { companyId: user.companyId });
    }

    qb.andWhere('inv.currentStock <= inv.minimumStock');

    if (warehouseId) {
      qb.andWhere('inv.warehouseId = :warehouseId', { warehouseId });
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    qb.orderBy('inv.currentStock', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    // Rule #3: Real entities -> getManyAndCount
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  /**
   * 2. Inventory Value Report
   * Genuine aggregate returning totals and grouped breakdown per warehouse.
   */
  async getInventoryValuationReport(user: { companyId: string; role: UserRole }, warehouseId?: string) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inv')
      .innerJoin('inv.warehouse', 'warehouse')
      .innerJoin('inv.product', 'product');

    if (user.role === UserRole.ADMIN) {
      qb.where('warehouse.companyId = :companyId', { companyId: user.companyId });
    }

    if (warehouseId) {
      qb.andWhere('inv.warehouseId = :warehouseId', { warehouseId });
    }

    // Rule #3: Genuine aggregate -> getRawOne & getRawMany
    const totals = await qb
      .select('SUM(inv.currentStock * product.unitPrice)', 'totalValuation')
      .addSelect('SUM(inv.currentStock)', 'totalStockUnits')
      .addSelect('COUNT(DISTINCT inv.productId)', 'totalUniqueProducts')
      .getRawOne();

    const breakdownByWarehouse = await qb
      .select('warehouse.id', 'warehouseId')
      .addSelect('warehouse.name', 'warehouseName')
      .addSelect('SUM(inv.currentStock * product.unitPrice)', 'valuation')
      .addSelect('SUM(inv.currentStock)', 'totalUnits')
      .groupBy('warehouse.id')
      .addGroupBy('warehouse.name')
      .getRawMany();

    return {
      totals: {
        totalValuation: parseFloat(totals?.totalValuation || '0'),
        totalStockUnits: parseInt(totals?.totalStockUnits || '0', 10),
        totalUniqueProducts: parseInt(totals?.totalUniqueProducts || '0', 10),
      },
      breakdownByWarehouse: breakdownByWarehouse.map((row) => ({
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        valuation: parseFloat(row.valuation || '0'),
        totalUnits: parseInt(row.totalUnits || '0', 10),
      })),
    };
  }

  /**
   * 3. Product Movement Report
   * Aggregates daily/weekly movement trends over a date range for charting.
   */
  async getProductMovementReport(
    user: { companyId: string; role: UserRole },
    query: QueryReportDto,
  ) {
    const { warehouseId, from, to } = query;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .innerJoin('tx.warehouseInventory', 'inv')
      .innerJoin('inv.warehouse', 'warehouse');

    if (user.role === UserRole.ADMIN) {
      qb.where('warehouse.companyId = :companyId', { companyId: user.companyId });
    }

    if (warehouseId) {
      qb.andWhere('inv.warehouseId = :warehouseId', { warehouseId });
    }

    if (from) {
      qb.andWhere('tx.createdAt >= :from', { from });
    }

    if (to) {
      qb.andWhere('tx.createdAt <= :to', { to });
    }

    // Rule #3: Aggregate grouping for charts -> getRawMany
    const results = await qb
      .select("DATE_TRUNC('day', tx.createdAt)", 'date')
      .addSelect('tx.type', 'type')
      .addSelect('SUM(tx.quantity)', 'totalQuantity')
      .groupBy("DATE_TRUNC('day', tx.createdAt)")
      .addGroupBy('tx.type')
      .orderBy("DATE_TRUNC('day', tx.createdAt)", 'ASC')
      .getRawMany();

    return results.map((row) => ({
      date: row.date,
      type: row.type,
      totalQuantity: parseInt(row.totalQuantity || '0', 10),
    }));
  }

  /**
   * 4. Recent Transactions Report
   * Company-wide filtered audit list returning clean Transaction entities.
   */
  async getRecentTransactionsReport(
    user: { companyId: string; role: UserRole },
    query: QueryReportDto,
  ): Promise<PaginatedResponse<Transaction>> {
    const { warehouseId, type, reason, from, to, page = 1, limit = 10 } = query;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .innerJoinAndSelect('tx.warehouseInventory', 'inv')
      .innerJoinAndSelect('inv.warehouse', 'warehouse')
      .innerJoinAndSelect('inv.product', 'product')
      .innerJoinAndSelect('tx.user', 'user');

    if (user.role === UserRole.ADMIN) {
      qb.where('warehouse.companyId = :companyId', { companyId: user.companyId });
    }

    if (warehouseId) {
      qb.andWhere('inv.warehouseId = :warehouseId', { warehouseId });
    }

    if (type) {
      qb.andWhere('tx.type = :type', { type });
    }

    if (reason) {
      qb.andWhere('tx.reason = :reason', { reason });
    }

    if (from) {
      qb.andWhere('tx.createdAt >= :from', { from });
    }

    if (to) {
      qb.andWhere('tx.createdAt <= :to', { to });
    }

    qb.orderBy('tx.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    // Rule #3: Real entities -> getManyAndCount
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }
}