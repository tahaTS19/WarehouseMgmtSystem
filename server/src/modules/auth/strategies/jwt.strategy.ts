import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  userId: string;
  role: string;
  companyId?: string;
  warehouseId?: string;
}

// Runs automatically whenever JwtAuthGuard protects a route. Passport verifies
// the token's signature and expiry BEFORE this even runs — by the time
// validate() is called, the token is already known to be authentic. This just
// shapes what ends up on request.user for every downstream guard/controller
// to read.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      // Fail loudly at startup rather than silently running with an undefined
      // secret — a missing JWT_SECRET is a critical misconfiguration, not
      // something to fall back from silently.
      throw new Error('JWT_SECRET is not set in the environment — cannot start JwtStrategy');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.userId,
      role: payload.role,
      companyId: payload.companyId,
      warehouseId: payload.warehouseId,
    };
  }
}
