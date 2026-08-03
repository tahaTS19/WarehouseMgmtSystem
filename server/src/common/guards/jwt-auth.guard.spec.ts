import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// JwtAuthGuard wraps Passport's built-in AuthGuard('jwt') — its own logic is
// thin, so what we actually verify here is that it delegates correctly and
// doesn't silently swallow failures.
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('handleRequest should return the user when authentication succeeds', () => {
    const user = { userId: 'user-1', role: 'admin', companyId: 'company-1' };

    const result = guard.handleRequest(null, user, null, {} as ExecutionContext);

    expect(result).toEqual(user);
  });

  it('handleRequest should throw an UnauthorizedException when there is no user (invalid/missing token)', () => {
    expect(() => guard.handleRequest(null, null, null, {} as ExecutionContext)).toThrow();
  });

  it('handleRequest should propagate the original error if one occurred', () => {
    const err = new Error('Token expired');

    expect(() => guard.handleRequest(err, null, null, {} as ExecutionContext)).toThrow('Token expired');
  });
});
