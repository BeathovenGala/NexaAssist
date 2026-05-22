#!/usr/bin/env node
/**
 * Prints random secrets for staging/production .env files.
 * Usage: node scripts/generate-staging-secrets.mjs
 */
import { randomBytes } from 'node:crypto';

function secret(bytes = 48) {
  return randomBytes(bytes).toString('base64url');
}

console.log('# Paste into backend/.env (staging/production) — do not commit real values');
console.log(`JWT_ACCESS_SECRET=${secret()}`);
console.log(`JWT_REFRESH_SECRET=${secret()}`);
console.log('');
