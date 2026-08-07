import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { CreateStaffDto } from "./dto/create-user.dto";
import { UpdateStaffDto } from "./dto/update-user.dto";
import { UserStatus } from "./entities/user.entity";

describe("UsersController", () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    createStaff: jest.fn(),
    findAllByCompany: jest.fn(),
    findOne: jest.fn(),
    updateStaff: jest.fn(),
    removeStaff: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it("delegates createStaff to service using admin companyId from JWT", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    const dto: CreateStaffDto = {
      name: "Usman Ghani",
      email: "usman@company.com",
      password: "Password123!",
      warehouseId: "wh-1",
    };
    mockUsersService.createStaff.mockResolvedValue({ id: "usr-1", ...dto });

    const result = await controller.createStaff(mockReq, dto);

    expect(service.createStaff).toHaveBeenCalledWith("company-1", dto);
    expect(result).toEqual({ id: "usr-1", ...dto });
  });

  it("delegates findAll to service with filters and pagination", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;

    const mockQuery = {
      search: undefined,
      warehouseId: undefined,
      status: undefined,
      page: 1,
      limit: 10,
    };

    const paginatedResponse = {
      data: [{ id: "usr-1" }],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    };

    mockUsersService.findAllByCompany.mockResolvedValue(paginatedResponse);

    const result = await controller.findAll(mockReq, mockQuery);

    expect(service.findAllByCompany).toHaveBeenCalledWith(
      "company-1",
      undefined,
      undefined,
      undefined,
      1,
      10,
    );

    expect(result).toEqual(paginatedResponse);
  });

  it("delegates updateStaff to service with companyId, staff user id, and dto", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    const dto: UpdateStaffDto = { name: "Usman G. Updated" };
    mockUsersService.updateStaff.mockResolvedValue({ id: "usr-1", ...dto });

    const result = await controller.updateStaff(mockReq, "usr-1", dto);

    expect(service.updateStaff).toHaveBeenCalledWith("company-1", "usr-1", dto);
    expect(result).toEqual({ id: "usr-1", ...dto });
  });

  it("delegates removeStaff to service with companyId and user id", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;
    mockUsersService.removeStaff.mockResolvedValue(undefined);

    await controller.removeStaff(mockReq, "usr-1");

    expect(service.removeStaff).toHaveBeenCalledWith("company-1", "usr-1");
  });

  it("passes custom pagination values to the service", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;

    const mockQuery = {
      search: "john",
      warehouseId: "wh-1",
      status: UserStatus.ACTIVE,
      page: 3,
      limit: 25,
    };

    const paginatedResponse = {
      data: [],
      page: 3,
      limit: 25,
      total: 0,
      totalPages: 0,
    };

    mockUsersService.findAllByCompany.mockResolvedValue(paginatedResponse);

    await controller.findAll(mockReq, mockQuery);

    expect(service.findAllByCompany).toHaveBeenCalledWith(
      "company-1",
      "john",
      "wh-1",
      UserStatus.ACTIVE,
      3,
      25,
    );
  });
});
