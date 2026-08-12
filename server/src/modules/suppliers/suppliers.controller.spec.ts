import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: jest.Mocked<SuppliersService>;

  const mockCompanyId = 'comp-uuid-1111';
  const mockReq = {
    user: { companyId: mockCompanyId },
  } as unknown as Request;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAllByCompany: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SuppliersController>(SuppliersController);
    service = module.get(SuppliersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('extracts companyId from req.user and forwards it with CreateSupplierDto to service', async () => {
      const dto: CreateSupplierDto = {
        companyName: 'Acme Logistics',
        contactPerson: 'Jane Smith',
        phone: '555-0199',
      };
      const expectedResult = { id: 'sup-1', companyId: mockCompanyId, ...dto } as any;

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockReq, dto);

      expect(service.create).toHaveBeenCalledWith(mockCompanyId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('extracts companyId from req.user and forwards QuerySupplierDto to service', async () => {
      const query: QuerySupplierDto = { page: 1, limit: 10, search: 'acme' };
      const expectedResult = {
        data: [{ id: 'sup-1', companyName: 'Acme Logistics', companyId: mockCompanyId }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      } as any;

      service.findAllByCompany.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockReq, query);

      expect(service.findAllByCompany).toHaveBeenCalledWith(mockCompanyId, query);
      expect(result).toEqual(expectedResult);
    });

    it('passes empty query parameter properly when omitted', async () => {
      const query = {} as QuerySupplierDto;
      service.findAllByCompany.mockResolvedValue([] as any);

      await controller.findAll(mockReq, query);

      expect(service.findAllByCompany).toHaveBeenCalledWith(mockCompanyId, query);
    });
  });

  describe('findOne', () => {
    it('extracts companyId from req.user and forwards param ID to service', async () => {
      const supplierId = 'sup-100';
      const expectedResult = { id: supplierId, companyName: 'Global Dist', companyId: mockCompanyId } as any;

      service.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(mockReq, supplierId);

      expect(service.findOne).toHaveBeenCalledWith(mockCompanyId, supplierId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('extracts companyId from req.user and forwards param ID and UpdateSupplierDto to service', async () => {
      const supplierId = 'sup-100';
      const dto: UpdateSupplierDto = { companyName: 'Updated Global Dist' };
      const expectedResult = { id: supplierId, companyName: 'Updated Global Dist', companyId: mockCompanyId } as any;

      service.update.mockResolvedValue(expectedResult);

      const result = await controller.update(mockReq, supplierId, dto);

      expect(service.update).toHaveBeenCalledWith(mockCompanyId, supplierId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('extracts companyId from req.user and calls remove on service with param ID', async () => {
      const supplierId = 'sup-100';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockReq, supplierId);

      expect(service.remove).toHaveBeenCalledWith(mockCompanyId, supplierId);
    });
  });
});