import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { WarehouseInventory } from '../warehouse-inventory/entities/warehouse-inventory.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

const RECENT_TRANSACTIONS_LIMIT = 10;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Product) private readonly productRepository: Repository<Product>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Supplier) private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(WarehouseInventory)
    private readonly inventoryRepository: Repository<WarehouseInventory>,
    @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>,
  ) {}

  // Admin dashboard — every figure here is scoped to companyId, covering ALL
  // of that company's warehouses at once (Admin's whole point is company-wide
  // visibility, unlike Staff who only ever sees their one warehouse).
  async getAdminSummary(companyId: string): Promise<Record<string, any>> {
    const [totalWarehouses, totalProducts, totalCategories, totalSuppliers] = await Promise.all([
      this.warehouseRepository.count({ where: { companyId } }),
      this.productRepository.count({ where: { companyId } }),
      this.categoryRepository.count({ where: { companyId } }),
      this.supplierRepository.count({ where: { companyId } }),
    ]);

    const lowStockCount = await this.getLowStockCountForCompany(companyId);
    const transactionsToday = await this.getTransactionsTodayCountForCompany(companyId);
    const stockInVsOut = await this.getStockInVsOutForCompany(companyId);
    const productsByCategory = await this.getProductsByCategoryForCompany(companyId);
    const recentTransactions = await this.getRecentTransactionsForCompany(companyId);

    return {
      totalWarehouses,
      totalProducts,
      totalCategories,
      totalSuppliers,
      lowStockCount,
      transactionsToday,
      stockInVsOut,
      productsByCategory,
      recentTransactions,
    };
  }

  // Staff dashboard — everything scoped to exactly one warehouseId, never
  // reaching into any other warehouse even within the same company.
  async getStaffSummary(warehouseId: string): Promise<Record<string, any>> {
    const totalProducts = await this.inventoryRepository.count({ where: { warehouseId } });
    const transactionsToday = await this.getTransactionsTodayCountForWarehouse(warehouseId);
    const recentActivity = await this.getRecentTransactionsForWarehouse(warehouseId);

    return { totalProducts, transactionsToday, recentActivity };
  }

  private async getLowStockCountForCompany(companyId: string): Promise<number> {
    return this.inventoryRepository
      .createQueryBuilder('inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .where('warehouse.companyId = :companyId', { companyId })
      .andWhere('inventory.currentStock <= inventory.minimumStock')
      .getCount();
  }

  private async getTransactionsTodayCountForCompany(companyId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.warehouseInventory', 'inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .where('warehouse.companyId = :companyId', { companyId })
      .andWhere('transaction.createdAt >= :startOfToday', { startOfToday })
      .getCount();
  }

  private async getStockInVsOutForCompany(
    companyId: string,
  ): Promise<{ stockIn: number; stockOut: number }> {
    const raw = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.warehouseInventory', 'inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .select('transaction.type', 'type')
      .addSelect('SUM(transaction.quantity)', 'total')
      .where('warehouse.companyId = :companyId', { companyId })
      .groupBy('transaction.type')
      .getRawMany();

    const stockIn = Number(raw.find((row) => row.type === 'stock_in')?.total || 0);
    const stockOut = Number(raw.find((row) => row.type === 'stock_out')?.total || 0);

    return { stockIn, stockOut };
  }

  private async getProductsByCategoryForCompany(
    companyId: string,
  ): Promise<{ category: string; count: number }[]> {
    const raw = await this.productRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('category.name', 'category')
      .addSelect('COUNT(product.id)', 'count')
      .where('product.companyId = :companyId', { companyId })
      .groupBy('category.name')
      .getRawMany();

    return raw.map((row) => ({
      category: row.category || 'Uncategorized',
      count: Number(row.count),
    }));
  }

  private async getRecentTransactionsForCompany(companyId: string) {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.warehouseInventory', 'inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .where('warehouse.companyId = :companyId', { companyId })
      .orderBy('transaction.createdAt', 'DESC')
      .take(RECENT_TRANSACTIONS_LIMIT)
      .getRawMany();
  }

  private async getTransactionsTodayCountForWarehouse(warehouseId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.warehouseInventory', 'inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .where('warehouse.id = :warehouseId', { warehouseId })
      .andWhere('transaction.createdAt >= :startOfToday', { startOfToday })
      .getCount();
  }

  private async getRecentTransactionsForWarehouse(warehouseId: string) {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.warehouseInventory', 'inventory')
      .innerJoin('inventory.warehouse', 'warehouse')
      .where('warehouse.id = :warehouseId', { warehouseId })
      .orderBy('transaction.createdAt', 'DESC')
      .take(RECENT_TRANSACTIONS_LIMIT)
      .getMany();
  }
}
