import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAvailabilitySlotBodyDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class CreateRecurringRuleBodyDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  startMinute?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  endHour!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  endMinute?: number;

  @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  recurrenceType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

export class CreateAvailabilityDto {
  @IsIn(['slot', 'recurring'])
  kind!: 'slot' | 'recurring';

  @ValidateNested()
  @Type(() => CreateAvailabilitySlotBodyDto)
  slot?: CreateAvailabilitySlotBodyDto;

  @ValidateNested()
  @Type(() => CreateRecurringRuleBodyDto)
  recurring?: CreateRecurringRuleBodyDto;
}

export class ListAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class UpdateAvailabilitySlotDto {
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class CreateBlockedSlotDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @IsOptional()
  @IsIn(['VACATION', 'EMERGENCY', 'BREAK', 'MEETING'])
  blockedType?: 'VACATION' | 'EMERGENCY' | 'BREAK' | 'MEETING';

  @IsOptional()
  @IsString()
  @MinLength(1)
  reason?: string;

  @IsDateString()
  blockedFrom!: string;

  @IsDateString()
  blockedTo!: string;
}

export class ListBlockedQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class FreeSlotsQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  staffId!: string;

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes?: number;
}
