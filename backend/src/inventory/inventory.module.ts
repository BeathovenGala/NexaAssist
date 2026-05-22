import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryAlertsService } from './inventory-alerts.service';
import { InventoryCategoriesService } from './inventory-categories.service';
import { InventoryController } from './inventory.controller';
import { InventoryDashboardService } from './inventory-dashboard.service';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryMovementsService } from './inventory-movements.service';
import { InventoryRequestsService } from './inventory-requests.service';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { InventoryEventsService } from './inventory-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryEventsService,
    InventoryMovementsService,
    InventoryCategoriesService,
    InventoryItemsService,
    InventoryRequestsService,
    InventoryAlertsService,
    InventoryTransactionsService,
    InventoryDashboardService,
  ],
  exports: [
    InventoryEventsService,
    InventoryRequestsService,
    InventoryMovementsService,
    InventoryItemsService,
  ],
})
export class InventoryModule {}
