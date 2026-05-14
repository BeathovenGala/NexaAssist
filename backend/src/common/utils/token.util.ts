import { createHash, randomBytes } from 'crypto';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}
