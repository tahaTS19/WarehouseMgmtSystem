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
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { Product } from '../../products/entities/product.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

// The junction entity that makes Warehouse <-> Product a many-to-many
// relationship. Each row represents exactly one Warehouse + one Product pairing,
// carrying the data that's genuinely specific to that combination: how much
// stock exists, the reorder threshold, and where it physically sits.
//
// A Warehouse that doesn't stock a given Product simply has NO row here for that
// pairing — there's no need to represent "zero" explicitly.
@Entity('warehouse_inventory')
@Unique('UQ_warehouse_product_pair', ['warehouseId', 'productId'])
export class WarehouseInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.inventoryRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (product) => product.inventoryRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  // IMPORTANT: never written to directly by any controller/service other than
  // the inventory/transactions service. Every change must happen as a side
  // effect of creating a Transaction row, inside the same DB transaction
  // (BEGIN/COMMIT), so stock count and transaction history can never drift apart.
  @Column({ name: 'current_stock', type: 'int', default: 0 })
  currentStock: number;

  @Column({ name: 'minimum_stock', type: 'int', default: 0 })
  minimumStock: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @OneToMany(() => Transaction, (transaction) => transaction.warehouseInventory)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
