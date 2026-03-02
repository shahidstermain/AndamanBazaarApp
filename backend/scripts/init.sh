#!/bin/sh
set -e

echo "Generating Prisma client..."
npm run prisma:generate

echo "Running Prisma migrations..."
npm run prisma:migrate:deploy

echo "Seeding database..."
npm run prisma:seed

echo "Starting backend..."
if [ "$NODE_ENV" = "production" ]; then
  npm run build
  npm run start
else
  npm run dev
fi
