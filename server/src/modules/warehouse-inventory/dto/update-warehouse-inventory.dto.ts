import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateWarehouseInventoryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumStock?: number;

  @IsOptional()
  @IsString()
  location?: string;
}