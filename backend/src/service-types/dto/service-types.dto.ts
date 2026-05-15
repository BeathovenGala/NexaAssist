import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceTypeDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes!: number;

  @IsOptional()
  @IsString()
  colorCode?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(24 * 60)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  colorCode?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class ListServiceTypesQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  activeOnly?: boolean;
}
