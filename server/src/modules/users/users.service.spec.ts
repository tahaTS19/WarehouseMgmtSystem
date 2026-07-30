import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';

function createMockQueryBuilder() {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
  };
  return qb;
}

describe('UsersService', () => {
  let service: UsersService;
  let mockUserRepo: any;
  let mockWarehouseRepo: any;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((u) =>
        Promise.resolve({ id: 'usr-123', createdAt: new Date(), ...u }),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    mockWarehouseRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Warehouse), useValue: mockWarehouseRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('createStaff', () => {
    const adminCompanyId = 'company-1';
    const dto = {
      name: 'Tariq Mahmood',
      email: 'tariq@test.com',
      password: 'password123',
      warehouseId: 'wh-1',
    };

    it('sets companyId to null to satisfy DB CHECK constraint when warehouse belongs to company', async () => {
      mockWarehouseRepo.findOne.mockResolvedValue({ id: 'wh-1', companyId: adminCompanyId });
      mockUserRepo.findOne.mockResolvedValue(null); // Email not taken

      const result = await service.createStaff(adminCompanyId, dto);

      expect(result.companyId).toBeNull();
      expect(result.warehouseId).toBe('wh-1');
      expect(result.role).toBe(UserRole.STAFF);
      expect((result as any).password).toBeUndefined(); // Password stripped from output
    });

    it('throws ForbiddenException if target warehouse does not belong to admin company', async () => {
      mockWarehouseRepo.findOne.mockResolvedValue(null);

      await expect(service.createStaff(adminCompanyId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if email is already registered', async () => {
      mockWarehouseRepo.findOne.mockResolvedValue({ id: 'wh-1', companyId: adminCompanyId });
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing-usr', email: dto.email });

      await expect(service.createStaff(adminCompanyId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAllByCompany', () => {
    it('uses QueryBuilder to include users linked directly or via warehouse companyId', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([{ id: 'usr-1', role: UserRole.STAFF }]);
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllByCompany('company-1');

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('user.warehouse', 'warehouse');
      expect(qb.where).toHaveBeenCalledWith('warehouse.companyId = :companyId', {
        companyId: 'company-1',
      });
      expect(qb.orWhere).toHaveBeenCalledWith('user.companyId = :companyId', {
        companyId: 'company-1',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns user if QueryBuilder finds matching record scoped to company', async () => {
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue({ id: 'usr-1' });
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findOne('company-1', 'usr-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(user.companyId = :companyId OR warehouse.companyId = :companyId)',
        { companyId: 'company-1' },
      );
      expect(result.id).toBe('usr-1');
    });

    it('throws NotFoundException if user is not found within company scope', async () => {
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne('company-1', 'usr-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStaff', () => {
    it('prevents editing Admin user details via staff management', async () => {
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue({ id: 'usr-admin', role: UserRole.ADMIN });
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateStaff('company-1', 'usr-admin', { name: 'Hacked Admin' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if re-assigning staff to a warehouse outside company', async () => {
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue({ id: 'usr-staff', role: UserRole.STAFF, warehouseId: 'wh-1' });
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      mockWarehouseRepo.findOne.mockResolvedValue(null); // Warehouse belongs to another company

      await expect(
        service.updateStaff('company-1', 'usr-staff', { warehouseId: 'wh-foreign' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeStaff', () => {
    it('prevents deleting an Admin account', async () => {
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue({ id: 'usr-admin', role: UserRole.ADMIN });
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.removeStaff('company-1', 'usr-admin')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes staff member successfully', async () => {
      const staffUser = { id: 'usr-staff', role: UserRole.STAFF };
      const qb = createMockQueryBuilder();
      qb.getOne.mockResolvedValue(staffUser);
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await service.removeStaff('company-1', 'usr-staff');

      expect(mockUserRepo.remove).toHaveBeenCalledWith(staffUser);
    });
  });
});