import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async create(companyId: string, createDto: CreateWarehouseDto): Promise<Warehouse> {
    const warehouse = this.warehouseRepository.create({
      ...createDto,
      companyId,
    });

    return this.warehouseRepository.save(warehouse);
  }

  async findAllByCompany(
    companyId: string,
    search?: string,
  ): Promise<Warehouse[]> {
    const query = this.warehouseRepository
      .createQueryBuilder('warehouse')
      .where('warehouse.companyId = :companyId', { companyId });

    if (search?.trim()) {
      query.andWhere(
        '(warehouse.name ILIKE :search OR warehouse.location ILIKE :search)',
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    return query
      .orderBy('warehouse.createdAt', 'DESC')
      .getMany();
  }

  async findOne(companyId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found.`);
    }

    return warehouse;
  }

  async update(
    companyId: string,
    id: string,
    updateDto: UpdateWarehouseDto,
  ): Promise<Warehouse> {
    const warehouse = await this.findOne(companyId, id);

    Object.assign(warehouse, updateDto);

    return this.warehouseRepository.save(warehouse);
  }

  async remove(companyId: string, id: string): Promise<void> {
    const warehouse = await this.findOne(companyId, id);
    await this.warehouseRepository.remove(warehouse);
  }
}