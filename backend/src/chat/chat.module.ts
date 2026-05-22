import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AvailabilityModule } from '../availability/availability.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { ChatAuditService } from './chat-audit.service';
import { ChatAgentService } from './chat-agent.service';
import { ChatSuggestionsService } from './chat-suggestions.service';
import { ChatSseController } from './chat-sse.controller';
import { ChatToolExecutorService } from './chat-tool-executor.service';
import { ChatToolRegistryService } from './chat-tool-registry.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import { IntentClassifierService } from './intent-classifier.service';
import { OpenRouterService } from './openrouter.service';
import { ResponseComposerService } from './response-composer.service';
import { SlotFillerService } from './slot-filler.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Module({
  imports: [
    PrismaModule,
    AppointmentsModule,
    AvailabilityModule,
    InventoryModule,
    UsersModule,
    InvitationsModule,
  ],
  controllers: [ChatController, ChatSseController],
  providers: [
    ChatService,
    ChatAuditService,
    ChatAgentService,
    ChatSuggestionsService,
    ChatToolRegistryService,
    ChatToolExecutorService,
    SlotFillerService,
    WorkflowEngineService,
    IntentClassifierService,
    OpenRouterService,
    ResponseComposerService,
    ConversationOrchestratorService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
