import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { WarehouseInventory } from '../warehouse-inventory/entities/warehouse-inventory.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { UserRole } from '../users/entities/user.entity';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockInventoryRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockTransactionRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockAdminUser = { companyId: 'comp-1', role: UserRole.ADMIN };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(WarehouseInventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepo },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLowStockReport', () => {
    it('returns a standard paginated response object', async () => {
      const mockQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockInventoryRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getLowStockReport(mockAdminUser, { page: 1, limit: 10 });

      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 0);
    });
  });

  describe('getInventoryValuationReport', () => {
    it('returns formatted aggregate totals and breakdown by warehouse', async () => {
      const mockQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalValuation: '5000.00',
          totalStockUnits: '100',
          totalUniqueProducts: '10',
        }),
        getRawMany: jest.fn().mockResolvedValue([
          {
            warehouseId: 'wh-1',
            warehouseName: 'Main WH',
            valuation: '5000.00',
            totalUnits: '100',
          },
        ]),
      };
      mockInventoryRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getInventoryValuationReport(mockAdminUser);

      expect(result.totals.totalValuation).toBe(5000);
      expect(result.totals.totalStockUnits).toBe(100);
      expect(result.breakdownByWarehouse).toHaveLength(1);
      expect(result.breakdownByWarehouse[0].warehouseName).toBe('Main WH');
    });
  });

  describe('getProductMovementReport', () => {
    it('returns aggregated movement data for charts', async () => {
      const mockQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { date: '2026-01-01', type: 'stock_in', totalQuantity: '50' },
        ]),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getProductMovementReport(mockAdminUser, {
        from: '2026-01-01',
        to: '2026-01-31',
        page: 1,
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual({
        date: '2026-01-01',
        type: 'stock_in',
        totalQuantity: 50,
      });
    });
  });

  describe('getRecentTransactionsReport', () => {
    it('returns clean paginated Transaction entity objects', async () => {
      const mockQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockTransactionRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getRecentTransactionsReport(mockAdminUser, { page: 1, limit: 10 });

      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('data');
      expect(result.total).toBe(0);
    });
  });
});