import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { WarehouseInventory } from '../warehouse-inventory/entities/warehouse-inventory.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

// A reusable chainable mock for TypeORM's QueryBuilder — every chain method
// (innerJoin, where, andWhere, select, groupBy, etc.) returns the same mock
// object, and only the terminal method (getCount/getRawMany/getMany) actually
// resolves to a value, configured per test.
function createMockQueryBuilder() {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
  };
  return qb;
}

describe('DashboardService', () => {
  let service: DashboardService;
  let mockWarehouseRepo: any;
  let mockProductRepo: any;
  let mockCategoryRepo: any;
  let mockSupplierRepo: any;
  let mockInventoryRepo: any;
  let mockTransactionRepo: any;

  beforeEach(async () => {
    mockWarehouseRepo = { count: jest.fn() };
    mockProductRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
    mockCategoryRepo = { count: jest.fn() };
    mockSupplierRepo = { count: jest.fn() };
    mockInventoryRepo = { count: jest.fn(), createQueryBuilder: jest.fn() };
    mockTransactionRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Warehouse), useValue: mockWarehouseRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Supplier), useValue: mockSupplierRepo },
        { provide: getRepositoryToken(WarehouseInventory), useValue: mockInventoryRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  describe('getAdminSummary', () => {
    const companyId = 'company-1';

    it('scopes the basic counts (warehouses, products, categories, suppliers) to the given companyId', async () => {
      mockWarehouseRepo.count.mockResolvedValue(3);
      mockProductRepo.count.mockResolvedValue(10);
      mockCategoryRepo.count.mockResolvedValue(4);
      mockSupplierRepo.count.mockResolvedValue(2);

      const inventoryQb = createMockQueryBuilder();
      inventoryQb.getCount.mockResolvedValue(1); // low stock count
      mockInventoryRepo.createQueryBuilder.mockReturnValue(inventoryQb);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(0); // transactions today
      transactionQb.getRawMany.mockResolvedValue([]); // stock in/out + recent transactions
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const productQb = createMockQueryBuilder();
      productQb.getRawMany.mockResolvedValue([]); // products by category
      mockProductRepo.createQueryBuilder.mockReturnValue(productQb);

      const result = await service.getAdminSummary(companyId);

      expect(mockWarehouseRepo.count).toHaveBeenCalledWith({ where: { companyId } });
      expect(mockProductRepo.count).toHaveBeenCalledWith({ where: { companyId } });
      expect(mockCategoryRepo.count).toHaveBeenCalledWith({ where: { companyId } });
      expect(mockSupplierRepo.count).toHaveBeenCalledWith({ where: { companyId } });

      expect(result.totalWarehouses).toBe(3);
      expect(result.totalProducts).toBe(10);
      expect(result.totalCategories).toBe(4);
      expect(result.totalSuppliers).toBe(2);
    });

    it("scopes the low-stock count to warehouses belonging to this company only", async () => {
      mockWarehouseRepo.count.mockResolvedValue(0);
      mockProductRepo.count.mockResolvedValue(0);
      mockCategoryRepo.count.mockResolvedValue(0);
      mockSupplierRepo.count.mockResolvedValue(0);

      const inventoryQb = createMockQueryBuilder();
      inventoryQb.getCount.mockResolvedValue(2);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(inventoryQb);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(0);
      transactionQb.getRawMany.mockResolvedValue([]);
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const productQb = createMockQueryBuilder();
      productQb.getRawMany.mockResolvedValue([]);
      mockProductRepo.createQueryBuilder.mockReturnValue(productQb);

      const result = await service.getAdminSummary(companyId);

      expect(inventoryQb.where).toHaveBeenCalledWith('warehouse.companyId = :companyId', { companyId });
      expect(result.lowStockCount).toBe(2);
    });

    it('returns stockInVsOut totals derived from grouped transaction sums', async () => {
      mockWarehouseRepo.count.mockResolvedValue(0);
      mockProductRepo.count.mockResolvedValue(0);
      mockCategoryRepo.count.mockResolvedValue(0);
      mockSupplierRepo.count.mockResolvedValue(0);

      const inventoryQb = createMockQueryBuilder();
      inventoryQb.getCount.mockResolvedValue(0);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(inventoryQb);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(0);
      transactionQb.getRawMany
        .mockResolvedValueOnce([
          { type: 'stock_in', total: '50' },
          { type: 'stock_out', total: '20' },
        ])
        .mockResolvedValueOnce([]); // recent transactions call
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const productQb = createMockQueryBuilder();
      productQb.getRawMany.mockResolvedValue([]);
      mockProductRepo.createQueryBuilder.mockReturnValue(productQb);

      const result = await service.getAdminSummary(companyId);

      expect(result.stockInVsOut).toEqual({ stockIn: 50, stockOut: 20 });
    });

    it('returns a productsByCategory breakdown, labeling uncategorized products clearly', async () => {
      mockWarehouseRepo.count.mockResolvedValue(0);
      mockProductRepo.count.mockResolvedValue(0);
      mockCategoryRepo.count.mockResolvedValue(0);
      mockSupplierRepo.count.mockResolvedValue(0);

      const inventoryQb = createMockQueryBuilder();
      inventoryQb.getCount.mockResolvedValue(0);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(inventoryQb);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(0);
      transactionQb.getRawMany.mockResolvedValue([]);
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const productQb = createMockQueryBuilder();
      productQb.getRawMany.mockResolvedValue([
        { category: 'Jerseys', count: '5' },
        { category: null, count: '2' },
      ]);
      mockProductRepo.createQueryBuilder.mockReturnValue(productQb);

      const result = await service.getAdminSummary(companyId);

      expect(result.productsByCategory).toEqual([
        { category: 'Jerseys', count: 5 },
        { category: 'Uncategorized', count: 2 },
      ]);
    });
  });

  describe('getStaffSummary', () => {
    const warehouseId = 'warehouse-1';

    it('scopes totalProducts to warehouse_inventory rows for this warehouse only', async () => {
      mockInventoryRepo.count.mockResolvedValue(7);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(3);
      transactionQb.getMany.mockResolvedValue([]);
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const result = await service.getStaffSummary(warehouseId);

      expect(mockInventoryRepo.count).toHaveBeenCalledWith({ where: { warehouseId } });
      expect(result.totalProducts).toBe(7);
    });

    it("scopes transactionsToday and recentActivity to this warehouse only, never another warehouse's data", async () => {
      mockInventoryRepo.count.mockResolvedValue(0);

      const transactionQb = createMockQueryBuilder();
      transactionQb.getCount.mockResolvedValue(3);
      transactionQb.getMany.mockResolvedValue([]);
      mockTransactionRepo.createQueryBuilder.mockReturnValue(transactionQb);

      const result = await service.getStaffSummary(warehouseId);

      expect(transactionQb.where).toHaveBeenCalledWith('warehouse.id = :warehouseId', { warehouseId });
      expect(result.transactionsToday).toBe(3);
    });
  });
});
