import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// A minimal mock of Express's Response object — we only need the methods
// this controller actually calls (res.cookie, res.clearCookie).
function createMockResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    registerCompany: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('POST /auth/register', () => {
    const dto = {
      companyName: 'Nike',
      adminName: 'Ali Raza',
      email: 'ali@nike.com',
      password: 'SecurePass123',
    };
    const serviceResult = {
      accessToken: 'signed.jwt.token',
      user: { userId: 'user-1', role: 'admin', companyId: 'company-1' },
    };

    it('should delegate to AuthService.registerCompany with the given DTO', async () => {
      mockAuthService.registerCompany.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      await controller.register(dto as any, res as any);

      expect(service.registerCompany).toHaveBeenCalledWith(dto);
    });

    it('should set the JWT as an httpOnly cookie, never in the response body', async () => {
      mockAuthService.registerCompany.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      const result = await controller.register(dto as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'token',
        'signed.jwt.token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).not.toHaveProperty('accessToken');
      expect(result).toEqual({ user: serviceResult.user });
    });
  });

  describe('POST /auth/login', () => {
    const dto = { email: 'ali@nike.com', password: 'SecurePass123' };
    const serviceResult = {
      accessToken: 'signed.jwt.token',
      user: { userId: 'user-1', role: 'admin', companyId: 'company-1' },
    };

    it('should delegate to AuthService.login with the given DTO', async () => {
      mockAuthService.login.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      await controller.login(dto as any, res as any);

      expect(service.login).toHaveBeenCalledWith(dto);
    });

    it('should set the JWT as an httpOnly cookie, never in the response body', async () => {
      mockAuthService.login.mockResolvedValue(serviceResult);
      const res = createMockResponse();

      const result = await controller.login(dto as any, res as any);

      expect(res.cookie).toHaveBeenCalledWith(
        'token',
        'signed.jwt.token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ user: serviceResult.user });
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear the auth cookie', async () => {
      const res = createMockResponse();

      const result = await controller.logout(res as any);

      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(result).toEqual({ success: true });
    });
  });

  describe('GET /auth/me', () => {
    it("should return whatever request.user contains (populated by JwtAuthGuard/JwtStrategy)", async () => {
      const mockRequest = {
        user: { userId: 'user-1', role: 'admin', companyId: 'company-1' },
      };

      const result = await controller.me(mockRequest as any);

      expect(result).toEqual({ user: mockRequest.user });
    });
  });
});
