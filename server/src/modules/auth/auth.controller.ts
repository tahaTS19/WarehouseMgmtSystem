import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day — should match JWT_EXPIRES_IN

function setAuthCookie(response: Response, accessToken: string) {
  response.cookie(COOKIE_NAME, accessToken, {
    httpOnly: true, // never readable by frontend JS — the whole point of this change
    secure: process.env.NODE_ENV === 'production', // HTTPS-only in production; local dev is http
    sameSite: 'lax', // a lightweight CSRF mitigation; revisit if a stricter policy is ever needed
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/register — creates a Company + its one Admin User atomically.
  // Sets the JWT as an httpOnly cookie; the response body only ever contains
  // non-sensitive user info, never the token itself.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterCompanyDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user } = await this.authService.registerCompany(dto);
    setAuthCookie(response, accessToken);
    return { user };
  }

  // POST /api/auth/login — plain email + password, works for both Admin and Staff.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { accessToken, user } = await this.authService.login(dto);
    setAuthCookie(response, accessToken);
    return { user };
  }

  // POST /api/auth/logout — clears the httpOnly cookie. This has to be a real
  // endpoint (not something the frontend can do on its own), since frontend JS
  // has no access to httpOnly cookies at all — it can't read OR clear them.
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME);
    return { success: true };
  }

  // GET /api/auth/me — lets the frontend ask "who am I?" using the cookie
  // that's automatically sent with the request. This exists specifically
  // because the frontend can no longer decode the JWT itself to restore a
  // session on page load, now that the token lives only in an httpOnly cookie.
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: Request) {
    return { user: request.user };
  }
}
