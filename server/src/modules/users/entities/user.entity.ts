import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Check,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';

export enum UserRole {
  ADMIN = 'admin', // company-wide access — sees/manages ALL of their company's warehouses
  STAFF = 'staff', // scoped to exactly one warehouse
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('users')
// Exactly one of companyId / warehouseId must be set, matching the role — never
// both, never neither. Enforced at the database level, not just app logic, so a
// broken/ambiguous user row is structurally impossible to create.
@Check(
  `("role" = 'admin' AND "companyId" IS NOT NULL AND "warehouseId" IS NULL) OR ` +
    `("role" = 'staff' AND "warehouseId" IS NOT NULL AND "companyId" IS NULL)`,
)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // Globally unique — not per-warehouse/per-company. One email, one account,
  // same as virtually every app with logins. Login is simply email + password,
  // no need to disambiguate which company/warehouse first.
  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  // select: false excludes this column from normal SELECT queries by default — it
  // must be explicitly requested (e.g. .addSelect('user.password')) during login,
  // so the password hash never accidentally ends up in an API response.
  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  // Set ONLY when role = 'admin'. Null for staff.
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, (company) => company.admins, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'companyId' })
  company: Company | null;

  // Set ONLY when role = 'staff'. Null for admin.
  @Column({ type: 'uuid', nullable: true })
  warehouseId: string | null;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.staff, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse | null;

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
