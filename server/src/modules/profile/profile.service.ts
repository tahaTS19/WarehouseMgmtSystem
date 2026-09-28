import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "../users/entities/user.entity";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * GET /profile/me
   * Retrieves full profile details for the logged-in user.
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["company", "warehouse"],
    });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    const { password, ...result } = user;
    return result;
  }

  /**
   * PATCH /profile
   * Updates user name and phone number only (email is excluded).
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;

    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`User profile updated for userId: ${userId}`);

    const { password, ...result } = updatedUser;
    return result;
  }

  /**
   * PATCH /profile/password
   * Verifies current password using bcrypt before hashing and saving new password.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // Explicitly include 'password' in select so TypeORM loads the hash
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "password"],
    });

    if (!user) {
      throw new NotFoundException("User profile not found");
    }

    // user.password is now defined, so bcrypt.compare will execute properly
    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      this.logger.warn(`Failed password change attempt for userId: ${userId}`);
      throw new UnauthorizedException("Current password does not match");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);

    await this.userRepo.save(user);
    this.logger.log(`Password updated successfully for userId: ${userId}`);

    return { message: "Password changed successfully" };
  }
}
