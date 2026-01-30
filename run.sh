#!/bin/bash

# FYP Project - One-Click Startup Script
set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

FABRIC_VERSION="2.5.14"
CA_VERSION="1.5.12"
FABRIC_DIR="${SCRIPT_DIR}/fabric/fabric-samples/test-network"
CHAINCODE_DIR="${SCRIPT_DIR}/chaincode"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="donation"

echo ""
echo -e "${CYAN}================================================================"
echo "  🚀 FYP Blockchain Donation Platform - One-Click Startup"
echo "================================================================${NC}"
echo ""

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "----------------------------------------"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

wait_for_service() {
    local service_name=$1
    local max_attempts=$2
    local attempt=1
    
    echo -n "Waiting for ${service_name}"
    while [ $attempt -le $max_attempts ]; do
        if docker ps | grep -q "${service_name}"; then
            if docker ps --format "{{.Names}}\t{{.Status}}" | grep "${service_name}" | grep -q "Up"; then
                echo -e " ${GREEN}✓${NC}"
                return 0
            fi
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# Step 1: Check prerequisites
print_section "1. Checking Prerequisites"

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS_TYPE=$(detect_os)
echo "Detected OS: ${OS_TYPE}"

install_docker_if_missing() {
    if command_exists docker; then
        return 0
    fi

    echo -e "${YELLOW}⚠️  Docker not installed. Attempting to install...${NC}"
    
    case "$OS_TYPE" in
        linux)
            install_docker_linux
            ;;
        macos)
            install_docker_macos
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS. Install Docker manually: https://docs.docker.com/get-docker/${NC}"
            return 1
            ;;
    esac
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker still not available. Restart shell or re-login.${NC}"
        return 1
    fi
    
    return 0
}

install_docker_linux() {
    echo "Installing Docker on Linux..."
    
    if ! command_exists sudo; then
        echo -e "${RED}❌ sudo not found. Install Docker manually.${NC}"
        return 1
    fi
    
    if ! command_exists curl; then
        echo "Installing curl..."
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y curl ca-certificates gnupg
        elif command_exists yum; then
            sudo yum install -y curl ca-certificates
        else
            echo -e "${RED}❌ Package manager not found.${NC}"
            return 1
        fi
    fi
    
    echo "Running Docker official installer..."
    if curl -fsSL https://get.docker.com | sudo sh; then
        echo -e "${GREEN}✓${NC} Docker installed"
        
        if command_exists usermod; then
            echo "Adding user to docker group..."
            sudo usermod -aG docker "$USER"
            echo -e "${YELLOW}⚠️  Log out and back in for group changes. Or run: newgrp docker${NC}"
        fi
        
        if command_exists systemctl; then
            sudo systemctl start docker
            sudo systemctl enable docker
        fi
    else
        echo -e "${RED}❌ Failed to install Docker. Install manually: https://docs.docker.com/engine/install/${NC}"
        return 1
    fi
    
    return 0
}

install_docker_macos() {
    echo "Installing Docker on macOS..."
    
    if ! command_exists brew; then
        echo -e "${YELLOW}⚠️  Installing Homebrew...${NC}"
        if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
            echo -e "${GREEN}✓${NC} Homebrew installed"
        else
            echo -e "${RED}❌ Failed to install Homebrew. Install Docker manually: https://docs.docker.com/desktop/install/mac-install/${NC}"
            return 1
        fi
    fi
    
    echo "Installing Docker Desktop..."
    if brew install --cask docker; then
        echo -e "${GREEN}✓${NC} Docker Desktop installed"
        echo -e "${YELLOW}⚠️  Starting Docker Desktop...${NC}"
        
        open -a Docker
        sleep 5
        
        max_wait=60
        waited=0
        while ! docker info >/dev/null 2>&1; do
            if [ $waited -ge $max_wait ]; then
                echo -e "${RED}❌ Docker Desktop timeout. Start manually from Applications.${NC}"
                return 1
            fi
            echo -n "."
            sleep 2
            waited=$((waited + 2))
        done
        echo -e " ${GREEN}✓${NC}"
    else
        echo -e "${RED}❌ Failed to install Docker Desktop.${NC}"
        return 1
    fi
    
    return 0
}

install_docker_compose_if_missing() {
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
        return 0
    fi

    if command_exists docker-compose; then
        DOCKER_COMPOSE="docker-compose"
        return 0
    fi

    echo -e "${YELLOW}⚠️  Docker Compose not installed. Attempting to install...${NC}"
    
    case "$OS_TYPE" in
        linux)
            install_docker_compose_linux
            ;;
        macos)
            echo -e "${YELLOW}⚠️  Docker Compose should be included with Docker Desktop.${NC}"
            return 1
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS for Docker Compose installation.${NC}"
            return 1
            ;;
    esac

    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
        return 0
    fi
    if command_exists docker-compose; then
        DOCKER_COMPOSE="docker-compose"
        return 0
    fi

    echo -e "${RED}❌ Docker Compose still not available.${NC}"
    return 1
}

install_docker_compose_linux() {
    if ! command_exists sudo; then
        echo -e "${RED}❌ sudo not found.${NC}"
        return 1
    fi
    
    if command_exists apt-get; then
        echo "Installing Docker Compose plugin..."
        sudo apt-get update
        if sudo apt-get install -y docker-compose-plugin; then
            echo -e "${GREEN}✓${NC} Docker Compose plugin installed"
            return 0
        fi
        
        echo "Trying legacy docker-compose..."
        if sudo apt-get install -y docker-compose; then
            echo -e "${GREEN}✓${NC} Docker Compose (legacy) installed"
            return 0
        fi
    elif command_exists yum; then
        echo "Installing Docker Compose plugin..."
        if sudo yum install -y docker-compose-plugin; then
            echo -e "${GREEN}✓${NC} Docker Compose plugin installed"
            return 0
        fi
    fi
    
    echo "Installing Docker Compose manually..."
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    if [ -z "$COMPOSE_VERSION" ]; then
        COMPOSE_VERSION="v2.24.0"
    fi
    
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    return 0
}

install_docker_if_missing
echo -e "${GREEN}✓${NC} Docker installed"

install_docker_compose_if_missing
echo -e "${GREEN}✓${NC} Docker Compose installed"

if [ ! -d "${FABRIC_DIR}" ]; then
    echo -e "${RED}❌ Fabric test-network not found: ${FABRIC_DIR}${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Fabric test-network found"

if [ ! -f "${CHAINCODE_DIR}/chaincode.go" ]; then
    echo -e "${RED}❌ Chaincode not found: ${CHAINCODE_DIR}${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Chaincode found"

# Step 2: Check Fabric Network Status
print_section "2. Checking Fabric Network Status"

FABRIC_NEEDS_DEPLOY=false

if docker ps -a --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
    echo "Fabric network containers found"
    
    if docker ps --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
        echo -e "${GREEN}✓${NC} Fabric network running"
        
        if docker exec peer0.org1.example.com peer version >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Fabric network healthy"
            FABRIC_NEEDS_DEPLOY=false
        else
            echo -e "${YELLOW}⚠️  Fabric network unhealthy${NC}"
            FABRIC_NEEDS_DEPLOY=true
        fi
    else
        echo -e "${YELLOW}⚠️  Fabric containers not running${NC}"
        echo "Attempting to start containers..."
        
        if docker start $(docker ps -a --format "{{.Names}}" | grep -E "peer|orderer|ca" | grep "example.com") 2>/dev/null; then
            sleep 3
            if docker ps --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
                echo -e "${GREEN}✓${NC} Containers restarted"
                FABRIC_NEEDS_DEPLOY=false
            else
                echo -e "${YELLOW}⚠️  Restart failed, will redeploy${NC}"
                FABRIC_NEEDS_DEPLOY=true
            fi
        else
            echo -e "${YELLOW}⚠️  Cannot restart, will redeploy${NC}"
            FABRIC_NEEDS_DEPLOY=true
        fi
    fi
else
    echo "No Fabric network found"
    
    if [ ! -d "${SCRIPT_DIR}/fabric/fabric-samples" ] || [ ! -d "${SCRIPT_DIR}/fabric/fabric-samples/.git" ]; then
        echo -e "${YELLOW}⚠️  Initializing Fabric ${FABRIC_VERSION} submodule...${NC}"
        
        cd "${SCRIPT_DIR}"
        
        echo "Initializing git submodule..."
        if git submodule update --init --recursive fabric/fabric-samples; then
            echo -e "${GREEN}✓${NC} Submodule initialized"
            
            echo "Checking out Fabric ${FABRIC_VERSION}..."
            cd "${SCRIPT_DIR}/fabric/fabric-samples"
            if git checkout v${FABRIC_VERSION}; then
                echo -e "${GREEN}✓${NC} Checked out Fabric ${FABRIC_VERSION}"
            else
                echo -e "${YELLOW}⚠️  Could not checkout v${FABRIC_VERSION}${NC}"
            fi
            
            echo "Downloading Fabric ${FABRIC_VERSION} and CA ${CA_VERSION} binaries..."
            cd "${SCRIPT_DIR}/fabric/fabric-samples"
            if curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary ${FABRIC_VERSION} ${CA_VERSION}; then
                echo -e "${GREEN}✓${NC} Binaries installed"
            else
                echo -e "${YELLOW}⚠️  Could not download binaries, will use Docker images${NC}"
            fi
            
            cd "${SCRIPT_DIR}"
        else
            echo -e "${RED}❌ Failed to initialize submodule${NC}"
            exit 1
        fi
    else
        echo "Verifying Fabric version..."
        cd "${SCRIPT_DIR}/fabric/fabric-samples"
        CURRENT_VERSION=$(git describe --tags 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        if [ "$CURRENT_VERSION" != "v${FABRIC_VERSION}" ]; then
            echo -e "${YELLOW}⚠️  Current: $CURRENT_VERSION, switching to v${FABRIC_VERSION}${NC}"
            git fetch --tags 2>/dev/null || true
            if git checkout v${FABRIC_VERSION}; then
                echo -e "${GREEN}✓${NC} Switched to Fabric ${FABRIC_VERSION}"
            else
                echo -e "${YELLOW}⚠️  Could not switch to v${FABRIC_VERSION}${NC}"
            fi
        else
            echo -e "${GREEN}✓${NC} Already on Fabric ${FABRIC_VERSION}"
        fi
        cd "${SCRIPT_DIR}"
    fi
    
    FABRIC_NEEDS_DEPLOY=true
fi

# Step 3: Clean up application services
print_section "3. Cleaning Up Application Services"

echo "Stopping Docker Compose services..."
$DOCKER_COMPOSE down 2>/dev/null || true
echo -e "${GREEN}✓${NC} Services cleaned"

# Step 4: Deploy or skip Fabric Network
if [ "$FABRIC_NEEDS_DEPLOY" = true ]; then
    print_section "4. Deploying Fabric Network"
    
    echo -e "${YELLOW}⚠️  Deploying Fabric network...${NC}"
    
    if [ ! -d "${FABRIC_DIR}" ]; then
        echo -e "${RED}❌ Fabric test-network not found: ${FABRIC_DIR}${NC}"
        exit 1
    fi
    
    echo "Cleaning up old network..."
    cd "${FABRIC_DIR}"
    ./network.sh down 2>/dev/null || true
    
    CHAINCODE_VERSION_FILE="${CHAINCODE_DIR}/.chaincode_version"
    if [ -f "${CHAINCODE_VERSION_FILE}" ]; then
        rm -f "${CHAINCODE_VERSION_FILE}"
    fi
    
    docker network prune -f >/dev/null 2>&1 || true
    
    echo ""
    echo "Starting Fabric network with channel: ${CHANNEL_NAME}"
    
    if ./network.sh up createChannel -c "${CHANNEL_NAME}"; then
        echo -e "${GREEN}✓${NC} Fabric network deployed"
    else
        echo -e "${RED}❌ Failed to deploy Fabric network${NC}"
        echo "Troubleshooting:"
        echo "1. Check Docker daemon"
        echo "2. Manual cleanup: cd ${FABRIC_DIR} && ./network.sh down"
        echo "3. Check Docker logs"
        exit 1
    fi
    
    cd "${SCRIPT_DIR}"
    
    print_section "5. Deploying Chaincode"
    
    cd "${CHAINCODE_DIR}"
    chmod +x deploy.sh
    
    echo "Deploying chaincode: ${CHAINCODE_NAME}"
    if yes | ./deploy.sh "${CHAINCODE_NAME}"; then
        echo -e "${GREEN}✓${NC} Chaincode deployed"
    else
        echo -e "${RED}❌ Failed to deploy chaincode${NC}"
        echo "Deploy manually: cd chaincode && ./deploy.sh"
    fi
    
    cd "${SCRIPT_DIR}"
else
    print_section "4. Using Existing Fabric Network"
    
    echo -e "${GREEN}✓${NC} Fabric network healthy, skipping deployment"
    echo -e "${CYAN}ℹ️  Existing chaincode preserved${NC}"
    
    CHAINCODE_VERSION_FILE="${CHAINCODE_DIR}/.chaincode_version"
    if [ -f "${CHAINCODE_VERSION_FILE}" ]; then
        source "${CHAINCODE_VERSION_FILE}"
        echo "Chaincode version: ${CURRENT_VERSION}"
        echo "Sequence: ${CURRENT_SEQUENCE}"
        echo "Last deployed: ${LAST_DEPLOY_TIME}"
    fi
fi

# Step 6: Wait for Fabric network
print_section "6. Waiting for Fabric Network"

sleep 3
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${GREEN}✓${NC} Fabric network ready"
else
    echo -e "${YELLOW}⚠️  Fabric containers not fully started${NC}"
fi

# Step 7: Check environment configuration
print_section "7. Checking Environment Configuration"

if [ ! -f "${SCRIPT_DIR}/.env" ]; then
    echo "Creating .env file..."
    if [ -f "${SCRIPT_DIR}/.env.docker" ]; then
        cp "${SCRIPT_DIR}/.env.docker" "${SCRIPT_DIR}/.env"
        echo -e "${GREEN}✓${NC} .env file created"
    else
        echo -e "${YELLOW}⚠️  .env.docker not found${NC}"
    fi
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Step 8: Start application services
print_section "8. Starting Backend and Frontend Services"

echo "Building and starting services..."
$DOCKER_COMPOSE up -d --build

# Step 9: Wait for services
print_section "9. Waiting for Services to Start"

wait_for_service "fyp-postgres" 30
wait_for_service "fyp-backend" 60
wait_for_service "fyp-frontend" 30

# Step 10: Verify services
print_section "10. Verifying Services"

echo ""
echo "Service Status:"
echo "----------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|fyp-|peer0|orderer"
echo ""

# Step 11: Check backend health
print_section "11. Checking Backend Health"

echo -n "Waiting for backend"
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8080/actuator/health >/dev/null 2>&1 || \
       curl -s http://localhost:8080/ >/dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        echo -e "${GREEN}✓${NC} Backend healthy"
        break
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e " ${YELLOW}⚠️${NC}"
    echo -e "${YELLOW}⚠️  Backend may still be starting${NC}"
    echo "Check logs: docker logs -f fyp-backend"
fi

# Final status
echo ""
echo -e "${GREEN}================================================================"
echo "  ✅ All Services Started Successfully!"
echo "================================================================${NC}"
echo ""
