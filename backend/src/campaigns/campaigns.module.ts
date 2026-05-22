import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CampaignAiService } from './campaign-ai.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignAiService],
  exports: [CampaignsService, CampaignAiService],
})
export class CampaignsModule {}
