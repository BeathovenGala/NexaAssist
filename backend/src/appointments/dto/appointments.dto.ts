import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsUUID()
  customerId!: string;

  @IsUUID()
  assignedStaffId!: string;

  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsIn(['DASHBOARD', 'PUBLIC_BOOKING', 'CHATBOT', 'ADMIN_CREATED'])
  source?: 'DASHBOARD' | 'PUBLIC_BOOKING' | 'CHATBOT' | 'ADMIN_CREATED';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAppointmentsQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  serviceTypeId?: string;

  @IsOptional()
  @IsIn([
    'PENDING',
    'CONFIRMED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED',
    'NO_SHOW',
  ])
  status?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class RejectAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}

export class CompleteAppointmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
