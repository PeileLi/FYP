#!/usr/bin/env bash

# Supabase + Fabric Docker Environment Setup Script
# Automatically generates .env file for Docker Compose with Supabase

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NETWORK_DIR="${PROJECT_ROOT}/fabric-samples/test-network"

echo -e "${BLUE}=== Supabase + Fabric Docker Environment Setup ===${NC}"
echo ""

# Check if Fabric network is running
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${RED}Error: Fabric network is not running!${NC}"
    echo "Please run './start-fabric.sh' first."
    exit 1
fi

# Check if fabric_test network exists
if ! docker network ls | grep -q "fabric_test"; then
    echo -e "${RED}Error: fabric_test network does not exist!${NC}"
    echo "Please run './start-fabric.sh' first."
    exit 1
fi

echo -e "${GREEN}✓ Fabric network is running${NC}"
echo ""

# Find the actual keystore file
KEYSTORE_DIR="${TEST_NETWORK_DIR}/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore"
KEY_FILE=$(ls ${KEYSTORE_DIR}/*_sk 2>/dev/null | head -n 1)

if [ -z "$KEY_FILE" ]; then
    echo -e "${RED}Error: Could not find private key file!${NC}"
    exit 1
fi

KEY_FILENAME=$(basename "$KEY_FILE")
echo -e "${GREEN}✓ Found private key: ${KEY_FILENAME}${NC}"
echo ""

# Prompt for Supabase credentials
echo -e "${YELLOW}Please provide your Supabase credentials:${NC}"
echo ""

read -p "Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Supabase Database URL (e.g., db.xxxxx.supabase.co): " SUPABASE_DB_HOST
read -sp "Supabase Database Password: " SUPABASE_DB_PASSWORD
echo ""
read -sp "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
echo ""
echo ""

# Generate .env file
ENV_FILE="${PROJECT_ROOT}/.env"

echo -e "${YELLOW}Generating ${ENV_FILE}...${NC}"

cat > "$ENV_FILE" << EOF
# Auto-generated Supabase + Fabric Docker Environment Configuration
# Generated on: $(date)

# Supabase Database Configuration
SPRING_DATASOURCE_URL=jdbc:postgresql://${SUPABASE_DB_HOST}:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=${SUPABASE_DB_PASSWORD}

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=change-this-secret-to-a-long-random-string-at-least-32-bytes

# Supabase Storage Configuration
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_BUCKET_NAME=campaign-images
SUPABASE_STORAGE_ENABLED=true

# Fabric Blockchain Configuration
# These use container names for Docker network communication
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=donation
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=peer0.org1.example.com:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com

# Fabric Certificate Paths (inside Docker container)
FABRIC_CERT_PATH=/fabric/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem
FABRIC_KEY_PATH=/fabric/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore/${KEY_FILENAME}
FABRIC_TLS_CERT_PATH=/fabric/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
EOF

echo -e "${GREEN}✓ Environment file created: ${ENV_FILE}${NC}"
echo ""

# Display summary
echo -e "${BLUE}=== Configuration Summary ===${NC}"
echo ""
echo "Database:       Supabase (${SUPABASE_DB_HOST})"
echo "Storage:        Supabase Storage"
echo "Fabric Peer:    peer0.org1.example.com:7051"
echo "Private Key:    ${KEY_FILENAME}"
echo ""

echo -e "${YELLOW}=== Next Steps ===${NC}"
echo ""
echo "1. Review the generated .env file:"
echo "   cat .env"
echo ""
echo "2. Start the application with Docker Compose (Supabase mode):"
echo "   docker-compose -f docker-compose.supabase.yml up -d --build"
echo ""
echo "3. Check the logs:"
echo "   docker-compose -f docker-compose.supabase.yml logs -f backend"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo ""

echo -e "${GREEN}Setup complete!${NC}"
