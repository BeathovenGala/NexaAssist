import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { SeoCrawlerService } from './seo-crawler.service';
import { SeoLlmAuditService } from './seo-llm-audit.service';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [PrismaModule],
  controllers: [SeoController],
  providers: [SeoService, SeoCrawlerService, SeoAnalyzerService, SeoLlmAuditService],
  exports: [SeoService, SeoCrawlerService, SeoAnalyzerService, SeoLlmAuditService],
})
export class SeoModule {}
