import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1784621913685 implements MigrationInterface {
    name = 'InitialSchema1784621913685'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Required for uuid_generate_v4() used as the default on every primary key below.
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" text, "companyId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "suppliers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying(150) NOT NULL, "contact_person" character varying(100), "phone" character varying(20), "email" character varying(150), "address" character varying(255), "companyId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "sku" character varying(50) NOT NULL, "description" text, "image" character varying(500), "categoryId" uuid, "supplierId" uuid, "unit_price" numeric(10,2) NOT NULL DEFAULT '0', "companyId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_product_sku_per_company" UNIQUE ("sku", "companyId"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "warehouse_inventory" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "warehouseId" uuid NOT NULL, "productId" uuid NOT NULL, "current_stock" integer NOT NULL DEFAULT '0', "minimum_stock" integer NOT NULL DEFAULT '0', "location" character varying(100), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_warehouse_product_pair" UNIQUE ("warehouseId", "productId"), CONSTRAINT "PK_68eed43c66d3da3931f9a10354c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('stock_in', 'stock_out')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_reason_enum" AS ENUM('purchase', 'sale', 'damage', 'return', 'manual_adjustment')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "warehouseInventoryId" uuid NOT NULL, "quantity" integer NOT NULL, "type" "public"."transactions_type_enum" NOT NULL, "reason" "public"."transactions_reason_enum" NOT NULL, "userId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'staff')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "phone" character varying(20), "role" "public"."users_role_enum" NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "companyId" uuid, "warehouseId" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_dd93dacf1db5fe8164454db4d4" CHECK (("role" = 'admin' AND "companyId" IS NOT NULL AND "warehouseId" IS NULL) OR ("role" = 'staff' AND "warehouseId" IS NOT NULL AND "companyId" IS NULL)), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "warehouses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "location" character varying(255), "companyId" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`);

        // Partial unique index: exactly one Admin per Company. TypeORM's @Check decorator
        // doesn't generate conditional/partial indexes, so this must be added manually.
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_one_admin_per_company" ON "users" ("companyId") WHERE "role" = 'admin'`);

        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_92d9e96e1be5a0b3e94fddb892a" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "suppliers" ADD CONSTRAINT "FK_a16f3c2e9b291abc6790e9822ae" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_c143cbc0299e1f9220c4b5debd8" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_47942e65af8e4235d4045515f05" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "FK_399a740c6a570a1ec4f1bf829f7" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "warehouse_inventory" ADD CONSTRAINT "FK_52ecf5b7359b08a8705ae51ffba" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_80b0ea273c0339f7028f63d0670" FOREIGN KEY ("warehouseInventoryId") REFERENCES "warehouse_inventory"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_6f9395c9037632a31107c8a9e58" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_66dcc8b80d6571a4edf537bff1e" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "warehouses" ADD CONSTRAINT "FK_317f82e3b199a7c6015ce1aff95" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "warehouses" DROP CONSTRAINT "FK_317f82e3b199a7c6015ce1aff95"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_66dcc8b80d6571a4edf537bff1e"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_6f9395c9037632a31107c8a9e58"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_80b0ea273c0339f7028f63d0670"`);
        await queryRunner.query(`ALTER TABLE "warehouse_inventory" DROP CONSTRAINT "FK_52ecf5b7359b08a8705ae51ffba"`);
        await queryRunner.query(`ALTER TABLE "warehouse_inventory" DROP CONSTRAINT "FK_399a740c6a570a1ec4f1bf829f7"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_47942e65af8e4235d4045515f05"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_c143cbc0299e1f9220c4b5debd8"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "suppliers" DROP CONSTRAINT "FK_a16f3c2e9b291abc6790e9822ae"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_92d9e96e1be5a0b3e94fddb892a"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_one_admin_per_company"`);
        await queryRunner.query(`DROP TABLE "warehouses"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_reason_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "warehouse_inventory"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "suppliers"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
