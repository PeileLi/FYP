#!/bin/bash

# Complete Restart Script
# Safely restarts all services

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${GREEN}=================================================="
echo "  Restarting All Services"
echo -e "==================================================${NC}"
echo ""

# Stop everything first
echo "Step 1: Stopping all services..."
"${SCRIPT_DIR}/stop-all.sh"

echo ""
echo "Waiting 5 seconds..."
sleep 5

# Start everything
echo ""
echo "Step 2: Starting Fabric network..."
"${SCRIPT_DIR}/start-fabric.sh"

echo ""
echo "Step 3: Starting application..."
cd "$(dirname "${SCRIPT_DIR}")"
docker compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check status
echo ""
echo -e "${GREEN}=================================================="
echo "  Current Status"
echo -e "==================================================${NC}"
echo ""
echo "All containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN}✅ Restart complete!${NC}"
echo ""
echo "Check logs:"
echo "  docker logs -f fyp-backend"
echo "  docker logs -f fyp-frontend"
echo ""
