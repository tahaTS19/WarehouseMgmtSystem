import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseInventoryController } from './warehouse-inventory.controller';
import { WarehouseInventoryService } from './warehouse-inventory.service';
import { UserRole } from '../users/entities/user.entity';

describe('WarehouseInventoryController', () => {
  let controller: WarehouseInventoryController;
  let service: jest.Mocked<WarehouseInventoryService>;

  const mockAdminReq = {
    user: { userId: 'u-1', role: UserRole.ADMIN, companyId: 'comp-1' },
  } as any;

  const mockStaffReq = {
    user: { userId: 'u-2', role: UserRole.STAFF, companyId: 'comp-1', warehouseId: 'wh-99' },
  } as any;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseInventoryController],
      providers: [{ provide: WarehouseInventoryService, useValue: mockService }],
    }).compile();

    controller = module.get<WarehouseInventoryController>(WarehouseInventoryController);
    service = module.get(WarehouseInventoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('delegates to service.findAll passing full user context', async () => {
      const query = { page: 1, limit: 10 };
      service.findAll.mockResolvedValue({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });

      await controller.findAll(mockStaffReq, query);

      expect(service.findAll).toHaveBeenCalledWith(mockStaffReq.user, query);
    });
  });

  describe('create', () => {
    it('passes companyId and dto to service.create for admin', async () => {
      const dto = { warehouseId: 'wh-1', productId: 'p-1', currentStock: 20 };
      service.create.mockResolvedValue({ id: 'inv-1', ...dto } as any);

      await controller.create(mockAdminReq, dto);

      expect(service.create).toHaveBeenCalledWith('comp-1', dto);
    });
  });
});