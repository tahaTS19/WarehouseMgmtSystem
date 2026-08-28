import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseInventory } from './entities/warehouse-inventory.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { WarehouseInventoryService } from './warehouse-inventory.service';
import { WarehouseInventoryController } from './warehouse-inventory.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseInventory, Warehouse, Product])],
  controllers: [WarehouseInventoryController],
  providers: [WarehouseInventoryService],
  exports: [WarehouseInventoryService],
})
export class WarehouseInventoryModule {}