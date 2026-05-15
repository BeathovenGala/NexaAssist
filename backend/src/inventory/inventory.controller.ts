import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import {
  ApproveRequestDto,
  CreateCategoryDto,
  CreateItemDto,
  CreateItemMovementDto,
  CreateRestockRequestDto,
  CreateTransactionDto,
  FulfillRequestDto,
  ListAlertsQueryDto,
  ListItemsQueryDto,
  ListMovementsQueryDto,
  ListRequestsQueryDto,
  ListTransactionsQueryDto,
  MovementAdjustDto,
  MovementInDto,
  MovementOutDto,
  RejectRequestDto,
  UpdateCategoryDto,
  UpdateItemDto,
} from './dto/inventory.dto';
import { InventoryAlertsService } from './inventory-alerts.service';
import { InventoryCategoriesService } from './inventory-categories.service';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryMovementsService } from './inventory-movements.service';
import { InventoryRequestsService } from './inventory-requests.service';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { resolveInventoryTenantId } from './inventory-tenant.util';

@Controller('inventory')
@UseGuards(RolesGuard, PermissionsGuard)
export class InventoryController {
  constructor(
    private readonly dashboard: InventoryDashboardService,
    private readonly categories: InventoryCategoriesService,
    private readonly items: InventoryItemsService,
    private readonly movements: InventoryMovementsService,
    private readonly requests: InventoryRequestsService,
    private readonly alerts: InventoryAlertsService,
    private readonly transactions: InventoryTransactionsService,
  ) {}

  @Get('dashboard')
  @RequirePermissions('inventory:read')
  getDashboard(@CurrentUser() actor: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.dashboard.get(actor, tenantId);
  }

  @Get('categories')
  @RequirePermissions('inventory:read')
  listCategories(@CurrentUser() actor: AuthUser, @Query('tenantId') tenantId?: string) {
    return this.categories.list(actor, tenantId);
  }

  @Post('categories')
  @RequirePermissions('inventory:write')
  createCategory(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateCategoryDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.categories.create(actor, dto, tenantId);
  }

  @Patch('categories/:id')
  @RequirePermissions('inventory:write')
  updateCategory(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.categories.update(actor, id, dto, tenantId);
  }

  @Delete('categories/:id')
  @RequirePermissions('inventory:write')
  removeCategory(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.categories.remove(actor, id, tenantId);
  }

  @Get('items')
  @RequirePermissions('inventory:read')
  listItems(@CurrentUser() actor: AuthUser, @Query() query: ListItemsQueryDto) {
    return this.items.list(actor, query);
  }

  @Post('items')
  @RequirePermissions('inventory:write')
  createItem(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateItemDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.items.create(actor, dto, tenantId);
  }

  @Get('items/:id')
  @RequirePermissions('inventory:read')
  getItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.items.findOne(actor, id, tenantId);
  }

  @Patch('items/:id')
  @RequirePermissions('inventory:write')
  updateItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.items.update(actor, id, dto, tenantId);
  }

  @Delete('items/:id')
  @RequirePermissions('inventory:write')
  removeItem(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.items.remove(actor, id, tenantId);
  }

  @Get('items/:id/movements')
  @RequirePermissions('inventory:read')
  listItemMovements(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.items.listMovementsForItem(actor, id, {
      tenantId,
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
    });
  }

  @Post('items/:id/movements')
  @RequirePermissions('inventory:read')
  createItemMovement(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateItemMovementDto,
    @Query('tenantId') tenantId?: string,
  ) {
    if (dto.direction === 'IN' && !actor.permissions.includes('inventory:write')) {
      throw new ForbiddenException('Missing inventory:write permission');
    }
    if (dto.direction === 'OUT' && !actor.permissions.includes('inventory:consume')) {
      throw new ForbiddenException('Missing inventory:consume permission');
    }
    if (dto.direction === 'IN') {
      return this.movements.recordIn(actor, tenantId, {
        itemId: id,
        quantity: dto.quantity,
        reason: dto.reason,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        locationId: dto.locationId,
      });
    }
    return this.movements.recordOut(actor, tenantId, {
      itemId: id,
      quantity: dto.quantity,
      reason: dto.reason,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      locationId: dto.locationId,
    });
  }

  @Get('movements')
  @RequirePermissions('inventory:read')
  async listMovements(
    @CurrentUser() actor: AuthUser,
    @Query() query: ListMovementsQueryDto,
  ) {
    const tenantId = resolveInventoryTenantId(actor, query.tenantId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? 25, 100);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    return this.movements.list(tenantId, {
      skip,
      take,
      itemId: query.itemId,
      movementType: query.movementType,
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
    });
  }

  @Post('movements/in')
  @RequirePermissions('inventory:write')
  movementIn(
    @CurrentUser() actor: AuthUser,
    @Body() dto: MovementInDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.movements.recordIn(actor, tenantId, {
      itemId: dto.itemId,
      quantity: dto.quantity,
      reason: dto.reason,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      locationId: dto.locationId,
    });
  }

  @Post('movements/out')
  @RequirePermissions('inventory:consume')
  movementOut(
    @CurrentUser() actor: AuthUser,
    @Body() dto: MovementOutDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.movements.recordOut(actor, tenantId, {
      itemId: dto.itemId,
      quantity: dto.quantity,
      reason: dto.reason,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      locationId: dto.locationId,
    });
  }

  @Post('movements/adjust')
  @RequirePermissions('inventory:adjust')
  movementAdjust(
    @CurrentUser() actor: AuthUser,
    @Body() dto: MovementAdjustDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.movements.recordAdjust(actor, tenantId, {
      itemId: dto.itemId,
      newQuantity: dto.newQuantity,
      reason: dto.reason,
      locationId: dto.locationId,
    });
  }

  @Get('requests')
  @RequirePermissions('inventory:read')
  listRequests(@CurrentUser() actor: AuthUser, @Query() query: ListRequestsQueryDto) {
    return this.requests.list(actor, query);
  }

  @Post('requests')
  @RequirePermissions('inventory:request')
  createRequest(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateRestockRequestDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requests.create(actor, dto, tenantId);
  }

  @Patch('requests/:id/approve')
  @RequirePermissions('inventory:approve')
  approveRequest(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveRequestDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requests.approve(actor, id, dto, tenantId);
  }

  @Patch('requests/:id/reject')
  @RequirePermissions('inventory:approve')
  rejectRequest(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectRequestDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requests.reject(actor, id, dto, tenantId);
  }

  @Patch('requests/:id/fulfill')
  @RequirePermissions('inventory:approve')
  fulfillRequest(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: FulfillRequestDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.requests.fulfill(actor, id, dto, tenantId);
  }

  @Get('alerts')
  @RequirePermissions('inventory:read')
  listAlerts(@CurrentUser() actor: AuthUser, @Query() query: ListAlertsQueryDto) {
    return this.alerts.list(actor, query);
  }

  @Patch('alerts/:id/acknowledge')
  @RequirePermissions('inventory:alerts')
  acknowledgeAlert(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.alerts.acknowledge(actor, id, tenantId);
  }

  @Patch('alerts/:id/resolve')
  @RequirePermissions('inventory:alerts')
  resolveAlert(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.alerts.resolve(actor, id, tenantId);
  }

  @Patch('alerts/:id/read')
  @RequirePermissions('inventory:read')
  markAlertRead(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.alerts.markRead(actor, id, tenantId);
  }

  @Get('transactions')
  @RequirePermissions('inventory:read')
  listTransactions(@CurrentUser() actor: AuthUser, @Query() query: ListTransactionsQueryDto) {
    return this.transactions.list(actor, query);
  }

  @Post('transactions')
  @RequirePermissions('inventory:write')
  createTransaction(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateTransactionDto,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.transactions.create(actor, dto, tenantId);
  }

  @Get('transactions/:id')
  @RequirePermissions('inventory:read')
  getTransaction(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.transactions.findOne(actor, id, tenantId);
  }
}
