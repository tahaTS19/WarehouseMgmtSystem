import { IsOptional, IsString, MaxLength } from 'class-validator';

export class QueryWarehousesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}