#!/usr/bin/env bash
set -e

echo "=== FitPlate Render Build ==="
pwd
ls -la

echo "=== Install workspace ==="
npx --yes pnpm@9.12.3 install --no-frozen-lockfile

echo "=== Setup database ==="

if [ -f "lib/db/package.json" ]; then
  echo "Found lib/db"

  if grep -q '"db:push"' lib/db/package.json; then
    echo "Running db:push in lib/db"
    cd lib/db
    npx --yes pnpm@9.12.3 run db:push
    cd ../..
  elif grep -q '"push"' lib/db/package.json; then
    echo "Running push in lib/db"
    cd lib/db
    npx --yes pnpm@9.12.3 run push
    cd ../..
  elif grep -q '"migrate"' lib/db/package.json; then
    echo "Running migrate in lib/db"
    cd lib/db
    npx --yes pnpm@9.12.3 run migrate
    cd ../..
  else
    echo "No db script found in lib/db/package.json"
  fi
fi

if [ -f "prisma/schema.prisma" ]; then
  echo "Found Prisma schema"
  npx --yes prisma generate
  npx --yes prisma db push
fi

if [ -f "artifacts/api-server/prisma/schema.prisma" ]; then
  echo "Found Prisma schema in api-server"
  cd artifacts/api-server
  npx --yes prisma generate
  npx --yes prisma db push
  cd ../..
fi

FRONTEND="artifacts/nutrition-coach"
BACKEND="artifacts/api-server"

echo "=== Build frontend ==="
cd "$FRONTEND"
BASE_PATH=/ npx --yes vite@7.0.3 build
cd ../..

echo "=== Copy frontend to backend/public ==="
mkdir -p "$BACKEND/public"
rm -rf "$BACKEND/public"/*

if [ -f "$FRONTEND/dist/public/index.html" ]; then
  cp -R "$FRONTEND/dist/public/"* "$BACKEND/public/"
elif [ -f "$FRONTEND/dist/index.html" ]; then
  cp -R "$FRONTEND/dist/"* "$BACKEND/public/"
else
  echo "ERROR: index.html not found"
  find "$FRONTEND" -maxdepth 6 -name index.html -print
  exit 1
fi

ls -la "$BACKEND/public"
test -f "$BACKEND/public/index.html"

echo "=== Build complete ==="
