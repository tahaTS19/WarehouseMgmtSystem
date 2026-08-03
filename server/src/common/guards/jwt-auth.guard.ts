import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Thin wrapper around Passport's AuthGuard('jwt'), which itself runs
// JwtStrategy.validate() under the hood. This override exists so we control
// exactly what happens when authentication fails, rather than relying on
// Passport's default (sometimes silent) behavior.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    return user;
  }
}
