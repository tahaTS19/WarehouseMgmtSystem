import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WarehouseInventory } from "./entities/warehouse-inventory.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Product } from "../products/entities/product.entity";
import { CreateWarehouseInventoryDto } from "./dto/create-warehouse-inventory.dto";
import { UpdateWarehouseInventoryDto } from "./dto/update-warehouse-inventory.dto";
import { QueryWarehouseInventoryDto } from "./dto/query-warehouse-inventory.dto";
import { PaginatedResponse } from "../../common/interfaces/paginated-response.interface";
import { UserRole } from "../users/entities/user.entity";

@Injectable()
export class WarehouseInventoryService {
  private readonly logger = new Logger(WarehouseInventoryService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly inventoryRepo: Repository<WarehouseInventory>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(
    companyId: string,
    dto: CreateWarehouseInventoryDto,
  ): Promise<WarehouseInventory> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouseId, companyId },
    });
    if (!warehouse) {
      this.logger.warn(
        `Warehouse creation check failed: ${dto.warehouseId} not found for company${companyId}`,
      );
      throw new NotFoundException("Warehouse not found.");
    }

    const product = await this.productRepo.findOne({
      where: { id: dto.productId, companyId },
    });
    if (!product) {
      this.logger.warn(
        `Product creation check failed: ${dto.productId} not found for company${companyId}`,
      );
      throw new NotFoundException("Product not found.");
    }

    try {
      const inventory = this.inventoryRepo.create({
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        currentStock: dto.currentStock,
        minimumStock: dto.minimumStock,
        location: dto.location,
      });
      const saved = await this.inventoryRepo.save(inventory);
      this.logger.log(
        `Created warehouse inventory link ${saved.id} for company${companyId}`,
      );
      return saved;
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ConflictException(
          "This product is already linked to the specified warehouse.",
        );
      }
      this.logger.error(
        `Failed to create warehouse inventory record`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll(
    user: { companyId: string; warehouseId?: string; role: UserRole },
    query: QueryWarehouseInventoryDto,
  ): Promise<PaginatedResponse<WarehouseInventory>> {
    const {
      search,
      warehouseId,
      productId,
      page = 1,
      limit = 10,
      all = false,
    } = query;

    const qb = this.inventoryRepo
      .createQueryBuilder("inventory")
      .innerJoinAndSelect("inventory.warehouse", "warehouse")
      .innerJoinAndSelect("inventory.product", "product");

    // Base isolation branches by role — Admin scopes by company, Staff scopes
    // by their own warehouse. Never run the companyId comparison for a Staff
    // user, since their token correctly has companyId: null.
    if (user.role === UserRole.STAFF) {
      if (!user.warehouseId) {
        return { data: [], page: 1, limit, total: 0, totalPages: 0 };
      }
      qb.where("inventory.warehouseId = :assignedWh", {
        assignedWh: user.warehouseId,
      });
    } else {
      qb.where("warehouse.companyId = :companyId", {
        companyId: user.companyId,
      });
      if (warehouseId) {
        qb.andWhere("inventory.warehouseId = :warehouseId", { warehouseId });
      }
    }

    if (productId) {
      qb.andWhere("inventory.productId = :productId", { productId });
    }

    if (search?.trim()) {
      qb.andWhere("(product.name ILIKE :search OR product.sku ILIKE :search)", {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy("inventory.createdAt", "DESC");

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

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  async findOne(
    companyId: string,
    id: string,
    userWarehouseId?: string,
  ): Promise<WarehouseInventory> {
    const qb = this.inventoryRepo
      .createQueryBuilder("inventory")
      .innerJoinAndSelect("inventory.warehouse", "warehouse")
      .innerJoinAndSelect("inventory.product", "product")
      .where("inventory.id = :id", { id });

    if (userWarehouseId) {
      // Staff — scope by their own warehouse only, never touch companyId
      qb.andWhere("inventory.warehouseId = :userWarehouseId", {
        userWarehouseId,
      });
    } else {
      // Admin — scope by company
      qb.andWhere("warehouse.companyId = :companyId", { companyId });
    }

    const item = await qb.getOne();
    if (!item) {
      throw new NotFoundException(`Warehouse inventory item #${id} not found.`);
    }

    return item;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateWarehouseInventoryDto,
  ): Promise<WarehouseInventory> {
    const inventory = await this.findOne(companyId, id);

    if (dto.minimumStock !== undefined)
      inventory.minimumStock = dto.minimumStock;
    if (dto.location !== undefined) inventory.location = dto.location;

    const updated = await this.inventoryRepo.save(inventory);
    this.logger.log(`Updated warehouse inventory record #${id}`);
    return updated;
  }

  async remove(companyId: string, id: string): Promise<void> {
    const inventory = await this.findOne(companyId, id);
    await this.inventoryRepo.remove(inventory);
    this.logger.log(`Deleted warehouse inventory record #${id}`);
  }
}
