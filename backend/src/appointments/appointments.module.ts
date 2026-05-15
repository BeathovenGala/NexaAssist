import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { AppointmentEventsService } from './appointment-events.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [PrismaModule, AvailabilityModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentEventsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
