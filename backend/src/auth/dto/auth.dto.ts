import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  companyName!: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @IsOptional()
  @IsString()
  adminLastName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
