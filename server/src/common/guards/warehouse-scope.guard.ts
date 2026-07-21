import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

// STUB — see warehouse-scope.guard.spec.ts for expected behavior.
//
// This guard is the core of the isolation model: it must verify that whatever
// resource a request is trying to touch (a warehouse, a product, a transaction,
// etc.) actually belongs to the requesting user's own scope —
//   - Admin: the resource's company must match the admin's own companyId
//   - Staff: the resource's warehouse must match the staff's own warehouseId
// This must be enforced server-side on every relevant route, never left to the
// frontend to "just not show" restricted data.
@Injectable()
export class WarehouseScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    throw new Error('Not implemented yet — see warehouse-scope.guard.spec.ts for expected behavior');
  }
}
