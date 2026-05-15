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

@Module({
  imports: [PrismaModule],
  controllers: [InventoryController],
  providers: [
    InventoryMovementsService,
    InventoryCategoriesService,
    InventoryItemsService,
    InventoryRequestsService,
    InventoryAlertsService,
    InventoryTransactionsService,
    InventoryDashboardService,
  ],
})
export class InventoryModule {}
