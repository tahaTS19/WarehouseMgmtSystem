import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { RegisterCompanyDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async registerCompany(dto: RegisterCompanyDto): Promise<{ accessToken: string }> {
    // Email is globally unique across the whole system, checked up front —
    // outside the transaction, since this is a read-only pre-check, not part
    // of the atomic write itself.
    const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Company + Admin User must be created atomically: either both succeed,
    // or neither does. A QueryRunner-managed transaction is used instead of
    // the repository directly, so we control BEGIN/COMMIT/ROLLBACK explicitly.
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const company = new Company();
      company.name = dto.companyName;
      const savedCompany = await queryRunner.manager.save(company);

      const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

      const admin = new User();
      admin.name = dto.adminName;
      admin.email = dto.email;
      admin.password = hashedPassword;
      admin.role = UserRole.ADMIN;
      admin.status = UserStatus.ACTIVE;
      admin.companyId = savedCompany.id;
      admin.warehouseId = null;

      const savedAdmin = await queryRunner.manager.save(admin);

      await queryRunner.commitTransaction();

      const accessToken = this.jwtService.sign({
        userId: savedAdmin.id,
        role: savedAdmin.role,
        companyId: savedAdmin.companyId,
      });

      return { accessToken };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    // password has `select: false` on the entity, so it must be explicitly
    // requested here — this is the one place in the whole app that's allowed
    // to read it.
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'role', 'status', 'companyId', 'warehouseId'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: Record<string, any> = {
      userId: user.id,
      role: user.role,
    };

    if (user.role === UserRole.ADMIN) {
      payload.companyId = user.companyId;
    } else {
      payload.warehouseId = user.warehouseId;
    }

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
