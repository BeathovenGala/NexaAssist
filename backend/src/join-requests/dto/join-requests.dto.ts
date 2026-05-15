import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateJoinRequestDto {
  @IsString()
  @MinLength(1)
  tenantSlug!: string;
}

export class ListJoinRequestsQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
