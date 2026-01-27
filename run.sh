#!/bin/bash

# FYP Project - One-Click Startup Script
# Starts Fabric network, deploys chaincode, and launches all services
# 一键启动脚本：启动 Fabric 网络、部署链码并启动所有服务

set -e

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Configuration
FABRIC_DIR="${SCRIPT_DIR}/fabric/fabric-samples/test-network"
CHAINCODE_DIR="${SCRIPT_DIR}/chaincode"
CHANNEL_NAME="mychannel"
CHAINCODE_NAME="donation"

# Print banner
echo ""
echo -e "${CYAN}================================================================"
echo "  🚀 FYP Blockchain Donation Platform - One-Click Startup"
echo "================================================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service
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
print_section "1. Checking Prerequisites / 检查环境依赖"

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker installed"

if ! command_exists docker-compose; then
    if ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        echo "Please install Docker Compose"
        exit 1
    fi
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi
echo -e "${GREEN}✓${NC} Docker Compose installed"

if [ ! -d "${FABRIC_DIR}" ]; then
    echo -e "${RED}❌ Fabric test-network not found at: ${FABRIC_DIR}${NC}"
    echo ""
    echo "Please install Fabric samples first:"
    echo "  cd fabric"
    echo "  curl -sSL https://bit.ly/2ysbOFE | bash -s"
    exit 1
fi
echo -e "${GREEN}✓${NC} Fabric test-network found"

if [ ! -f "${CHAINCODE_DIR}/chaincode.go" ]; then
    echo -e "${RED}❌ Chaincode not found at: ${CHAINCODE_DIR}${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Chaincode found"

# Step 2: Clean up existing services (optional)
print_section "2. Cleaning Up Existing Services / 清理现有服务"

read -p "Do you want to clean up existing services? (y/n) / 是否清理现有服务？ " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Stopping Docker Compose services..."
    $DOCKER_COMPOSE down -v 2>/dev/null || true
    
    echo "Stopping Fabric network..."
    cd "${FABRIC_DIR}"
    ./network.sh down 2>/dev/null || true
    
    echo "Cleaning up Docker networks..."
    docker network prune -f >/dev/null 2>&1 || true
    
    cd "${SCRIPT_DIR}"
    echo -e "${GREEN}✓${NC} Cleanup completed"
else
    echo "Skipping cleanup..."
fi

# Step 3: Start Fabric network
print_section "3. Starting Fabric Network / 启动 Fabric 网络"

cd "${FABRIC_DIR}"

if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${YELLOW}⚠️  Fabric network is already running${NC}"
else
    echo "Starting Fabric network with channel: ${CHANNEL_NAME}"
    if ./network.sh up createChannel -c "${CHANNEL_NAME}"; then
        echo -e "${GREEN}✓${NC} Fabric network started successfully"
    else
        echo -e "${RED}❌ Failed to start Fabric network${NC}"
        exit 1
    fi
fi

cd "${SCRIPT_DIR}"

# Step 4: Deploy chaincode
print_section "4. Deploying Chaincode / 部署链码"

cd "${CHAINCODE_DIR}"

# Make deploy script executable
chmod +x deploy.sh

echo "Deploying chaincode: ${CHAINCODE_NAME}"
if yes | ./deploy.sh "${CHAINCODE_NAME}"; then
    echo -e "${GREEN}✓${NC} Chaincode deployed successfully"
else
    echo -e "${RED}❌ Failed to deploy chaincode${NC}"
    echo "You can try deploying manually later with:"
    echo "  cd chaincode && ./deploy.sh"
fi

cd "${SCRIPT_DIR}"

# Step 5: Wait for Fabric network to be ready
print_section "5. Waiting for Fabric Network / 等待 Fabric 网络就绪"

sleep 3
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${GREEN}✓${NC} Fabric network is ready"
else
    echo -e "${YELLOW}⚠️  Fabric network containers not fully started${NC}"
fi

# Step 6: Create .env file if not exists
print_section "6. Checking Environment Configuration / 检查环境配置"

if [ ! -f "${SCRIPT_DIR}/.env" ]; then
    echo "Creating .env file from .env.docker..."
    if [ -f "${SCRIPT_DIR}/.env.docker" ]; then
        cp "${SCRIPT_DIR}/.env.docker" "${SCRIPT_DIR}/.env"
        echo -e "${GREEN}✓${NC} .env file created"
    else
        echo -e "${YELLOW}⚠️  .env.docker not found, using defaults${NC}"
    fi
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Step 7: Start Docker Compose services
print_section "7. Starting Backend and Frontend Services / 启动后端和前端服务"

echo "Building and starting services..."
$DOCKER_COMPOSE up -d --build

# Step 8: Wait for services to be healthy
print_section "8. Waiting for Services to Start / 等待服务启动"

wait_for_service "fyp-postgres" 30
wait_for_service "fyp-backend" 60
wait_for_service "fyp-frontend" 30

# Step 9: Verify services
print_section "9. Verifying Services / 验证服务状态"

echo ""
echo "Service Status / 服务状态:"
echo "----------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|fyp-|peer0|orderer"
echo ""

# Step 10: Check backend health
print_section "10. Checking Backend Health / 检查后端健康状态"

echo -n "Waiting for backend to be ready"
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:8080/actuator/health >/dev/null 2>&1 || \
       curl -s http://localhost:8080/ >/dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        echo -e "${GREEN}✓${NC} Backend is healthy"
        break
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e " ${YELLOW}⚠️${NC}"
    echo -e "${YELLOW}⚠️  Backend may still be starting up${NC}"
    echo "Check logs with: docker logs -f fyp-backend"
fi

# Display final status
echo ""
echo -e "${GREEN}================================================================"
echo "  ✅ All Services Started Successfully!"
echo "================================================================${NC}"
echo ""
echo -e "${CYAN}📋 Service URLs / 服务地址:${NC}"
echo "----------------------------------------"
echo -e "  Frontend:  ${GREEN}http://localhost:3000${NC}"
echo -e "  Backend:   ${GREEN}http://localhost:8080${NC}"
echo -e "  Database:  ${GREEN}localhost:5432${NC}"
echo ""
echo -e "${CYAN}🔍 Useful Commands / 常用命令:${NC}"
echo "----------------------------------------"
echo "  View all logs / 查看所有日志:"
echo "    docker-compose logs -f"
echo ""
echo "  View backend logs / 查看后端日志:"
echo "    docker logs -f fyp-backend"
echo ""
echo "  View frontend logs / 查看前端日志:"
echo "    docker logs -f fyp-frontend"
echo ""
echo "  View Fabric peer logs / 查看 Fabric 节点日志:"
echo "    docker logs -f peer0.org1.example.com"
echo ""
echo "  Stop all services / 停止所有服务:"
echo "    docker-compose down"
echo ""
echo "  Stop Fabric network / 停止 Fabric 网络:"
echo "    cd fabric/fabric-samples/test-network && ./network.sh down"
echo ""
echo -e "${CYAN}🧪 Test Fabric Chaincode / 测试 Fabric 链码:${NC}"
echo "----------------------------------------"
echo "  cd fabric/fabric-samples/test-network"
echo "  ./network.sh cc query -c mychannel -ccn donation \\"
echo "    -ccqc '{\"function\":\"QueryCampaignsByInitiator\",\"Args\":[\"Alice\"]}'"
echo ""
echo -e "${GREEN}Happy coding! 开始使用吧！🎉${NC}"
echo ""
