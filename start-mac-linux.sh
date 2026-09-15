#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "=============================================================="
echo "  Municipal Emergency Reporting App  -  local run"
echo "=============================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install the LTS from https://nodejs.org and run again."
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creating .env from .env.example"
  cp .env.example .env
fi

if command -v docker >/dev/null 2>&1; then
  echo "Starting the database with Docker..."
  docker compose up -d
  echo "Waiting for the database..."
  for i in $(seq 1 30); do
    if docker exec mera_db pg_isready -U mera_app -d mera >/dev/null 2>&1; then break; fi
    sleep 2
  done
else
  echo "Docker not found. Set DATABASE_URL in .env to your own Postgres, then run again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund
fi

echo "Preparing the database..."
npm run setup

echo "Starting the app on http://localhost:3000"
npm start
