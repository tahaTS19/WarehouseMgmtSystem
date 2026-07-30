import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateStaffDto } from './create-user.dto';

export class UpdateStaffDto extends PartialType(OmitType(CreateStaffDto, ['password'] as const)) {}