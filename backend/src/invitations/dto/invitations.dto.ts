import { RoleName } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateInvitationDto {
  /** Required when the actor is SUPER_ADMIN (no tenant on JWT). */
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(RoleName)
  role!: RoleName;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  /** Required when the invitation has no email (e.g. phone-only invite). */
  @IsOptional()
  @IsEmail()
  email?: string;
}
