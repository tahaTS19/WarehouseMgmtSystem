import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  @MaxLength(255)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}