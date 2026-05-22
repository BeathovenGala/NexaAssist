import { IsOptional, IsString, IsUrl } from 'class-validator';

export class QuickAuditDto {
  @IsUrl()
  url: string;
}

export class CreateSeoProjectDto {
  @IsString()
  name: string;

  @IsUrl()
  baseUrl: string;
}

export class UpdateSeoProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  baseUrl?: string;
}

export class SeoIssueFilterDto {
  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class SeoPageFilterDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class CompareScanDto {
  @IsString()
  scanId1: string;

  @IsString()
  scanId2: string;
}
