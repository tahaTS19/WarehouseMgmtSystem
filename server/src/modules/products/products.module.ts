import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Supplier])],
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryProvider],
  exports: [ProductsService],
})
export class ProductsModule {}