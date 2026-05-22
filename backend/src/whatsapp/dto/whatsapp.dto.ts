import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  variablesJson?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  variablesJson?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}

export class CreateBatchRecipientDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

export class CreateBatchDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsArray()
  recipients: CreateBatchRecipientDto[];

  @IsOptional()
  @IsString()
  defaultContent?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class MessageLogQueryDto {
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class WhatsAppCallbackDto {
  @IsString()
  messageId: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsObject()
  providerPayload?: Record<string, unknown>;
}
