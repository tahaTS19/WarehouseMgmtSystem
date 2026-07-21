import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

// Registering creates BOTH a Company and its one Admin User, atomically.
export class RegisterCompanyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  companyName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  adminName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(72) // bcrypt's own practical input limit
  password: string;
}
