import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type AppointmentDomainEvent =
  | { type: 'appointment.created'; payload: Record<string, unknown> }
  | { type: 'appointment.updated'; payload: Record<string, unknown> }
  | { type: 'appointment.confirmed'; payload: Record<string, unknown> }
  | { type: 'appointment.rejected'; payload: Record<string, unknown> }
  | { type: 'appointment.cancelled'; payload: Record<string, unknown> }
  | { type: 'appointment.rescheduled'; payload: Record<string, unknown> }
  | { type: 'appointment.completed'; payload: Record<string, unknown> };

@Injectable()
export class AppointmentEventsService extends EventEmitter {
  emitAppointment(event: AppointmentDomainEvent): void {
    this.emit(event.type, event.payload);
  }
}
