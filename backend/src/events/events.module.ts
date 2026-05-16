import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DomainEventsListener } from './domain-events.listener';

@Module({
  imports: [AppointmentsModule, InventoryModule],
  providers: [DomainEventsListener],
})
export class EventsModule {}
