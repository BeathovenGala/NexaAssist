import { randomBytes } from 'node:crypto';

export function generateAppointmentCode(): string {
  return `APT-${randomBytes(4).toString('hex').toUpperCase()}`;
}
