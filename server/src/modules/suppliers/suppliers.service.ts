import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async create(companyId: string, dto: CreateSupplierDto): Promise<Supplier> {
    try {
      const supplier = this.supplierRepo.create({
        ...dto,
        companyId,
      });
      return await this.supplierRepo.save(supplier);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          `Supplier with company name "${dto.companyName}" already exists.`,
        );
      }
      throw new InternalServerErrorException('Failed to create supplier.');
    }
  }

  async findAllByCompany(
    companyId: string,
    query: QuerySupplierDto,
  ): Promise<PaginatedResponse<Supplier> | Supplier[]> {
    const { search, page = 1, limit = 10, all = false } = query;

    const qb = this.supplierRepo
      .createQueryBuilder('supplier')
      .where('supplier.companyId = :companyId', { companyId });

    if (search?.trim()) {
      qb.andWhere(
        '(supplier.companyName ILIKE :search OR supplier.contactPerson ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    qb.orderBy('supplier.createdAt', 'DESC');

    if (all) {
      return await qb.getMany();
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id, companyId },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID "${id}" not found.`);
    }

    return supplier;
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(companyId, id);
    Object.assign(supplier, dto);

    try {
      return await this.supplierRepo.save(supplier);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(
          `Supplier with company name "${dto.companyName}" already exists.`,
        );
      }
      throw new InternalServerErrorException('Failed to update supplier.');
    }
  }

  async remove(companyId: string, id: string): Promise<void> {
    const supplier = await this.findOne(companyId, id);
    await this.supplierRepo.remove(supplier);
  }
}