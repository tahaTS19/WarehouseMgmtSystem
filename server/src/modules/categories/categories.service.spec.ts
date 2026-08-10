import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { Category } from "./entities/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { QueryCategoryDto } from "./dto/query-category.dto";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let mockRepo: any;
  let mockQueryBuilder: any;

  const mockCompanyId = "comp-uuid-1111";

  beforeEach(async () => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("binds companyId to entity on creation and returns saved category", async () => {
      const dto: CreateCategoryDto = {
        name: "Electronics",
        description: "Tech items",
      };
      const createdCategory = { id: "cat-1", companyId: mockCompanyId, ...dto };

      mockRepo.save.mockResolvedValue(createdCategory);

      const result = await service.create(mockCompanyId, dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        ...dto,
        companyId: mockCompanyId,
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(createdCategory);
    });

    it("throws ConflictException on Postgres duplicate key error (23505)", async () => {
      const dto: CreateCategoryDto = { name: "Electronics" };
      mockRepo.save.mockRejectedValue({ code: "23505" });

      await expect(service.create(mockCompanyId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("findAllByCompany", () => {
    it("applies companyId isolation as the primary .where() clause", async () => {
      const query: QueryCategoryDto = { page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "category.companyId = :companyId",
        {
          companyId: mockCompanyId,
        },
      );
    });

    it("applies ILIKE search filter when search param is supplied", async () => {
      const query: QueryCategoryDto = { search: "elec", page: 1, limit: 10 };
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "category.name ILIKE :search",
        {
          search: "%elec%",
        },
      );
    });

    it("calculates correct pagination skip/take and returns standard paginated envelope", async () => {
      const query: QueryCategoryDto = { page: 2, limit: 5 };
      const mockItems = [{ id: "cat-1", name: "Cat 1" }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 12]);

      const result: any = await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5); // (2 - 1) * 5
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        data: mockItems,
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      });
    });

    it("returns all items in a paginated envelope and bypasses pagination when all=true lookup mode is passed", async () => {
      const query: QueryCategoryDto = { page: 1, limit: 10, all: true };

      const mockItems = [
        { id: "cat-1", name: "Cat 1" },
        { id: "cat-2", name: "Cat 2" },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockItems);

      const result = await service.findAllByCompany(mockCompanyId, query);

      expect(mockQueryBuilder.skip).not.toHaveBeenCalled();
      expect(mockQueryBuilder.take).not.toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();

      expect(result).toEqual({
        data: mockItems,
        page: 1,
        limit: mockItems.length,
        total: mockItems.length,
        totalPages: 1,
      });
    });
  });

  describe("findOne", () => {
    it("returns category when found for companyId", async () => {
      const mockCategory = {
        id: "cat-1",
        companyId: mockCompanyId,
        name: "Hardware",
      };
      mockRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne(mockCompanyId, "cat-1");

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: "cat-1", companyId: mockCompanyId },
      });
      expect(result).toEqual(mockCategory);
    });

    it("throws NotFoundException when category does not exist or belongs to another company", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockCompanyId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("updates and saves category when ownership check succeeds", async () => {
      const existing = {
        id: "cat-1",
        companyId: mockCompanyId,
        name: "Old Name",
      };
      const dto: UpdateCategoryDto = { name: "New Name" };

      mockRepo.findOne.mockResolvedValue(existing);
      // Replace line 161 with:
      mockRepo.save.mockImplementation((entity: Category) =>
        Promise.resolve(entity),
      );

      const result = await service.update(mockCompanyId, "cat-1", dto);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Name" }),
      );
      expect(result.name).toBe("New Name");
    });

    it("throws ConflictException if update triggers duplicate key error (23505)", async () => {
      const existing = {
        id: "cat-1",
        companyId: mockCompanyId,
        name: "Old Name",
      };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockRejectedValue({ code: "23505" });

      await expect(
        service.update(mockCompanyId, "cat-1", { name: "Duplicate" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("removes entity when found and owned by company", async () => {
      const existing = { id: "cat-1", companyId: mockCompanyId };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove(mockCompanyId, "cat-1");

      expect(mockRepo.remove).toHaveBeenCalledWith(existing);
    });

    it("throws NotFoundException if target category does not exist for company", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockCompanyId, "cat-foreign"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
