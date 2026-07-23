import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
    it('should delegate to AuthService.registerCompany with the given DTO', async () => {
      const dto = {
        companyName: 'Nike',
        adminName: 'Ali Raza',
        email: 'ali@nike.com',
        password: 'SecurePass123',
      };
      const expected = { accessToken: 'signed.jwt.token' };
      mockAuthService.registerCompany.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(service.registerCompany).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('POST /auth/login', () => {
    it('should delegate to AuthService.login with the given DTO', async () => {
      const dto = { email: 'ali@nike.com', password: 'SecurePass123' };
      const expected = { accessToken: 'signed.jwt.token' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
