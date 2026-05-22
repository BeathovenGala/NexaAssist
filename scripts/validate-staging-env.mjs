#!/usr/bin/env node
/**
 * Checks required env vars for staging API deploy (read from process.env).
 * Usage: export vars then `node scripts/validate-staging-env.mjs`
 */
const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'FRONTEND_ORIGIN',
];

const warnings = [
  ['OPENROUTER_API_KEY', 'AI features disabled without key'],
  ['SMTP_HOST', 'Emails log to worker console only'],
  ['WHATSAPP_ACCESS_TOKEN', 'WhatsApp sends will be simulated'],
];

let failed = false;
for (const key of required) {
  const val = process.env[key];
  if (!val || val.includes('change-me')) {
    console.error(`MISSING or placeholder: ${key}`);
    failed = true;
  } else {
    console.log(`OK ${key}`);
  }
}

for (const [key, note] of warnings) {
  if (!process.env[key]) {
    console.warn(`WARN ${key}: ${note}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log('Staging env validation passed.');
