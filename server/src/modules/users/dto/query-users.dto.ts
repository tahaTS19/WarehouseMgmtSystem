import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}