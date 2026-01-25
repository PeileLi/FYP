#!/bin/bash

# Fabric Network Quick Start Script
# Author: FYP Project
# Date: 2026-01-25

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"
CHAINCODE_DIR="${PROJECT_ROOT}/chaincode"

echo -e "${GREEN}=================================================="
echo "  Fabric Network Quick Start"
echo -e "==================================================${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! docker ps >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Fabric network is already running
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Fabric network is already running${NC}"
    echo ""
    read -p "Do you want to restart the network? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing network..."
        cd "${TEST_NETWORK_DIR}"
        ./network.sh down
        echo -e "${GREEN}✅ Network stopped${NC}"
    else
        echo "Keeping existing network running..."
        SKIP_NETWORK=true
    fi
fi

# Start Fabric network
if [ "$SKIP_NETWORK" != "true" ]; then
    echo ""
    echo "Starting Fabric test network..."
    cd "${TEST_NETWORK_DIR}"
    
    ./network.sh up
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to start Fabric network${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Fabric network started${NC}"
    echo ""
    
    # Create channel
    echo "Creating channel..."
    ./network.sh createChannel
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create channel${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Channel created${NC}"
fi

# Check if chaincode is already deployed
echo ""
echo "Checking chaincode deployment..."
cd "${TEST_NETWORK_DIR}"

if ./network.sh peer lifecycle chaincode querycommitted -C mychannel -n donation >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Chaincode 'donation' is already deployed${NC}"
    echo ""
    read -p "Do you want to redeploy? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping chaincode deployment..."
        SKIP_CHAINCODE=true
    fi
fi

# Deploy chaincode
if [ "$SKIP_CHAINCODE" != "true" ]; then
    echo ""
    echo "Deploying chaincode..."
    cd "${CHAINCODE_DIR}"
    
    if [ ! -f "deploy.sh" ]; then
        echo -e "${RED}❌ deploy.sh not found in ${CHAINCODE_DIR}${NC}"
        exit 1
    fi
    
    chmod +x deploy.sh
    ./deploy.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to deploy chaincode${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Chaincode deployed${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=================================================="
echo "  ✅ Fabric Network Ready!"
echo -e "==================================================${NC}"
echo ""
echo "Network Status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(peer|orderer)"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Start the application:"
echo "     cd ${PROJECT_ROOT}"
echo "     docker compose up -d"
echo ""
echo "  2. Check backend logs:"
echo "     docker logs -f fyp-backend | grep Fabric"
echo ""
echo "  3. Access the application:"
echo "     Frontend: http://localhost:3000"
echo "     Backend:  http://localhost:8080"
echo ""
