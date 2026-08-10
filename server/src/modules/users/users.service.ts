import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User, UserRole, UserStatus } from "./entities/user.entity";
import { CreateStaffDto } from "./dto/create-user.dto";
import { UpdateStaffDto } from "./dto/update-user.dto";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { PaginatedResponse } from "../../common/interfaces/paginated-response.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
  ) {}

  async createStaff(
    adminCompanyId: string,
    dto: CreateStaffDto,
  ): Promise<Omit<User, "password">> {
    // 1. Verify target warehouse belongs to Admin's company
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: dto.warehouseId, companyId: adminCompanyId },
    });

    if (!warehouse) {
      throw new ForbiddenException(
        "Target warehouse does not belong to your company.",
      );
    }

    // 2. Check globally unique email constraint
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException("Email address already registered.");
    }

    // 3. Hash password & enforce DB constraint
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      ...dto,
      companyId: null,
      role: UserRole.STAFF,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;

    return result;
  }

  async findAllByCompany(
    companyId: string,
    search?: string,
    warehouseId?: string,
    status?: UserStatus,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<User>> {
    const query = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.warehouse", "warehouse")
      .where(
        "(warehouse.companyId = :companyId OR user.companyId = :companyId)",
        {
          companyId,
        },
      )
      .andWhere("user.role = :role", {
        role: UserRole.STAFF,
      });

    if (search?.trim()) {
      query.andWhere(
        `(
        user.name ILIKE :search
        OR user.phone ILIKE :search
        OR split_part(user.email, '@', 1) ILIKE :search
      )`,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    if (warehouseId) {
      query.andWhere("user.warehouseId = :warehouseId", {
        warehouseId,
      });
    }

    if (status) {
      query.andWhere("user.status = :status", {
        status,
      });
    }

    query
      .orderBy("user.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(companyId: string, id: string): Promise<User> {
    const user = await this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.warehouse", "warehouse")
      .where("user.id = :id", { id })
      .andWhere(
        "(user.companyId = :companyId OR warehouse.companyId = :companyId)",
        { companyId },
      )
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    return user;
  }

  async updateStaff(
    companyId: string,
    id: string,
    dto: UpdateStaffDto,
  ): Promise<User> {
    const user = await this.findOne(companyId, id);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        "Cannot edit Admin details via staff management.",
      );
    }

    if (dto.warehouseId && dto.warehouseId !== user.warehouseId) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: dto.warehouseId, companyId },
      });

      if (!warehouse) {
        throw new ForbiddenException(
          "Target warehouse does not belong to your company.",
        );
      }
    }

    Object.assign(user, dto);

    return this.userRepository.save(user);
  }

  async removeStaff(companyId: string, id: string): Promise<void> {
    const user = await this.findOne(companyId, id);

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        "Cannot delete company Admin via staff endpoint.",
      );
    }

    await this.userRepository.remove(user);
  }
}
