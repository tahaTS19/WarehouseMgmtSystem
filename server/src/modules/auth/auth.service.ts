import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { RegisterCompanyDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// STUB — implementation intentionally not written yet (TDD: tests come first).
// See auth.service.spec.ts for the expected behavior this service must satisfy.
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto): Promise<{ accessToken: string }> {
    throw new Error('Not implemented yet — see auth.service.spec.ts for expected behavior');
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    throw new Error('Not implemented yet — see auth.service.spec.ts for expected behavior');
  }
}
