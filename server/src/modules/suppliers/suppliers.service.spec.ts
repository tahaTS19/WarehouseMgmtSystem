import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let mockRepo: any;
  let mockQueryBuilder: any;

  const mockCompanyId = 'comp-uuid-1111';

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((dto: any) => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('binds companyId to entity on creation and returns saved supplier', async () => {
      const dto: CreateSupplierDto = {
        companyName: 'Acme Corp',
        contactPerson: 'John Doe',
        phone: '1234567890',
        email: 'acme@example.com',
      };
      const createdSupplier = { id: 'sup-1', companyId: mockCompanyId, ...dto };

      mockRepo.save.mockResolvedValue(createdSupplier);

      const result = await service.create(mockCompanyId, dto);

      expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, companyId: mockCompanyId });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(createdSupplier);
    });

    it('throws ConflictException on Postgres duplicate key error (23505)', async () => {
      const dto: CreateSupplierDto = { companyName: 'Acme Corp' };
      mockRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByCompany', () => {
    it('applies companyId isolation as the primary .where() clause', async () => {
      const query: QuerySupplierDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('supplier.companyId = :companyId', {
        companyId: mockCompanyId,
      });
    });

    it('applies ILIKE search filter across companyName and contactPerson when search is supplied', async () => {
      const query: QuerySupplierDto = { search: 'acme', page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(supplier.companyName ILIKE :search OR supplier.contactPerson ILIKE :search)',
        { search: '%acme%' },
      );
    });

    it('calculates correct pagination skip/take and returns standard paginated envelope', async () => {
      const query: QuerySupplierDto = { page: 2, limit: 5 };
      const mockItems = [{ id: 'sup-1', companyName: 'Supplier 1' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 12]);

      const result: any = await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: mockItems,
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
    });

    it('returns plain array and bypasses pagination when all=true lookup mode is passed', async () => {
      const query: QuerySupplierDto = { page: 1, limit: 10, all: true };
      const mockItems = [
        { id: 'sup-1', companyName: 'Supplier 1' },
        { id: 'sup-2', companyName: 'Supplier 2' },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockItems);

      const result = await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.skip).not.toHaveBeenCalled();
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual(mockItems);
    });
  });

  describe('findOne', () => {
    it('returns supplier when found for companyId', async () => {
      const mockSupplier = { id: 'sup-1', companyId: mockCompanyId, companyName: 'Acme' };
      mockRepo.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne(mockCompanyId, 'sup-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'sup-1', companyId: mockCompanyId },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('throws NotFoundException when supplier does not exist or belongs to another company', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockCompanyId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and saves supplier when ownership check succeeds', async () => {
      const existing = { id: 'sup-1', companyId: mockCompanyId, companyName: 'Old Name' };
      const dto: UpdateSupplierDto = { companyName: 'New Name' };

      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation((entity: Supplier) => Promise.resolve(entity));

      const result = await service.update(mockCompanyId, 'sup-1', dto);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ companyName: 'New Name' }),
      );
      expect(result.companyName).toBe('New Name');
    });

    it('throws ConflictException if update triggers duplicate key error (23505)', async () => {
      const existing = { id: 'sup-1', companyId: mockCompanyId, companyName: 'Old Name' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockRejectedValue({ code: '23505' });

      await expect(
        service.update(mockCompanyId, 'sup-1', { companyName: 'Duplicate' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes entity when found and owned by company', async () => {
      const existing = { id: 'sup-1', companyId: mockCompanyId };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove(mockCompanyId, 'sup-1');

      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it('throws NotFoundException if target supplier does not exist for company', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(mockCompanyId, 'sup-foreign')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});