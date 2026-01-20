#!/usr/bin/env bash

# Fabric Network Startup and Chaincode Deployment Script
# This script starts the Fabric network and deploys the donation chaincode

set -e

# Set Docker socket path
export DOCKER_SOCK=/var/run/docker.sock

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric-samples/test-network"
CHAINCODE_DIR="${PROJECT_ROOT}/chaincode"

echo -e "${BLUE}=== Fabric Network Startup Script ===${NC}"
echo ""

# Check if test-network directory exists
if [ ! -d "${TEST_NETWORK_DIR}" ]; then
    echo -e "${RED}Error: test-network directory not found at ${TEST_NETWORK_DIR}${NC}"
    echo "Please make sure fabric-samples is properly installed."
    exit 1
fi

# Check if chaincode directory exists
if [ ! -d "${CHAINCODE_DIR}" ]; then
    echo -e "${RED}Error: chaincode directory not found at ${CHAINCODE_DIR}${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

cd "${TEST_NETWORK_DIR}"

# Check if network is already running
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}Network is already running. Stopping it first...${NC}"
    ./network.sh down
    echo ""
fi

# Start the network
echo -e "${GREEN}Step 1: Starting Fabric network and creating channel...${NC}"
./network.sh up createChannel -c mychannel -ca

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start network${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Step 2: Deploying chaincode...${NC}"

# Deploy chaincode
./network.sh deployCC \
    -ccn donation \
    -ccp ../../../chaincode \
    -ccl go \
    -ccv 1.0 \
    -ccs 1 \
    -c mychannel

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to deploy chaincode${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Fabric network started and chaincode deployed successfully!${NC}"
echo ""

# Print certificate paths
echo -e "${YELLOW}=== Fabric Credentials Paths ===${NC}"
echo ""
echo -e "${BLUE}User Certificate:${NC}"
CERT_PATH="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem"
echo "$CERT_PATH"
echo ""

echo -e "${BLUE}User Private Key:${NC}"
KEY_DIR="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore"
KEY_FILE=$(ls $KEY_DIR/*_sk 2>/dev/null | head -n 1)
if [ -n "$KEY_FILE" ]; then
    echo "$KEY_FILE"
else
    echo -e "${YELLOW}Key file not found in $KEY_DIR${NC}"
fi
echo ""

echo -e "${BLUE}TLS Certificate:${NC}"
TLS_CERT_PATH="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
echo "$TLS_CERT_PATH"
echo ""

# Generate .env configuration
echo -e "${YELLOW}=== Generating .env configuration ===${NC}"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

# Check if key file exists
if [ -n "$KEY_FILE" ]; then
    cat > "$ENV_FILE" << EOF
# Auto-generated Fabric configuration
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=donation
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com
FABRIC_CERT_PATH=${CERT_PATH}
FABRIC_KEY_PATH=${KEY_FILE}
FABRIC_TLS_CERT_PATH=${TLS_CERT_PATH}
EOF
    echo -e "${GREEN}✅ .env file created at ${ENV_FILE}${NC}"
else
    echo -e "${RED}Could not find private key file. Please manually configure .env${NC}"
fi

echo ""
echo -e "${YELLOW}=== Next Steps ===${NC}"
echo ""
echo "1. Review the generated .env file:"
echo "   cat backend/.env"
echo ""
echo "2. Test the chaincode (optional):"
echo "   cd ${TEST_NETWORK_DIR}"
echo "   ./network.sh cc invoke -c mychannel -ccn donation -ccic '{\"function\":\"CreateCampaign\",\"Args\":[\"test1\",\"user@example.com\",\"2024-01-01T00:00:00\",\"Test Campaign\",\"\"]}'"
echo ""
echo "3. Start the backend (from project root):"
echo "   cd ${PROJECT_ROOT}/backend"
echo "   mvn spring-boot:run"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
