import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';

// ---- Test doubles ----
// A fake QueryRunner that mimics TypeORM's transaction API (BEGIN/COMMIT/ROLLBACK),
// so we can verify registerCompany() actually uses an atomic transaction, per the
// project's standing rule: "Company + Admin created atomically, in one DB transaction."
const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn(() => mockQueryRunner),
};

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockCompanyRepository = {};

const mockJwtService = {
  sign: jest.fn(() => 'signed.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Company), useValue: mockCompanyRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ================= registerCompany =================
  describe('registerCompany', () => {
    const dto = {
      companyName: 'Nike',
      adminName: 'Ali Raza',
      email: 'ali@nike.com',
      password: 'SecurePass123',
    };

    it('should reject registration if the email is already in use', async () => {
      mockUserRepository.findOne.mockResolvedValue({ id: 'existing-user-id', email: dto.email });

      await expect(service.registerCompany(dto as any)).rejects.toThrow(ConflictException);
    });

    it('should create the Company and the Admin User inside a single DB transaction', async () => {
      mockUserRepository.findOne.mockResolvedValue(null); // no existing user with this email

      const savedCompany = { id: 'company-id-1', name: dto.companyName };
      const savedUser = {
        id: 'user-id-1',
        email: dto.email,
        role: UserRole.ADMIN,
        companyId: savedCompany.id,
        warehouseId: null,
      };

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(savedCompany) // first save() call = Company
        .mockResolvedValueOnce(savedUser); // second save() call = User

      await service.registerCompany(dto as any);

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should roll back the entire transaction if creating the User fails after the Company was saved', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'company-id-1', name: dto.companyName }) // Company save succeeds
        .mockRejectedValueOnce(new Error('DB write failed')); // User save fails

      await expect(service.registerCompany(dto as any)).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled(); // must release connection even on failure
    });

    //new test logic
    it('should hash the password before storing it — never store it in plain text', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'company-id-1', name: dto.companyName })
        .mockResolvedValueOnce({ id: 'user-id-1', email: dto.email });

      await service.registerCompany(dto as any);

      const userSaveArg = mockQueryRunner.manager.save.mock.calls[1][0];

      expect(userSaveArg.password).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, userSaveArg.password)).toBe(true);
    });

    it('should create the User with role=admin, companyId set, and warehouseId null', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'company-id-1', name: dto.companyName })
        .mockResolvedValueOnce({ id: 'user-id-1' });

      await service.registerCompany(dto as any);

      const userSaveArg = mockQueryRunner.manager.save.mock.calls[1][0];
      expect(userSaveArg.role).toBe(UserRole.ADMIN);
      expect(userSaveArg.companyId).toBe('company-id-1');
      expect(userSaveArg.warehouseId).toBeNull();
    });

    it('should return a JWT access token after successful registration (auto-login)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'company-id-1', name: dto.companyName })
        .mockResolvedValueOnce({ id: 'user-id-1', role: UserRole.ADMIN, companyId: 'company-id-1' });

      const result = await service.registerCompany(dto as any);

      expect(result).toHaveProperty('accessToken');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should also return a plain "user" object matching the JWT payload (needed since the token itself lives only in an httpOnly cookie, never in the JSON body)', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save
        .mockResolvedValueOnce({ id: 'company-id-1', name: dto.companyName })
        .mockResolvedValueOnce({
          id: 'user-id-1',
          role: UserRole.ADMIN,
          companyId: 'company-id-1',
        });

      const result = await service.registerCompany(dto as any);

      expect(result.user).toEqual({
        userId: 'user-id-1',
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
      });
    });
  });

  // ================= login =================
  describe('login', () => {
    const dto = { email: 'ali@nike.com', password: 'SecurePass123' };

    it('should reject login if no user exists with that email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if the password does not match', async () => {
      const hashedPassword = await bcrypt.hash('a-different-password', 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: dto.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
      });

      await expect(service.login(dto as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should return a JWT with userId, role, and companyId in the payload for an admin', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: dto.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
        warehouseId: null,
      });

      await service.login(dto as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-1',
          role: UserRole.ADMIN,
          companyId: 'company-id-1',
        }),
      );
    });

    it('should also return a plain "user" object matching the JWT payload on login', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: dto.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
        warehouseId: null,
      });

      const result = await service.login(dto as any);

      expect(result.user).toEqual({
        userId: 'user-id-1',
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
      });
    });

    it('should return a JWT with userId, role, and warehouseId in the payload for staff', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-id-2',
        email: dto.email,
        password: hashedPassword,
        role: UserRole.STAFF,
        companyId: null,
        warehouseId: 'warehouse-id-1',
      });

      await service.login(dto as any);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id-2',
          role: UserRole.STAFF,
          warehouseId: 'warehouse-id-1',
        }),
      );
    });

    it('should never return the password hash as part of the login response', async () => {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      mockUserRepository.findOne.mockResolvedValue({
        id: 'user-id-1',
        email: dto.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        companyId: 'company-id-1',
      });

      const result = await service.login(dto as any);

      expect(result).not.toHaveProperty('password');
    });
  });
});
