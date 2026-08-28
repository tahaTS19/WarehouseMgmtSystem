import { IsEnum, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { TransactionType, TransactionReason } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsUUID()
  warehouseInventoryId: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNotEmpty()
  @IsEnum(TransactionReason)
  reason: TransactionReason;
}