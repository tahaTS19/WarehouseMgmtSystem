import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { CreateStaffDto } from "./dto/create-user.dto";
import { UpdateStaffDto } from "./dto/update-user.dto";

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

  it("delegates findAll to service with companyId", async () => {
    const mockReq = { user: { companyId: "company-1" } } as any;

    const mockQuery = {
      search: undefined,
      warehouseId: undefined,
    };

    mockUsersService.findAllByCompany.mockResolvedValue([{ id: "usr-1" }]);

    const result = await controller.findAll(mockReq, mockQuery);

    expect(service.findAllByCompany).toHaveBeenCalledWith(
      "company-1",
      undefined,
      undefined,
    );

    expect(result).toHaveLength(1);
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
});
