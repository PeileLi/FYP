#!/bin/bash

# Chaincode Deployment Script
# Uses peer lifecycle commands directly; queries the actual committed sequence
# from the network so the version file never drifts out of sync.
# Supports fresh deployment AND upgrade.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CHAINCODE_NAME="${1:-donation}"
CHANNEL_NAME="${2:-mychannel}"
CHAINCODE_PATH="${SCRIPT_DIR}"
CHAINCODE_LANGUAGE="golang"

TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric/fabric-samples/test-network"
FABRIC_BIN="${PROJECT_ROOT}/fabric/fabric-samples/bin"
FABRIC_CFG="${PROJECT_ROOT}/fabric/fabric-samples/config"
VERSION_FILE="${SCRIPT_DIR}/.chaincode_version"

mkdir -p "${PROJECT_ROOT}/logs"
DEPLOY_LOG="${PROJECT_ROOT}/logs/chaincode-deploy.log"

ORDERER_CA="${TEST_NETWORK_DIR}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

echo ""
echo -e "${BLUE}=================================================="
echo "  Chaincode Deployment Script"
echo -e "==================================================${NC}"
echo "  Name    : ${CHAINCODE_NAME}"
echo "  Channel : ${CHANNEL_NAME}"
echo "  Language: ${CHAINCODE_LANGUAGE}"
echo "  Path    : ${CHAINCODE_PATH}"
echo ""

# ── Prerequisites ─────────────────────────────────────────────────────────────

if [ ! -d "${TEST_NETWORK_DIR}" ]; then
    echo -e "${RED}❌ test-network not found: ${TEST_NETWORK_DIR}${NC}"
    exit 1
fi
if [ ! -f "${CHAINCODE_PATH}/chaincode.go" ]; then
    echo -e "${RED}❌ chaincode.go not found in: ${CHAINCODE_PATH}${NC}"
    exit 1
fi
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}❌ Fabric network is not running${NC}"
    exit 1
fi

export PATH="${FABRIC_BIN}:${PATH}"
export FABRIC_CFG_PATH="${FABRIC_CFG}"

# ── Org1 environment helpers ──────────────────────────────────────────────────

set_org1_env() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
    export CORE_PEER_ADDRESS="localhost:7051"
}

set_org2_env() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp"
    export CORE_PEER_ADDRESS="localhost:9051"
}

# ── Query actual committed sequence from the network ──────────────────────────

get_committed_sequence() {
    set_org1_env
    peer lifecycle chaincode querycommitted \
        --channelID "${CHANNEL_NAME}" --name "${CHAINCODE_NAME}" 2>/dev/null \
        | grep -oE 'Sequence: [0-9]+' | grep -oE '[0-9]+' || echo "0"
}

CURRENT_SEQ=$(get_committed_sequence)
echo -e "${BLUE}Current committed sequence: ${CURRENT_SEQ}${NC}"

NEXT_SEQ=$((CURRENT_SEQ + 1))
# Version string mirrors sequence: 1→1.0, 2→2.0, …
CHAINCODE_VERSION="${NEXT_SEQ}.0"

echo "  Next version  : ${CHAINCODE_VERSION}"
echo "  Next sequence : ${NEXT_SEQ}"
echo ""

# ── Package ───────────────────────────────────────────────────────────────────

PACKAGE_FILE="/tmp/${CHAINCODE_NAME}_${CHAINCODE_VERSION}.tar.gz"

echo -e "${BLUE}[1/5] Packaging chaincode...${NC}"
set_org1_env
peer lifecycle chaincode package "${PACKAGE_FILE}" \
    --path "${CHAINCODE_PATH}" \
    --lang "${CHAINCODE_LANGUAGE}" \
    --label "${CHAINCODE_NAME}_${CHAINCODE_VERSION}"
echo -e "${GREEN}✅ Package created: ${PACKAGE_FILE}${NC}"
echo ""

# ── Install on Org1 peer ──────────────────────────────────────────────────────

echo -e "${BLUE}[2/5] Installing on Org1 peer...${NC}"
set_org1_env
peer lifecycle chaincode install "${PACKAGE_FILE}" 2>&1 | tee -a "${DEPLOY_LOG}"
echo ""

# ── Install on Org2 peer ──────────────────────────────────────────────────────

echo -e "${BLUE}[3/5] Installing on Org2 peer...${NC}"
set_org2_env
peer lifecycle chaincode install "${PACKAGE_FILE}" 2>&1 | tee -a "${DEPLOY_LOG}"
echo ""

# ── Retrieve package ID ───────────────────────────────────────────────────────

set_org1_env
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled 2>/dev/null \
    | grep "${CHAINCODE_NAME}_${CHAINCODE_VERSION}" \
    | grep -oE 'Package ID: [^,]+' \
    | sed 's/Package ID: //')

if [ -z "${PACKAGE_ID}" ]; then
    echo -e "${RED}❌ Could not find package ID for ${CHAINCODE_NAME}_${CHAINCODE_VERSION}${NC}"
    exit 1
fi
echo -e "${GREEN}Package ID: ${PACKAGE_ID}${NC}"
echo ""

# ── Approve for Org1 ──────────────────────────────────────────────────────────

echo -e "${BLUE}[4/5] Approving for Org1...${NC}"
set_org1_env
peer lifecycle chaincode approveformyorg \
    -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --channelID "${CHANNEL_NAME}" \
    --name "${CHAINCODE_NAME}" \
    --version "${CHAINCODE_VERSION}" \
    --package-id "${PACKAGE_ID}" \
    --sequence "${NEXT_SEQ}" \
    --tls --cafile "${ORDERER_CA}" 2>&1 | tee -a "${DEPLOY_LOG}"
echo ""

# ── Approve for Org2 ──────────────────────────────────────────────────────────

echo -e "${BLUE}[4/5] Approving for Org2...${NC}"
set_org2_env
peer lifecycle chaincode approveformyorg \
    -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --channelID "${CHANNEL_NAME}" \
    --name "${CHAINCODE_NAME}" \
    --version "${CHAINCODE_VERSION}" \
    --package-id "${PACKAGE_ID}" \
    --sequence "${NEXT_SEQ}" \
    --tls --cafile "${ORDERER_CA}" 2>&1 | tee -a "${DEPLOY_LOG}"
echo ""

# ── Commit ────────────────────────────────────────────────────────────────────

echo -e "${BLUE}[5/5] Committing to channel...${NC}"
set_org1_env
peer lifecycle chaincode commit \
    -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com \
    --channelID "${CHANNEL_NAME}" \
    --name "${CHAINCODE_NAME}" \
    --version "${CHAINCODE_VERSION}" \
    --sequence "${NEXT_SEQ}" \
    --tls --cafile "${ORDERER_CA}" \
    --peerAddresses localhost:7051 \
    --tlsRootCertFiles "${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
    --peerAddresses localhost:9051 \
    --tlsRootCertFiles "${TEST_NETWORK_DIR}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
    2>&1 | tee -a "${DEPLOY_LOG}"
echo ""

# ── Save version info ─────────────────────────────────────────────────────────

cat > "${VERSION_FILE}" <<EOF
CURRENT_VERSION="${CHAINCODE_VERSION}"
CURRENT_SEQUENCE=${NEXT_SEQ}
LAST_DEPLOY_TIME="$(date '+%Y-%m-%d %H:%M:%S')"
EOF

# ── Verify ────────────────────────────────────────────────────────────────────

echo -e "${BLUE}Verifying committed chaincode...${NC}"
set_org1_env
peer lifecycle chaincode querycommitted \
    --channelID "${CHANNEL_NAME}" --name "${CHAINCODE_NAME}" 2>&1

echo ""
echo -e "${GREEN}=================================================="
echo "  ✅ Chaincode Deployed Successfully!"
echo "=================================================="
echo "  Name     : ${CHAINCODE_NAME}"
echo "  Version  : ${CHAINCODE_VERSION}"
echo "  Sequence : ${NEXT_SEQ}"
echo "  Channel  : ${CHANNEL_NAME}"
echo -e "==================================================${NC}"
echo ""
echo -e "${BLUE}Quick smoke test:${NC}"
echo "  peer chaincode query -C ${CHANNEL_NAME} -n ${CHAINCODE_NAME} \\"
echo "    -c '{\"function\":\"QueryReviews\",\"Args\":[\"NONEXISTENT\"]}'"
echo ""
