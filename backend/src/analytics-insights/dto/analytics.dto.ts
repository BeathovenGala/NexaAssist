import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AnalyticsModule } from '@prisma/client';

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class ModuleMetricsDto extends DateRangeDto {
  @IsOptional()
  @IsEnum(AnalyticsModule)
  module?: AnalyticsModule;
}

export class InsightsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsModule)
  module?: AnalyticsModule;
}

export class EventsQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEnum(AnalyticsModule)
  module?: AnalyticsModule;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
