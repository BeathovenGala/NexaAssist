import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import type {
  CreateBatchDto,
  CreateTemplateDto,
  MessageLogQueryDto,
  UpdateTemplateDto,
  WhatsAppCallbackDto,
} from './dto/whatsapp.dto';
import { WhatsAppService } from './whatsapp.service';

@Controller('whatsapp')
@UseGuards(RolesGuard, PermissionsGuard)
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Post('templates')
  @RequirePermissions('whatsapp:write')
  createTemplate(@CurrentUser() actor: AuthUser, @Body() dto: CreateTemplateDto) {
    return this.whatsapp.createTemplate(actor.tenantId!, dto);
  }

  @Get('templates')
  @RequirePermissions('whatsapp:read')
  listTemplates(@CurrentUser() actor: AuthUser) {
    return this.whatsapp.findTemplates(actor.tenantId!);
  }

  @Patch('templates/:id')
  @RequirePermissions('whatsapp:write')
  updateTemplate(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.whatsapp.updateTemplate(actor.tenantId!, id, dto);
  }

  @Post('batches')
  @RequirePermissions('whatsapp:write')
  createBatch(@CurrentUser() actor: AuthUser, @Body() dto: CreateBatchDto) {
    return this.whatsapp.createBatch(actor.tenantId!, dto);
  }

  @Get('batches')
  @RequirePermissions('whatsapp:read')
  listBatches(@CurrentUser() actor: AuthUser) {
    return this.whatsapp.findBatches(actor.tenantId!);
  }

  @Get('batches/:id')
  @RequirePermissions('whatsapp:read')
  getBatchStatus(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.whatsapp.getBatchStatus(actor.tenantId!, id);
  }

  @Post('batches/:id/retry')
  @RequirePermissions('whatsapp:write')
  retryFailed(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.whatsapp.retryFailed(actor.tenantId!, id);
  }

  @Get('messages')
  @RequirePermissions('whatsapp:read')
  getMessageLogs(@CurrentUser() actor: AuthUser, @Query() query: MessageLogQueryDto) {
    return this.whatsapp.getMessageLogs(actor.tenantId!, query);
  }

  @Post('callback')
  @Public()
  handleCallback(@Body() payload: WhatsAppCallbackDto) {
    return this.whatsapp.handleCallback(payload as unknown as Record<string, unknown>);
  }

  @Get('analytics')
  @RequirePermissions('whatsapp:read')
  getAnalytics(@CurrentUser() actor: AuthUser) {
    return this.whatsapp.getAnalytics(actor.tenantId!);
  }
}
