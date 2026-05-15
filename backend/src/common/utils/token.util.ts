import { createHash, randomBytes } from 'crypto';

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

/** Opaque invite token (store only SHA-256 hash in DB). */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}
