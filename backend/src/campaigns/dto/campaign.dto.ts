import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CampaignAudienceType,
  CampaignChannel,
  CampaignObjective,
} from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsEnum(CampaignObjective)
  objective: CampaignObjective;

  @IsOptional()
  @IsEnum(CampaignAudienceType)
  audienceType?: CampaignAudienceType;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;

  @IsOptional()
  @IsEnum(CampaignAudienceType)
  audienceType?: CampaignAudienceType;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export enum CampaignApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export class ApproveRejectCampaignDto {
  @IsEnum(CampaignApprovalAction)
  action: CampaignApprovalAction;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ScheduleCampaignDto {
  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsArray()
  @IsEnum(CampaignChannel, { each: true })
  channels: CampaignChannel[];
}

export class GenerateCopyDto {
  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  audienceType?: string;
}

export class GeneratePosterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  copy?: string;

  @IsOptional()
  @IsString()
  imageDescription?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  /** Pre-built image prompt from a prior step or user edit — skips LLM expansion. */
  @IsOptional()
  @IsString()
  imagePrompt?: string;
}

export class QuickGenerateDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  audienceType?: string;
}

export class StructuredCampaignResponseDto {
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
  posterUrl: string;
}

export class ListCampaignsQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
