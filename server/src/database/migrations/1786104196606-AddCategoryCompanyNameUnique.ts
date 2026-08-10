import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryCompanyNameUnique1786104196606 implements MigrationInterface {
    name = 'AddCategoryCompanyNameUnique1786104196606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b2c40d2a7745ea6d52614c7617" UNIQUE ("companyId", "name")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "UQ_8b2c40d2a7745ea6d52614c7617"`);
    }

}
