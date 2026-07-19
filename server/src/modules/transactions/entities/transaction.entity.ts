import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WarehouseInventory } from '../../warehouse-inventory/entities/warehouse-inventory.entity';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
}

export enum TransactionReason {
  PURCHASE = 'purchase',
  SALE = 'sale',
  DAMAGE = 'damage',
  RETURN = 'return',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

// This table is append-only in practice — no update/delete endpoints are planned.
// It is the permanent audit trail: every stock movement that has ever happened.
//
// NOTE: this only links to WarehouseInventory, NOT a separate warehouseId column.
// An earlier version of this design kept a direct warehouseId here too "for query
// convenience", but that was pure redundancy — the same fact (which warehouse)
// reachable two ways that could silently drift out of sync. Removed deliberately.
// To find "which warehouse", join through warehouseInventory.warehouseId.
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'warehouseInventoryId', type: 'uuid' })
  warehouseInventoryId: string;

  @ManyToOne(() => WarehouseInventory, (inventory) => inventory.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouseInventoryId' })
  warehouseInventory: WarehouseInventory;

  @Column({ type: 'int' })
  quantity: number; // always positive — direction comes from `type`, not sign

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionReason })
  reason: TransactionReason;

  @Column({ name: 'userId', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date; // this IS the transaction timestamp — no separate field needed
}
