import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, extractJwtFromCookie } from './jwt.strategy';

describe('extractJwtFromCookie', () => {
  it('returns the token when the "token" cookie is present', () => {
    const req = { cookies: { token: 'abc.def.ghi' } } as any;
    expect(extractJwtFromCookie(req)).toBe('abc.def.ghi');
  });

  it('returns null when there is no "token" cookie', () => {
    const req = { cookies: {} } as any;
    expect(extractJwtFromCookie(req)).toBeNull();
  });

  it('returns null when there are no cookies at all on the request', () => {
    const req = {} as any;
    expect(extractJwtFromCookie(req)).toBeNull();
  });
});

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [JwtStrategy, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    strategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return an object exposing userId, role, and companyId for an admin payload', async () => {
      const payload = { userId: 'user-1', role: 'admin', companyId: 'company-1' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-1',
        role: 'admin',
        companyId: 'company-1',
        warehouseId: undefined,
      });
    });

    it('should return an object exposing userId, role, and warehouseId for a staff payload', async () => {
      const payload = { userId: 'user-2', role: 'staff', warehouseId: 'warehouse-1' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-2',
        role: 'staff',
        warehouseId: 'warehouse-1',
        companyId: undefined,
      });
    });

    // Whatever validate() returns becomes request.user — this is what every
    // downstream guard (RolesGuard, WarehouseScopeGuard) reads from.
    it('should never include the password or any other sensitive field, even if present on the payload', async () => {
      const payload = {
        userId: 'user-1',
        role: 'admin',
        companyId: 'company-1',
        password: 'should-never-be-here',
      };

      const result = await strategy.validate(payload as any);

      expect(result).not.toHaveProperty('password');
    });
  });
});
