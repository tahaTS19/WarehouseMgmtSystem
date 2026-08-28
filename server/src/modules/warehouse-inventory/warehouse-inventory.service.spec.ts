import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WarehouseInventoryService } from './warehouse-inventory.service';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { UserRole } from '../users/entities/user.entity';

describe('WarehouseInventoryService', () => {
  let service: WarehouseInventoryService;
  let inventoryRepo: jest.Mocked<Repository<WarehouseInventory>>;
  let warehouseRepo: jest.Mocked<Repository<Warehouse>>;
  let productRepo: jest.Mocked<Repository<Product>>;

  const mockCompanyId = 'comp-111';
  const mockWarehouseId = 'wh-111';
  const mockProductId = 'prod-111';

  beforeEach(async () => {
    const mockInventoryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const mockWarehouseRepo = { findOne: jest.fn() };
    const mockProductRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseInventoryService,
        { provide: getRepositoryToken(WarehouseInventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(Warehouse), useValue: mockWarehouseRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<WarehouseInventoryService>(WarehouseInventoryService);
    inventoryRepo = module.get(getRepositoryToken(WarehouseInventory));
    warehouseRepo = module.get(getRepositoryToken(Warehouse));
    productRepo = module.get(getRepositoryToken(Product));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('throws NotFoundException if warehouse does not belong to company', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockCompanyId, {
          warehouseId: mockWarehouseId,
          productId: mockProductId,
          currentStock: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if product does not belong to company', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: mockWarehouseId, companyId: mockCompanyId } as any);
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(mockCompanyId, {
          warehouseId: mockWarehouseId,
          productId: mockProductId,
          currentStock: 50,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('catches Postgres 23505 unique constraint violation and throws ConflictException', async () => {
      warehouseRepo.findOne.mockResolvedValue({ id: mockWarehouseId, companyId: mockCompanyId } as any);
      productRepo.findOne.mockResolvedValue({ id: mockProductId, companyId: mockCompanyId } as any);
      inventoryRepo.create.mockReturnValue({ warehouseId: mockWarehouseId, productId: mockProductId } as any);
      inventoryRepo.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.create(mockCompanyId, {
          warehouseId: mockWarehouseId,
          productId: mockProductId,
          currentStock: 50,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('enforces staff role to only query their assigned warehouseId', async () => {
      const qb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      inventoryRepo.createQueryBuilder.mockReturnValue(qb);

      const staffUser = { companyId: mockCompanyId, warehouseId: 'staff-wh-99', role: UserRole.STAFF };
      await service.findAll(staffUser, { page: 1, limit: 10 });

      expect(qb.where).toHaveBeenCalledWith('inventory.warehouseId = :assignedWh', {
        assignedWh: 'staff-wh-99',
      });
    });
  });
});