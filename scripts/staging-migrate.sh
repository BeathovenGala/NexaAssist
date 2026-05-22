#!/usr/bin/env sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required. Export it or set it in backend/.env" >&2
  exit 1
fi

cd "$(dirname "$0")/../backend"
npm ci
npx prisma generate
npx prisma migrate deploy
echo "Migrations applied successfully."
