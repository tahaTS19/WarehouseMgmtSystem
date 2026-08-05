import { Test, TestingModule } from "@nestjs/testing";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";

describe("WarehousesController", () => {
  let controller: WarehousesController;
  let service: WarehousesService;

  const mockWarehousesService = {
    create: jest.fn(),
    findAllByCompany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [
        { provide: WarehousesService, useValue: mockWarehousesService },
      ],
    }).compile();

    controller = module.get<WarehousesController>(WarehousesController);
    service = module.get<WarehousesService>(WarehousesService);
  });

  it("delegates create to service using requester companyId from JWT", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    const dto: CreateWarehouseDto = {
      name: "Central Warehouse",
      location: "Lahore",
    };
    mockWarehousesService.create.mockResolvedValue({
      id: "wh-1",
      companyId: "company-1",
      ...dto,
    });

    const result = await controller.create(mockReq, dto);

    expect(service.create).toHaveBeenCalledWith("company-1", dto);
    expect(result).toEqual({ id: "wh-1", companyId: "company-1", ...dto });
  });

  it("delegates findAll to service with companyId", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    mockWarehousesService.findAllByCompany.mockResolvedValue([
      { id: "wh-1", name: "Main" },
    ]);

    const mockQuery = {
      search: undefined,
    };

    const result = await controller.findAll(mockReq, mockQuery);

    expect(service.findAllByCompany).toHaveBeenCalledWith(
      "company-1",
      undefined,
    );
    expect(result).toHaveLength(1);
  });

  it("delegates findOne to service with companyId and warehouse id", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    mockWarehousesService.findOne.mockResolvedValue({
      id: "wh-1",
      name: "Main",
    });

    const result = await controller.findOne(mockReq, "wh-1");

    expect(service.findOne).toHaveBeenCalledWith("company-1", "wh-1");
    expect(result).toEqual({ id: "wh-1", name: "Main" });
  });

  it("delegates update to service with companyId, warehouse id, and dto", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    const dto: UpdateWarehouseDto = { name: "Updated Warehouse" };
    mockWarehousesService.update.mockResolvedValue({ id: "wh-1", ...dto });

    const result = await controller.update(mockReq, "wh-1", dto);

    expect(service.update).toHaveBeenCalledWith("company-1", "wh-1", dto);
    expect(result).toEqual({ id: "wh-1", ...dto });
  });

  it("delegates remove to service with companyId and warehouse id", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    mockWarehousesService.remove.mockResolvedValue(undefined);

    await controller.remove(mockReq, "wh-1");

    expect(service.remove).toHaveBeenCalledWith("company-1", "wh-1");
  });
});
