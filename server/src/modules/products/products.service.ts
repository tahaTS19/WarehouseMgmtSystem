import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  private async validateRelations(companyId: string, categoryId?: string | null, supplierId?: string | null): Promise<void> {
    if (categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: categoryId, companyId } });
      if (!category) {
        throw new NotFoundException(`Category with ID "${categoryId}" not found.`);
      }
    }
    if (supplierId) {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId, companyId } });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID "${supplierId}" not found.`);
      }
    }
  }

  async create(companyId: string, dto: CreateProductDto): Promise<Product> {
    await this.validateRelations(companyId, dto.categoryId, dto.supplierId);

    try {
      const product = this.productRepo.create({
        ...dto,
        companyId,
      });
      const saved = await this.productRepo.save(product);
      this.logger.log(`Created product ${saved.id} (SKU: ${saved.sku}) for company ${companyId}`);
      return saved;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`A product with SKU "${dto.sku}" already exists.`);
      }
      this.logger.error(`Failed to create product for company ${companyId}`, error.stack);
      throw new InternalServerErrorException('Failed to create product.');
    }
  }

  async findAllByCompany(
    companyId: string,
    query: QueryProductDto,
  ): Promise<PaginatedResponse<Product>> {
    const { search, categoryId, supplierId, page = 1, limit = 10, all = false } = query;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .where('product.companyId = :companyId', { companyId });

    if (search?.trim()) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.sku ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('product.categoryId = :categoryId', { categoryId });
    }

    if (supplierId) {
      qb.andWhere('product.supplierId = :supplierId', { supplierId });
    }

    qb.orderBy('product.createdAt', 'DESC');

    if (all) {
      const data = await qb.getMany();
      return {
        data,
        page: 1,
        limit: data.length,
        total: data.length,
        totalPages: 1,
      };
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id, companyId },
      relations: ['category', 'supplier'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found.`);
    }

    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(companyId, id);
    await this.validateRelations(companyId, dto.categoryId, dto.supplierId);

    Object.assign(product, dto);

    try {
      const updated = await this.productRepo.save(product);
      this.logger.log(`Updated product ${id} for company ${companyId}`);
      return updated;
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ConflictException(`A product with SKU "${dto.sku}" already exists.`);
      }
      this.logger.error(`Failed to update product ${id}`, error.stack);
      throw new InternalServerErrorException('Failed to update product.');
    }
  }

  async attachImage(companyId: string, id: string, file: Express.Multer.File): Promise<Product> {
    const product = await this.findOne(companyId, id);

    const imageUrl = await new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'wms-products' },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    product.image = imageUrl;
    const updated = await this.productRepo.save(product);
    this.logger.log(`Attached image to product ${id} via Cloudinary`);
    return updated;
  }

  async remove(companyId: string, id: string): Promise<void> {
    const product = await this.findOne(companyId, id);
    await this.productRepo.remove(product);
    this.logger.log(`Removed product ${id} from company ${companyId}`);
  }
}