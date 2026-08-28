import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockProductRepo: any;
  let mockCategoryRepo: any;
  let mockSupplierRepo: any;
  let mockQueryBuilder: any;

  const mockCompanyId = 'comp-uuid-1111';

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockProductRepo = {
      create: jest.fn().mockImplementation((dto: any) => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockCategoryRepo = { findOne: jest.fn() };
    mockSupplierRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('binds companyId and saves product when FK checks pass', async () => {
      const dto: CreateProductDto = { name: 'Mouse', sku: 'MS-100', unitPrice: 20 };
      const created = { id: 'prod-1', companyId: mockCompanyId, ...dto };
      mockProductRepo.save.mockResolvedValue(created);

      const result = await service.create(mockCompanyId, dto);

      expect(mockProductRepo.create).toHaveBeenCalledWith({ ...dto, companyId: mockCompanyId });
      expect(result).toEqual(created);
    });

    it('throws NotFoundException if provided categoryId belongs to another company', async () => {
      const dto: CreateProductDto = { name: 'Mouse', sku: 'MS-100', unitPrice: 20, categoryId: 'foreign-cat' };
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate SKU (Postgres 23505)', async () => {
      const dto: CreateProductDto = { name: 'Mouse', sku: 'MS-100', unitPrice: 20 };
      mockProductRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByCompany', () => {
    it('returns standard PaginatedResponse envelope when all=true (never bare array)', async () => {
      const query: QueryProductDto = { page: 1, limit: 10, all: true };
      const mockItems = [{ id: 'prod-1', name: 'Mouse' }];
      mockQueryBuilder.getMany.mockResolvedValue(mockItems);

      const result = await service.findAllByCompany(mockCompanyId, query);

      expect(result).toEqual({
        data: mockItems,
        page: 1,
        limit: 1,
        total: 1,
        totalPages: 1,
      });
    });

    it('applies company isolation and filters by search, categoryId, and supplierId', async () => {
      const query: QueryProductDto = { search: 'mouse', categoryId: 'cat-1', supplierId: 'sup-1', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.companyId = :companyId', { companyId: mockCompanyId });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search)',
        { search: '%mouse%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.categoryId = :categoryId', { categoryId: 'cat-1' });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.supplierId = :supplierId', { supplierId: 'sup-1' });
    });
  });
});