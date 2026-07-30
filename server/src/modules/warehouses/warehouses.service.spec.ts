import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './entities/warehouse.entity';

describe('WarehousesService', () => {
  let service: WarehousesService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'wh-123', ...entity })),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: getRepositoryToken(Warehouse), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  describe('create', () => {
    it('binds the warehouse to the companyId on creation', async () => {
      const result = await service.create('company-1', { name: 'Depot A', location: 'Karachi' });

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'Depot A',
        location: 'Karachi',
        companyId: 'company-1',
      });
      expect(result).toEqual(expect.objectContaining({ companyId: 'company-1', name: 'Depot A' }));
    });
  });

  describe('findAllByCompany', () => {
    it('queries warehouses scoped strictly to companyId in descending order', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'wh-1' }]);

      const result = await service.findAllByCompany('company-1');

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns warehouse if found for companyId', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'wh-1', companyId: 'company-1' });

      const result = await service.findOne('company-1', 'wh-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'wh-1', companyId: 'company-1' } });
      expect(result.id).toBe('wh-1');
    });

    it('throws NotFoundException when warehouse does not exist or belongs to another company', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('company-1', 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and saves when warehouse exists and belongs to company', async () => {
      const existingWh = { id: 'wh-1', companyId: 'company-1', name: 'Old Name' };
      mockRepo.findOne.mockResolvedValue(existingWh);

      const result = await service.update('company-1', 'wh-1', { name: 'New Name' });

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
      expect(result.name).toBe('New Name');
    });

    it('throws NotFoundException if target warehouse does not belong to company', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('company-1', 'wh-foreign', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes warehouse if owned by company', async () => {
      const existingWh = { id: 'wh-1', companyId: 'company-1' };
      mockRepo.findOne.mockResolvedValue(existingWh);

      await service.remove('company-1', 'wh-1');

      expect(mockRepo.remove).toHaveBeenCalledWith(existingWh);
    });
  });
});