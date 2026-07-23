import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/register — creates a Company + its one Admin User atomically,
  // returns a JWT immediately (auto-login). Public route, no auth required.
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  // POST /api/auth/login — plain email + password, works for both Admin and
  // Staff. Public route, no auth required.
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
