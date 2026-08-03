import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UserRole } from '../users/entities/user.entity';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: DashboardService;

  const mockDashboardService = {
    getAdminSummary: jest.fn(),
    getStaffSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: mockDashboardService }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it("calls getAdminSummary with the user's companyId when the requester is an admin", async () => {
    const mockRequest = {
      user: { userId: 'u1', role: UserRole.ADMIN, companyId: 'company-1' },
    };
    mockDashboardService.getAdminSummary.mockResolvedValue({ totalProducts: 5 });

    const result = await controller.getSummary(mockRequest as any);

    expect(service.getAdminSummary).toHaveBeenCalledWith('company-1');
    expect(service.getStaffSummary).not.toHaveBeenCalled();
    expect(result).toEqual({ totalProducts: 5 });
  });

  it("calls getStaffSummary with the user's warehouseId when the requester is staff", async () => {
    const mockRequest = {
      user: { userId: 'u2', role: UserRole.STAFF, warehouseId: 'warehouse-1' },
    };
    mockDashboardService.getStaffSummary.mockResolvedValue({ totalProducts: 2 });

    const result = await controller.getSummary(mockRequest as any);

    expect(service.getStaffSummary).toHaveBeenCalledWith('warehouse-1');
    expect(service.getAdminSummary).not.toHaveBeenCalled();
    expect(result).toEqual({ totalProducts: 2 });
  });
});
