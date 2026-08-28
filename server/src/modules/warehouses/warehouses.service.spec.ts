import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { WarehousesService } from "./warehouses.service";
import { Warehouse } from "./entities/warehouse.entity";

function createMockQueryBuilder() {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  return qb;
}

describe("WarehousesService", () => {
  let service: WarehousesService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "wh-123", ...entity }),
        ),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: getRepositoryToken(Warehouse), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  describe("create", () => {
    it("binds the warehouse to the companyId on creation", async () => {
      const result = await service.create("company-1", {
        name: "Depot A",
        location: "Karachi",
      });

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: "Depot A",
        location: "Karachi",
        companyId: "company-1",
      });
      expect(result).toEqual(
        expect.objectContaining({ companyId: "company-1", name: "Depot A" }),
      );
    });
  });

  describe("findAllByCompany", () => {
    it("returns paginated warehouses", async () => {
      const qb = createMockQueryBuilder();

      qb.getManyAndCount.mockResolvedValue([[{ id: "wh-1", name: "Main" }], 1]);

      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllByCompany(
        "company-1",
        undefined,
        1,
        10,
        false,
      );

      expect(qb.where).toHaveBeenCalledWith(
        "warehouse.companyId = :companyId",
        {
          companyId: "company-1",
        },
      );

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(10);

      expect(result).toEqual({
        data: [{ id: "wh-1", name: "Main" }],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it("returns every warehouse when all=true", async () => {
      const qb = createMockQueryBuilder();

      qb.getMany.mockResolvedValue([{ id: "wh-1" }, { id: "wh-2" }]);

      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllByCompany(
        "company-1",
        undefined,
        1,
        10,
        true,
      );

      expect(qb.getMany).toHaveBeenCalled();

      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.take).not.toHaveBeenCalled();

      expect(result).toEqual([{ id: "wh-1" }, { id: "wh-2" }]);
    });

    it("applies search filter", async () => {
      const qb = createMockQueryBuilder();

      qb.getManyAndCount.mockResolvedValue([[], 0]);

      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAllByCompany("company-1", "main", 2, 5, false);

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(warehouse.name ILIKE :search OR warehouse.location ILIKE :search)",
        {
          search: "%main%",
        },
      );

      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(qb.take).toHaveBeenCalledWith(5);
    });
  });

  describe("findOne", () => {
    it("returns warehouse if found for companyId", async () => {
      mockRepo.findOne.mockResolvedValue({
        id: "wh-1",
        companyId: "company-1",
      });

      const result = await service.findOne("company-1", "wh-1");

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: "wh-1", companyId: "company-1" },
      });
      expect(result.id).toBe("wh-1");
    });

    it("throws NotFoundException when warehouse does not exist or belongs to another company", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne("company-1", "non-existent-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("updates and saves when warehouse exists and belongs to company", async () => {
      const existingWh = {
        id: "wh-1",
        companyId: "company-1",
        name: "Old Name",
      };
      mockRepo.findOne.mockResolvedValue(existingWh);

      const result = await service.update("company-1", "wh-1", {
        name: "New Name",
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Name" }),
      );
      expect(result.name).toBe("New Name");
    });

    it("throws NotFoundException if target warehouse does not belong to company", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("company-1", "wh-foreign", { name: "New Name" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("deletes warehouse if owned by company", async () => {
      const existingWh = { id: "wh-1", companyId: "company-1" };
      mockRepo.findOne.mockResolvedValue(existingWh);

      await service.remove("company-1", "wh-1");

      expect(mockRepo.remove).toHaveBeenCalledWith(existingWh);
    });
  });
});
