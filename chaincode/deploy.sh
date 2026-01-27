#!/bin/bash

# Chaincode Deployment Script
# Automatically handles existing chaincode and version management

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory (works on both Linux and macOS)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default parameters
CHAINCODE_NAME="${1:-donation}"
CHAINCODE_PATH="${2:-${PROJECT_ROOT}/chaincode}"
CHAINCODE_LANGUAGE="${3:-go}"
CHANNEL_NAME="${4:-mychannel}"

# Fabric test-network directory
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"

# Version file to track deployment history
VERSION_FILE="${SCRIPT_DIR}/.chaincode_version"

# Log file to store deployment output
DEPLOY_LOG="${PROJECT_ROOT}/logs/chaincode-deploy.log"

# Create logs directory if it doesn't exist
mkdir -p "${PROJECT_ROOT}/logs"

# Function to read current version info
read_version_info() {
    if [ -f "${VERSION_FILE}" ]; then
        source "${VERSION_FILE}"
        echo "${CURRENT_VERSION:-1.0}:${CURRENT_SEQUENCE:-1}"
    else
        echo "1.0:1"
    fi
}

# Function to save version info
save_version_info() {
    local version=$1
    local sequence=$2
    cat > "${VERSION_FILE}" <<EOF
# Chaincode version tracking file
# This file is automatically managed by deploy.sh
CURRENT_VERSION="${version}"
CURRENT_SEQUENCE=${sequence}
LAST_DEPLOY_TIME="$(date '+%Y-%m-%d %H:%M:%S')"
EOF
    echo -e "${GREEN}✅ Version info saved: ${version} (sequence: ${sequence})${NC}"
}

# Function to increment version
increment_version() {
    local current_version=$1
    local major=$(echo "${current_version}" | cut -d. -f1)
    local minor=$(echo "${current_version}" | cut -d. -f2)
    
    # Increment minor version
    minor=$((minor + 1))
    echo "${major}.${minor}"
}

echo ""
echo -e "${BLUE}=================================================="
echo "  Chaincode Deployment Script"
echo -e "==================================================${NC}"
echo ""
echo "Configuration:"
echo "  Chaincode Name: ${CHAINCODE_NAME}"
echo "  Chaincode Path: ${CHAINCODE_PATH}"
echo "  Language: ${CHAINCODE_LANGUAGE}"
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

# Check if chaincode directory exists
if [ ! -d "${CHAINCODE_PATH}" ]; then
    echo -e "${RED}❌ Error: Chaincode directory not found at: ${CHAINCODE_PATH}${NC}"
    exit 1
fi

# Check if chaincode.go exists
if [ ! -f "${CHAINCODE_PATH}/chaincode.go" ]; then
    echo -e "${RED}❌ Error: chaincode.go not found in: ${CHAINCODE_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites checked${NC}"
echo ""

# Check if network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Fabric network is not running${NC}"
    echo ""
    read -p "Do you want to start the Fabric network? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "${TEST_NETWORK_DIR}"
        ./network.sh up createChannel -c "${CHANNEL_NAME}"
        echo ""
        echo -e "${GREEN}✅ Network started successfully${NC}"
    else
        echo -e "${RED}❌ Cannot deploy chaincode without running network${NC}"
        exit 1
    fi
fi

cd "${TEST_NETWORK_DIR}"

# Read current version info
VERSION_INFO=$(read_version_info)
CURRENT_VERSION=$(echo "${VERSION_INFO}" | cut -d: -f1)
CURRENT_SEQUENCE=$(echo "${VERSION_INFO}" | cut -d: -f2)

echo -e "${BLUE}Current version info:${NC}"
echo "  Version: ${CURRENT_VERSION}"
echo "  Sequence: ${CURRENT_SEQUENCE}"
echo ""

# Check if chaincode is already running
if docker ps --format "{{.Names}}" | grep -q "dev-peer.*-${CHAINCODE_NAME}"; then
    echo -e "${YELLOW}⚠️  Chaincode containers already exist${NC}"
    echo "  Existing chaincode will be upgraded automatically"
    echo ""
    
    # Upgrade mode: increment version and sequence automatically
    echo -e "${BLUE}Upgrading chaincode...${NC}"
    
    # Stop old chaincode containers
    echo "Stopping old chaincode containers..."
    docker ps -a --format "{{.Names}}" | grep "dev-peer.*-${CHAINCODE_NAME}" | xargs -r docker rm -f 2>/dev/null || true
    
    # Remove old chaincode images
    echo "Removing old chaincode images..."
    docker images --format "{{.Repository}}:{{.Tag}}" | grep "dev-peer.*-${CHAINCODE_NAME}" | xargs -r docker rmi -f 2>/dev/null || true
    
    # Increment version and sequence
    CHAINCODE_VERSION=$(increment_version "${CURRENT_VERSION}")
    CHAINCODE_SEQUENCE=$((CURRENT_SEQUENCE + 1))
    
    echo -e "${GREEN}✅ Old chaincode cleaned up${NC}"
    echo "  New Version: ${CHAINCODE_VERSION}"
    echo "  New Sequence: ${CHAINCODE_SEQUENCE}"
    echo ""
else
    # Check if this is truly first deployment
    if [ -f "${VERSION_FILE}" ]; then
        # Version file exists, so increment for new deployment
        CHAINCODE_VERSION=$(increment_version "${CURRENT_VERSION}")
        CHAINCODE_SEQUENCE=$((CURRENT_SEQUENCE + 1))
        echo -e "${BLUE}Redeploying chaincode with new version${NC}"
    else
        # First deployment ever
        CHAINCODE_VERSION="1.0"
        CHAINCODE_SEQUENCE="1"
        echo -e "${BLUE}First-time deployment${NC}"
    fi
    echo "  Version: ${CHAINCODE_VERSION}"
    echo "  Sequence: ${CHAINCODE_SEQUENCE}"
    echo ""
fi

# Remove old package file
rm -f ${CHAINCODE_NAME}.tar.gz

# Calculate relative path (compatible with Linux and macOS)
# Test if realpath supports --relative-to option (GNU version)
if realpath --relative-to=. . >/dev/null 2>&1; then
    # GNU realpath with --relative-to support (Linux)
    RELATIVE_PATH=$(realpath --relative-to="${TEST_NETWORK_DIR}" "${CHAINCODE_PATH}")
else
    # macOS or systems without GNU realpath - use Python fallback
    RELATIVE_PATH=$(python3 -c "import os.path; print(os.path.relpath('${CHAINCODE_PATH}', '${TEST_NETWORK_DIR}'))")
fi

echo "Deploying chaincode..."
echo "  Relative path: ${RELATIVE_PATH}"
echo "  Version: ${CHAINCODE_VERSION}"
echo "  Sequence: ${CHAINCODE_SEQUENCE}"
echo ""

# Deploy chaincode
echo -e "${BLUE}Running deployment command...${NC}"
echo ""

if ./network.sh deployCC \
    -ccn "${CHAINCODE_NAME}" \
    -ccp "${RELATIVE_PATH}" \
    -ccl "${CHAINCODE_LANGUAGE}" \
    -ccv "${CHAINCODE_VERSION}" \
    -ccs "${CHAINCODE_SEQUENCE}" 2>&1 | tee "${DEPLOY_LOG}"; then
    
    # Save version info on successful deployment
    save_version_info "${CHAINCODE_VERSION}" "${CHAINCODE_SEQUENCE}"
    
    echo ""
    echo -e "${GREEN}=================================================="
    echo "  ✅ Chaincode Deployed Successfully!"
    echo -e "==================================================${NC}"
    echo ""
    echo "Deployment Details:"
    echo "  Name: ${CHAINCODE_NAME}"
    echo "  Version: ${CHAINCODE_VERSION}"
    echo "  Sequence: ${CHAINCODE_SEQUENCE}"
    echo "  Channel: ${CHANNEL_NAME}"
    echo ""
    
    # Wait for chaincode container to start
    echo "Waiting for chaincode container to start..."
    sleep 3
    
    # Verify chaincode is running
    if docker ps --format "{{.Names}}" | grep -q "dev-peer.*-${CHAINCODE_NAME}"; then
        echo -e "${GREEN}✅ Chaincode container is running${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep "dev-peer.*-${CHAINCODE_NAME}"
    else
        echo -e "${YELLOW}⚠️  Chaincode container not found (it will start on first invocation)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Test Commands:${NC}"
    echo ""
    echo "# Create a campaign"
    echo "cd ${TEST_NETWORK_DIR}"
    echo "./network.sh cc invoke -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
    echo "  -ccic '{\"function\":\"CreateCampaign\",\"Args\":[\"CAMP001\",\"Alice\",\"2024-01-25T10:00:00\",\"Medical Aid for Alice\",\"AUTO_APPROVED\"]}'"
    echo ""
    echo "# Query a campaign"
    echo "./network.sh cc query -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
    echo "  -ccqc '{\"function\":\"ReadCampaign\",\"Args\":[\"CAMP001\"]}'"
    echo ""
    echo "# Query all campaigns"
    echo "./network.sh cc query -c ${CHANNEL_NAME} -ccn ${CHAINCODE_NAME} \\"
    echo "  -ccqc '{\"function\":\"QueryCampaignsByInitiator\",\"Args\":[\"Alice\"]}'"
    echo ""
    echo -e "${GREEN}Next Steps:${NC}"
    echo "  1. Start backend: docker compose up -d"
    echo "  2. Check backend logs: docker logs -f fyp-backend"
    echo "  3. Test API at: http://localhost:8080"
    echo ""
    
else
    echo ""
    echo -e "${RED}=================================================="
    echo "  ❌ Chaincode Deployment Failed!"
    echo -e "==================================================${NC}"
    echo ""
    echo "Check the error messages above."
    echo "Deployment log saved to: ${DEPLOY_LOG}"
    echo ""
    echo -e "${YELLOW}Common Solutions:${NC}"
    echo ""
    echo "1. Clean up and retry:"
    echo "   cd ${TEST_NETWORK_DIR}"
    echo "   ./network.sh down"
    echo "   docker network prune -f"
    echo "   ./network.sh up createChannel"
    echo "   cd ${SCRIPT_DIR}"
    echo "   ./deploy.sh"
    echo ""
    echo "2. Check chaincode syntax:"
    echo "   cd ${CHAINCODE_PATH}"
    echo "   go mod tidy"
    echo "   go mod vendor"
    echo ""
    exit 1
fi
