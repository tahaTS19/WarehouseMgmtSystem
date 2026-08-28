import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

// The core isolation boundary of the whole system. This must run AFTER a prior
// step (an interceptor, or logic in the route handler/service) has resolved
// which resource is being targeted and attached it to the request as
// `request.resource`, carrying that resource's `companyId` and/or
// `warehouseId` — whichever applies to the entity being accessed.
//
//   - Admin: allowed only if the resource's companyId matches their own companyId
//   - Staff: allowed only if the resource's warehouseId matches their own warehouseId
// Any mismatch, missing user, missing role, or missing resource ownership data
// results in denial — this guard defaults to DENY, never to ALLOW, on anything
// ambiguous.
@Injectable()
export class WarehouseScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resource = request.resource;

    if (!user || !user.role) {
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      if (!resource || !resource.companyId) {
        return false;
      }
      return resource.companyId === user.companyId;
    }

    if (user.role === UserRole.STAFF) {
      if (!resource || !resource.warehouseId) {
        return false;
      }
      return resource.warehouseId === user.warehouseId;
    }

    // Unrecognized role — deny by default.
    return false;
  }
}
