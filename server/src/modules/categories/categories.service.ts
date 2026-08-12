import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { QueryCategoryDto } from "./dto/query-category.dto";
import { PaginatedResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(companyId: string, dto: CreateCategoryDto): Promise<Category> {
    try {
      const category = this.categoryRepo.create({
        ...dto,
        companyId,
      });
      return await this.categoryRepo.save(category);
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ConflictException(
          `Category with name "${dto.name}" already exists.`,
        );
      }
      throw new InternalServerErrorException("Failed to create category.");
    }
  }

  async findAllByCompany(
    companyId: string,
    query: QueryCategoryDto,
  ): Promise<PaginatedResponse<Category>> {
    const { search, page = 1, limit = 10, all = false } = query;

    const qb = this.categoryRepo
      .createQueryBuilder("category")
      .where("category.companyId = :companyId", { companyId });

    if (search?.trim()) {
      qb.andWhere("category.name ILIKE :search", {
        search: `%${search.trim()}%`,
      });
    }

    qb.orderBy("category.createdAt", "DESC");

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

  async findOne(companyId: string, id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }

    return category;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(companyId, id);
    Object.assign(category, dto);

    try {
      return await this.categoryRepo.save(category);
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ConflictException(
          `Category with name "${dto.name}" already exists.`,
        );
      }
      throw new InternalServerErrorException("Failed to update category.");
    }
  }

  async remove(companyId: string, id: string): Promise<void> {
    const category = await this.findOne(companyId, id);
    await this.categoryRepo.remove(category);
  }
}
