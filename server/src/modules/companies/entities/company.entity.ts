import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Product } from '../../products/entities/product.entity';

// A Company is the real-world business (e.g. "Nike", "Adidas") that owns one or
// more Warehouses, plus its own Categories, Suppliers, and Product catalog.
// Categories/Suppliers/Products are NEVER shared across companies, even if two
// companies happen to have identically-named ones — each company keeps its own
// independent rows, which is what preserves full isolation between companies.
@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Warehouse, (warehouse) => warehouse.company)
  warehouses: Warehouse[];

  @OneToMany(() => Category, (category) => category.company)
  categories: Category[];

  @OneToMany(() => Supplier, (supplier) => supplier.company)
  suppliers: Supplier[];

  @OneToMany(() => Product, (product) => product.company)
  products: Product[];

  // Exactly one Admin per company (enforced via a partial unique index in the
  // migration — companyId + role='admin'). This relation is plural in TypeORM's
  // eyes since it doesn't model the partial constraint, but in practice this
  // array will only ever contain 0 or 1 user.
  @OneToMany(() => User, (user) => user.company)
  admins: User[];
}
