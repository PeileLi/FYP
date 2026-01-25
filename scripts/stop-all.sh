#!/bin/bash

# Complete Stop Script for FYP Project
# Stops all services including Fabric network

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"

echo -e "${YELLOW}=================================================="
echo "  Stopping All Services"
echo -e "==================================================${NC}"
echo ""

# Stop application services
echo "Stopping application services..."
cd "${PROJECT_ROOT}"

if docker compose ps -q >/dev/null 2>&1; then
    docker compose down
    echo -e "${GREEN}✅ Application services stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No application services running${NC}"
fi

# Stop Fabric network
echo ""
echo "Stopping Fabric network..."
cd "${TEST_NETWORK_DIR}"

if docker ps | grep -q -E "(peer|orderer)"; then
    ./network.sh down
    echo -e "${GREEN}✅ Fabric network stopped${NC}"
else
    echo -e "${YELLOW}⚠️  Fabric network not running${NC}"
fi

# Optional cleanup
echo ""
read -p "Do you want to clean up Docker networks and volumes? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning up Docker resources..."
    docker network prune -f
    echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

echo ""
echo -e "${GREEN}=================================================="
echo "  ✅ All Services Stopped"
echo -e "==================================================${NC}"
echo ""
echo "To restart, run:"
echo "  ./scripts/start-fabric.sh"
echo "  docker compose up -d"
echo ""
