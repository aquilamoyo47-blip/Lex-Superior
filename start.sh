#!/bin/sh
set -e

echo "==> Running database migrations..."
pnpm --filter @workspace/db push || echo "Warning: migrations may have failed — continuing"

echo "==> Starting Lex Superior API..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
