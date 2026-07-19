import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { WarehouseInventory } from '../../warehouse-inventory/entities/warehouse-inventory.entity';

// A Warehouse is one physical location belonging to a Company. It no longer owns
// Categories, Suppliers, or Products directly — those belong to the Company
// (the shared catalog). A Warehouse's own data is: which Staff work here, and
// which Products it actually stocks (via WarehouseInventory) and in what quantity.
@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, (company) => company.warehouses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.warehouse)
  staff: User[];

  // The N-N link to Product goes through this junction — a Warehouse has many
  // WarehouseInventory rows, one per Product it actually stocks.
  @OneToMany(() => WarehouseInventory, (inventory) => inventory.warehouse)
  inventoryRecords: WarehouseInventory[];
}
