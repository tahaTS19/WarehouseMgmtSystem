import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

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
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('extracts companyId from req.user and forwards it with CreateCategoryDto to service', async () => {
      const dto: CreateCategoryDto = { name: 'Hardware', description: 'Tools and equipment' };
      const expectedResult = { id: 'cat-1', companyId: mockCompanyId, ...dto } as any;

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockReq, dto);

      expect(service.create).toHaveBeenCalledWith(mockCompanyId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('extracts companyId from req.user and forwards QueryCategoryDto to service', async () => {
      const query: QueryCategoryDto = { page: 1, limit: 10, search: 'hard' };
      const expectedResult = {
        data: [{ id: 'cat-1', name: 'Hardware', companyId: mockCompanyId }],
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

    it('passes empty or default query parameters properly when omitted', async () => {
      const query = {} as QueryCategoryDto;
      service.findAllByCompany.mockResolvedValue([] as any);

      await controller.findAll(mockReq, query);

      expect(service.findAllByCompany).toHaveBeenCalledWith(mockCompanyId, query);
    });
  });

  describe('findOne', () => {
    it('extracts companyId from req.user and forwards param ID to service', async () => {
      const categoryId = 'cat-100';
      const expectedResult = { id: categoryId, name: 'Plumbing', companyId: mockCompanyId } as any;

      service.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(mockReq, categoryId);

      expect(service.findOne).toHaveBeenCalledWith(mockCompanyId, categoryId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('extracts companyId from req.user and forwards param ID and UpdateCategoryDto to service', async () => {
      const categoryId = 'cat-100';
      const dto: UpdateCategoryDto = { name: 'Updated Plumbing' };
      const expectedResult = { id: categoryId, name: 'Updated Plumbing', companyId: mockCompanyId } as any;

      service.update.mockResolvedValue(expectedResult);

      const result = await controller.update(mockReq, categoryId, dto);

      expect(service.update).toHaveBeenCalledWith(mockCompanyId, categoryId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('extracts companyId from req.user and calls remove on service with param ID', async () => {
      const categoryId = 'cat-100';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(mockReq, categoryId);

      expect(service.remove).toHaveBeenCalledWith(mockCompanyId, categoryId);
    });
  });
});