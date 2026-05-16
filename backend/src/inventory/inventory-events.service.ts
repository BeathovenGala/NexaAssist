import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type InventoryDomainEvent =
  | {
      type: 'inventory.alert.created';
      payload: Record<string, unknown>;
    }
  | {
      type: 'inventory.request.created';
      payload: Record<string, unknown>;
    };

@Injectable()
export class InventoryEventsService extends EventEmitter {
  emitInventory(event: InventoryDomainEvent): void {
    this.emit(event.type, event.payload);
  }
}
