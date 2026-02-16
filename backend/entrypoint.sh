#!/bin/sh
set -e

npm run prisma:migrate

if [ "$SEED_ON_START" = "true" ]; then
  npm run seed
fi

npm run start
