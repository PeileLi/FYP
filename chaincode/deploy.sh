#!/usr/bin/env bash

# Chaincode deployment script for Hyperledger Fabric test network
# Usage: ./chaincode/deploy.sh [chaincode_name] [chaincode_path] [language] [version] [sequence] [channel_name]

set -e

# Default values
CC_NAME=${1:-"basic"}
CC_SRC_PATH=${2:-"../../../chaincode"}
CC_SRC_LANGUAGE=${3:-"go"}
CC_VERSION=${4:-"1.0"}
CC_SEQUENCE=${5:-"auto"}
CHANNEL_NAME=${6:-"mychannel"}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"
CHAINCODE_DIR="${PROJECT_ROOT}/chaincode"

echo -e "${GREEN}=== Chaincode Deployment Script ===${NC}"
echo "Chaincode Name: ${CC_NAME}"
echo "Chaincode Path: ${CC_SRC_PATH}"
echo "Language: ${CC_SRC_LANGUAGE}"
echo "Version: ${CC_VERSION}"
echo "Sequence: ${CC_SEQUENCE}"
echo "Channel: ${CHANNEL_NAME}"
echo ""

# Check if test-network directory exists
if [ ! -d "${TEST_NETWORK_DIR}" ]; then
    echo -e "${RED}Error: test-network directory not found at ${TEST_NETWORK_DIR}${NC}"
    exit 1
fi

# Check if chaincode directory exists
if [ ! -d "${CHAINCODE_DIR}" ]; then
    echo -e "${RED}Error: chaincode directory not found at ${CHAINCODE_DIR}${NC}"
    exit 1
fi

# Check if chaincode.go exists
if [ ! -f "${CHAINCODE_DIR}/chaincode.go" ]; then
    echo -e "${RED}Error: chaincode.go not found in ${CHAINCODE_DIR}${NC}"
    exit 1
fi

# Navigate to test-network directory
cd "${TEST_NETWORK_DIR}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if network is running
NETWORK_RUNNING=false
if docker ps | grep -q "peer0.org1.example.com"; then
    NETWORK_RUNNING=true
    echo -e "${GREEN}Network is already running${NC}"
else
    echo -e "${YELLOW}Network is not running. Starting network...${NC}"
    ./network.sh up createChannel -c "${CHANNEL_NAME}"
    NETWORK_RUNNING=true
fi

# Deploy chaincode
echo -e "${GREEN}Deploying chaincode...${NC}"

# If sequence is "auto", let the deployCC script handle it
# Otherwise use the specified sequence
if [ "${CC_SEQUENCE}" = "auto" ]; then
    echo -e "${YELLOW}Auto-detecting sequence number...${NC}"
    ./network.sh deployCC \
        -ccn "${CC_NAME}" \
        -ccp "${CC_SRC_PATH}" \
        -ccl "${CC_SRC_LANGUAGE}" \
        -ccv "${CC_VERSION}" \
        -ccs "auto" \
        -c "${CHANNEL_NAME}"
else
    ./network.sh deployCC \
        -ccn "${CC_NAME}" \
        -ccp "${CC_SRC_PATH}" \
        -ccl "${CC_SRC_LANGUAGE}" \
        -ccv "${CC_VERSION}" \
        -ccs "${CC_SEQUENCE}" \
        -c "${CHANNEL_NAME}"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Chaincode deployed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}=== Test Commands ===${NC}"
    echo ""
    echo "To query a project:"
    echo "  cd ${TEST_NETWORK_DIR}"
    echo "  ./network.sh cc query -c ${CHANNEL_NAME} -ccn ${CC_NAME} -ccqc '{\"function\":\"ReadProject\",\"Args\":[\"1\"]}'"
    echo ""
    echo "To create a project:"
    echo "  ./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CC_NAME} -ccic '{\"function\":\"CreateProject\",\"Args\":[\"1\",\"TestProject\",\"Description\",\"owner\"]}'"
    echo ""
    echo "To submit project for audit:"
    echo "  ./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CC_NAME} -ccic '{\"function\":\"SubmitForAudit\",\"Args\":[\"1\"]}'"
    echo ""
    echo "To audit a project (approve=true → GUARANTEED, approve=false → REJECTED):"
    echo "  ./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CC_NAME} -ccic '{\"function\":\"AuditProject\",\"Args\":[\"1\",\"auditor1\",\"true\",\"\"]}'"
    echo "  # Note: If approve=true, project automatically becomes GUARANTEED"
    echo ""
    echo "To publish a project (must be GUARANTEED):"
    echo "  ./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CC_NAME} -ccic '{\"function\":\"PublishProject\",\"Args\":[\"1\"]}'"
    echo ""
else
    echo -e "${RED}❌ Chaincode deployment failed!${NC}"
    exit 1
fi

