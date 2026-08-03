import { ExecutionContext } from '@nestjs/common';
import { WarehouseScopeGuard } from './warehouse-scope.guard';
import { UserRole } from '../../modules/users/entities/user.entity';

// These tests describe the CORE isolation contract of the entire system:
// no Admin may touch a resource outside their own company, and no Staff member
// may touch a resource outside their own warehouse — regardless of what the
// request claims or what the frontend sends.

function createMockContext({ user, params = {}, resourceCompanyId, resourceWarehouseId }: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params,
        // Simulates a resource already fetched by a prior step (e.g. an
        // interceptor or the route handler resolving the target entity),
        // carrying the ownership info the guard must check against.
        resource: {
          companyId: resourceCompanyId,
          warehouseId: resourceWarehouseId,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('WarehouseScopeGuard', () => {
  let guard: WarehouseScopeGuard;

  beforeEach(() => {
    guard = new WarehouseScopeGuard();
  });

  describe('Admin scope (company-wide)', () => {
    it('should allow an Admin to access a resource belonging to their OWN company', () => {
      const context = createMockContext({
        user: { userId: 'u1', role: UserRole.ADMIN, companyId: 'company-A' },
        resourceCompanyId: 'company-A',
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should DENY an Admin access to a resource belonging to a DIFFERENT company', () => {
      const context = createMockContext({
        user: { userId: 'u1', role: UserRole.ADMIN, companyId: 'company-A' },
        resourceCompanyId: 'company-B', // a different company entirely
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });

  describe('Staff scope (single warehouse)', () => {
    it('should allow Staff to access a resource belonging to their OWN warehouse', () => {
      const context = createMockContext({
        user: { userId: 'u2', role: UserRole.STAFF, warehouseId: 'warehouse-A' },
        resourceWarehouseId: 'warehouse-A',
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should DENY Staff access to a resource belonging to a DIFFERENT warehouse in the SAME company', () => {
      const context = createMockContext({
        user: { userId: 'u2', role: UserRole.STAFF, warehouseId: 'warehouse-A' },
        resourceWarehouseId: 'warehouse-B', // different warehouse, even if same company
      });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should DENY Staff any access to company-level resources (they have no companyId at all)', () => {
      const context = createMockContext({
        user: { userId: 'u2', role: UserRole.STAFF, warehouseId: 'warehouse-A' },
        resourceCompanyId: 'company-A',
        resourceWarehouseId: undefined,
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should deny access if there is no authenticated user on the request', () => {
      const context = createMockContext({ user: undefined, resourceCompanyId: 'company-A' });

      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access if the user has an unrecognized/missing role', () => {
      const context = createMockContext({
        user: { userId: 'u3', role: undefined },
        resourceCompanyId: 'company-A',
      });

      expect(guard.canActivate(context)).toBe(false);
    });
  });
});
