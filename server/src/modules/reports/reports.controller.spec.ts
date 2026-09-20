import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { UserRole } from '../users/entities/user.entity';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  const mockAdminReq = {
    user: { userId: 'u-1', companyId: 'comp-1', role: UserRole.ADMIN },
  } as any;

  beforeEach(async () => {
    const mockService = {
      getLowStockReport: jest.fn(),
      getInventoryValuationReport: jest.fn(),
      getProductMovementReport: jest.fn(),
      getRecentTransactionsReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getLowStock', () => {
    it('delegates to service with req.user', async () => {
      const query: QueryReportDto = { page: 1, limit: 10 };
      const expected = { data: [], page: 1, limit: 10, total: 0, totalPages: 0 };
      service.getLowStockReport.mockResolvedValue(expected);

      const result = await controller.getLowStock(mockAdminReq, query);
      expect(service.getLowStockReport).toHaveBeenCalledWith(mockAdminReq.user, query);
      expect(result).toEqual(expected);
    });
  });

  describe('getValuation', () => {
    it('delegates to service with warehouseId filter', async () => {
      const expected = {
        totals: { totalValuation: 100, totalStockUnits: 10, totalUniqueProducts: 2 },
        breakdownByWarehouse: [],
      };
      service.getInventoryValuationReport.mockResolvedValue(expected);

      const result = await controller.getValuation(mockAdminReq, 'wh-1');
      expect(service.getInventoryValuationReport).toHaveBeenCalledWith(mockAdminReq.user, 'wh-1');
      expect(result).toEqual(expected);
    });
  });

  describe('getMovement', () => {
    it('delegates date-range movement query to service', async () => {
      const query: QueryReportDto = { from: '2026-01-01', to: '2026-01-31', page: 1, limit: 10 };
      service.getProductMovementReport.mockResolvedValue([]);

      const result = await controller.getMovement(mockAdminReq, query);
      expect(service.getProductMovementReport).toHaveBeenCalledWith(mockAdminReq.user, query);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentTransactions', () => {
    it('delegates recent transactions query to service', async () => {
      const query: QueryReportDto = { page: 1, limit: 10 };
      const expected = { data: [], page: 1, limit: 10, total: 0, totalPages: 0 };
      service.getRecentTransactionsReport.mockResolvedValue(expected);

      const result = await controller.getRecentTransactions(mockAdminReq, query);
      expect(service.getRecentTransactionsReport).toHaveBeenCalledWith(mockAdminReq.user, query);
      expect(result).toEqual(expected);
    });
  });
});