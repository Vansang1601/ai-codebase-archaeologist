#!/usr/bin/env bash
# =============================================================================
# Automated Production Deployment Script for AI Codebase Archaeologist
# Usage: ./deploy.sh [--prod | --dev]
# =============================================================================
set -euo pipefail

MODE="${1:---dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================"
echo "  AI Codebase Archaeologist - Production Deployer"
echo "======================================================"

# 1. Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "[ERROR] Docker is not installed."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "[ERROR] Docker Compose v2 is not installed."; exit 1; }

# 2. Check .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "[INFO] No .env found. Copying from .env.example..."
        cp .env.example .env
        RANDOM_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))" 2>/dev/null || openssl rand -base64 36)
        sed -i.bak "s/AUTH_SECRET=.*/AUTH_SECRET=${RANDOM_SECRET}/" .env && rm -f .env.bak
        echo "[INFO] Generated new secure AUTH_SECRET in .env."
    else
        echo "[ERROR] Neither .env nor .env.example found."; exit 1;
    fi
fi

# 3. Choose compose file based on mode
if [ "$MODE" == "--prod" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "[MODE] Production deployment with Caddy reverse proxy & HTTPS ($COMPOSE_FILE)"
else
    COMPOSE_FILE="docker-compose.yml"
    echo "[MODE] Standard deployment ($COMPOSE_FILE)"
fi

# 4. Build containers
echo "[STEP 1/4] Building container images..."
docker compose -f "$COMPOSE_FILE" build

# 5. Start database and wait for health
echo "[STEP 2/4] Starting PostgreSQL database..."
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "[INFO] Waiting for PostgreSQL to be healthy..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U archaeologist -d archaeologist >/dev/null 2>&1; do
    sleep 2
done
echo "[INFO] PostgreSQL is healthy."

# 6. Apply database migrations
echo "[STEP 3/4] Applying SQL migrations..."
for migration in backend/migrations/*.sql; do
    if [ -f "$migration" ]; then
        echo "  -> Applying $(basename "$migration")..."
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U archaeologist -d archaeologist < "$migration" >/dev/null 2>&1 || true
    fi
done

# 7. Start all services
echo "[STEP 4/4] Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

# 8. Check health
echo "======================================================"
echo "  Deployment Complete! Checking service status..."
echo "======================================================"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "Endpoints:"
if [ "$MODE" == "--prod" ]; then
    echo "  - Web & API: https://\${DOMAIN:-localhost}"
else
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:8000"
    echo "  - API Health: http://localhost:8000/health"
    echo "  - API Docs: http://localhost:8000/docs"
fi
echo "======================================================"
