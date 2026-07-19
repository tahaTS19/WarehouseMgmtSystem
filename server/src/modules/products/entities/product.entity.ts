import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Category } from '../../categories/entities/category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { WarehouseInventory } from '../../warehouse-inventory/entities/warehouse-inventory.entity';

// A Product is the shared catalog entry, owned by the COMPANY (not a warehouse).
// It exists exactly once, regardless of how many warehouses stock it — name,
// SKU, price, and description stay consistent everywhere. Per-warehouse stock
// count, minimum threshold, and shelf location live separately, in
// WarehouseInventory — NOT on this entity.
@Entity('products')
// SKU is unique per COMPANY now (not per warehouse) — a product genuinely only
// exists once across the whole business.
@Unique('UQ_product_sku_per_company', ['sku', 'companyId'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string | null;

  @Column({ name: 'categoryId', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({ name: 'supplierId', type: 'uuid', nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier: Supplier | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  // The N-N link to Warehouse goes through this junction — a Product has many
  // WarehouseInventory rows, one per Warehouse that actually stocks it. A
  // warehouse with NO row here for this product simply doesn't carry it.
  @OneToMany(() => WarehouseInventory, (inventory) => inventory.product)
  inventoryRecords: WarehouseInventory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
