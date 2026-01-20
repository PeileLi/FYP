#!/bin/bash

# Chaincode Deployment Script
# Automatically deploys chaincode to Fabric test-network

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default parameters
CHAINCODE_NAME="${1:-donation}"
CHAINCODE_PATH="${2:-${PROJECT_ROOT}/chaincode}"
CHAINCODE_LANGUAGE="${3:-go}"
CHAINCODE_VERSION="${4:-1.0}"
CHAINCODE_SEQUENCE="${5:-1}"
CHANNEL_NAME="${6:-mychannel}"

# Fabric test-network directory
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"

echo -e "${GREEN}=================================================="
echo "  Chaincode Deployment Script"
echo -e "==================================================${NC}"
echo ""
echo "Configuration:"
echo "  Chaincode Name: ${CHAINCODE_NAME}"
echo "  Chaincode Path: ${CHAINCODE_PATH}"
echo "  Language: ${CHAINCODE_LANGUAGE}"
echo "  Version: ${CHAINCODE_VERSION}"
echo "  Sequence: ${CHAINCODE_SEQUENCE}"
echo "  Channel: ${CHANNEL_NAME}"
echo ""

# Check if test-network directory exists
if [ ! -d "${TEST_NETWORK_DIR}" ]; then
    echo -e "${RED}❌ Error: test-network directory not found at: ${TEST_NETWORK_DIR}${NC}"
    echo ""
    echo "Please ensure Fabric samples are installed:"
    echo "  cd fabric"
    echo "  curl -sSL https://bit.ly/2ysbOFE | bash -s"
    exit 1
fi

echo -e "${GREEN}✅ Found test-network directory${NC}"

# Check if chaincode directory exists
if [ ! -d "${CHAINCODE_PATH}" ]; then
    echo -e "${RED}❌ Error: Chaincode directory not found at: ${CHAINCODE_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found chaincode directory${NC}"

# Check if chaincode.go exists
if [ ! -f "${CHAINCODE_PATH}/chaincode.go" ]; then
    echo -e "${RED}❌ Error: chaincode.go not found in: ${CHAINCODE_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found chaincode.go${NC}"
echo ""

# Check if network is running
cd "${TEST_NETWORK_DIR}"

if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Fabric network is not running${NC}"
    echo ""
    echo "Starting Fabric network..."
    ./network.sh up createChannel -c "${CHANNEL_NAME}" -ca
    echo ""
    echo -e "${GREEN}✅ Network started successfully${NC}"
else
    echo -e "${GREEN}✅ Fabric network is running${NC}"
fi

echo ""

# Calculate relative path from test-network to chaincode
# This is needed because network.sh expects a relative path
RELATIVE_PATH=$(realpath --relative-to="${TEST_NETWORK_DIR}" "${CHAINCODE_PATH}")

echo "Deploying chaincode..."
echo "  Relative path from test-network: ${RELATIVE_PATH}"
echo ""

# Deploy chaincode
echo "Running: ./network.sh deployCC -ccn ${CHAINCODE_NAME} -ccp ${RELATIVE_PATH} -ccl ${CHAINCODE_LANGUAGE} -ccv ${CHAINCODE_VERSION} -ccs ${CHAINCODE_SEQUENCE}"
echo ""

./network.sh deployCC \
    -ccn "${CHAINCODE_NAME}" \
    -ccp "${RELATIVE_PATH}" \
    -ccl "${CHAINCODE_LANGUAGE}" \
    -ccv "${CHAINCODE_VERSION}" \
    -ccs "${CHAINCODE_SEQUENCE}"

echo ""
echo -e "${GREEN}=================================================="
echo "  ✅ Chaincode Deployed Successfully!"
echo -e "==================================================${NC}"
echo ""
echo "You can now test the chaincode with these commands:"
echo ""
echo "# Create a campaign"
echo "cd ${TEST_NETWORK_DIR}"
echo "./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
echo "  -ccic '{\"function\":\"CreateCampaign\",\"Args\":[\"CAMP001\",\"Alice\",\"2024-01-20T10:00:00\",\"Test Campaign\",\"AUTO_APPROVED\"]}'"
echo ""
echo "# Query a campaign"
echo "./network.sh cc query -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
echo "  -ccqc '{\"function\":\"ReadCampaign\",\"Args\":[\"CAMP001\"]}'"
echo ""
echo "# Create a donation"
echo "./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
echo "  -ccic '{\"function\":\"CreateDonation\",\"Args\":[\"DON001\",\"CAMP001\",\"100.50\",\"Bob\",\"2024-01-20T10:30:00\"]}'"
echo ""
echo "# Query a donation"
echo "./network.sh cc query -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
echo "  -ccqc '{\"function\":\"ReadDonation\",\"Args\":[\"DON001\"]}'"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Configure backend to connect to Fabric"
echo "  2. Start the backend: cd backend && mvn spring-boot:run"
echo "  3. Test the API endpoints"
echo ""
