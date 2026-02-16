#!/bin/sh
set -e

npm run prisma:migrate

if [ "$SEED_ON_START" = "true" ]; then
  node dist/seed.js
fi

npm run start
