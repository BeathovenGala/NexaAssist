import { Type } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CalendarRangeQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @Type(() => Number)
  maxAppointments?: number;
}
