#!/usr/bin/env bash
set -e

echo "=== FitPlate Render Build ==="
pwd
ls -la

npx --yes pnpm@9.12.3 install --no-frozen-lockfile

FRONTEND="artifacts/nutrition-coach"
BACKEND="artifacts/api-server"

echo "=== Check folders ==="
test -d "$FRONTEND"
test -d "$BACKEND"

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

node patch-index.mjs
