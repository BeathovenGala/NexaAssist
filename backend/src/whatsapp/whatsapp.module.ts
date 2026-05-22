import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSendProvider } from './whatsapp-send.provider';

@Module({
  imports: [PrismaModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppSendProvider],
  exports: [WhatsAppService, WhatsAppSendProvider],
})
export class WhatsAppModule {}
