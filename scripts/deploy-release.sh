#!/bin/sh
set -e

echo "Running Prisma db push for MongoDB..."

npx prisma db push --skip-generate

echo "Database schema sync complete"
