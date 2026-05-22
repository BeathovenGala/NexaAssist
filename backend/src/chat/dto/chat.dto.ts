import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChatSessionDto {
  @IsOptional()
  @IsString()
  title?: string;
}

export class ListChatSessionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}

export class SendChatMessageDto {
  @IsString()
  @MinLength(1)
  content!: string;
}

export class StreamChatDto {
  @IsOptional()
  @IsUUID()
  assistantMessageId?: string;
}

export class SelectSlotDto {
  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}
