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

# Detect OS type
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

    echo -e "${YELLOW}⚠️  Docker is not installed. Attempting to install...${NC}"
    
    case "$OS_TYPE" in
        linux)
            install_docker_linux
            ;;
        macos)
            install_docker_macos
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS type: $OSTYPE${NC}"
            echo "Please install Docker manually: https://docs.docker.com/get-docker/"
            return 1
            ;;
    esac
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker command still not available after install.${NC}"
        echo "You may need to restart your shell/terminal or re-login."
        return 1
    fi
    
    return 0
}

install_docker_linux() {
    echo "Installing Docker on Linux..."
    
    if ! command_exists sudo; then
        echo -e "${RED}❌ sudo not found. Please install Docker manually.${NC}"
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
            echo -e "${RED}❌ Package manager not found. Please install curl manually.${NC}"
            return 1
        fi
    fi
    
    # Official Docker convenience installer for Linux
    echo "Running Docker official installer..."
    if curl -fsSL https://get.docker.com | sudo sh; then
        echo -e "${GREEN}✓${NC} Docker installed successfully"
        
        # Add current user to docker group to run docker without sudo
        if command_exists usermod; then
            echo "Adding current user to docker group..."
            sudo usermod -aG docker "$USER"
            echo -e "${YELLOW}⚠️  You may need to log out and back in for group changes to take effect.${NC}"
            echo -e "${YELLOW}⚠️  Or run: newgrp docker${NC}"
        fi
        
        # Start Docker service
        if command_exists systemctl; then
            sudo systemctl start docker
            sudo systemctl enable docker
        fi
    else
        echo -e "${RED}❌ Failed to install Docker automatically.${NC}"
        echo "Please install Docker manually: https://docs.docker.com/engine/install/"
        return 1
    fi
    
    return 0
}

install_docker_macos() {
    echo "Installing Docker on macOS..."
    
    # Check if Homebrew is installed
    if ! command_exists brew; then
        echo -e "${YELLOW}⚠️  Homebrew is not installed. Installing Homebrew first...${NC}"
        if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
            echo -e "${GREEN}✓${NC} Homebrew installed"
        else
            echo -e "${RED}❌ Failed to install Homebrew.${NC}"
            echo "Please install Docker Desktop manually: https://docs.docker.com/desktop/install/mac-install/"
            return 1
        fi
    fi
    
    # Install Docker Desktop via Homebrew Cask
    echo "Installing Docker Desktop via Homebrew..."
    if brew install --cask docker; then
        echo -e "${GREEN}✓${NC} Docker Desktop installed"
        echo -e "${YELLOW}⚠️  Please start Docker Desktop from Applications folder.${NC}"
        echo -e "${YELLOW}⚠️  Waiting for Docker Desktop to start...${NC}"
        
        # Wait for Docker Desktop to start
        open -a Docker
        sleep 5
        
        max_wait=60
        waited=0
        while ! docker info >/dev/null 2>&1; do
            if [ $waited -ge $max_wait ]; then
                echo -e "${RED}❌ Docker Desktop did not start in time.${NC}"
                echo "Please start Docker Desktop manually from Applications."
                return 1
            fi
            echo -n "."
            sleep 2
            waited=$((waited + 2))
        done
        echo -e " ${GREEN}✓${NC}"
    else
        echo -e "${RED}❌ Failed to install Docker Desktop.${NC}"
        echo "Please install Docker Desktop manually: https://docs.docker.com/desktop/install/mac-install/"
        return 1
    fi
    
    return 0
}

install_docker_compose_if_missing() {
    # Prefer Docker Compose v2 plugin ("docker compose")
    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE="docker compose"
        return 0
    fi

    # Fallback to legacy docker-compose binary if present
    if command_exists docker-compose; then
        DOCKER_COMPOSE="docker-compose"
        return 0
    fi

    echo -e "${YELLOW}⚠️  Docker Compose is not installed. Attempting to install...${NC}"
    
    case "$OS_TYPE" in
        linux)
            install_docker_compose_linux
            ;;
        macos)
            # Docker Desktop for Mac includes Docker Compose
            echo -e "${YELLOW}⚠️  Docker Compose should be included with Docker Desktop.${NC}"
            echo "If not available, please reinstall Docker Desktop."
            return 1
            ;;
        *)
            echo -e "${RED}❌ Unsupported OS type for Docker Compose installation.${NC}"
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

    echo -e "${RED}❌ Docker Compose still not available after install.${NC}"
    return 1
}

install_docker_compose_linux() {
    if ! command_exists sudo; then
        echo -e "${RED}❌ sudo not found.${NC}"
        return 1
    fi
    
    # Try to install Docker Compose plugin (v2) first
    if command_exists apt-get; then
        echo "Installing Docker Compose plugin via apt..."
        sudo apt-get update
        if sudo apt-get install -y docker-compose-plugin; then
            echo -e "${GREEN}✓${NC} Docker Compose plugin installed"
            return 0
        fi
        
        # Fallback to legacy docker-compose
        echo "Trying legacy docker-compose package..."
        if sudo apt-get install -y docker-compose; then
            echo -e "${GREEN}✓${NC} Docker Compose (legacy) installed"
            return 0
        fi
    elif command_exists yum; then
        echo "Installing Docker Compose plugin via yum..."
        if sudo yum install -y docker-compose-plugin; then
            echo -e "${GREEN}✓${NC} Docker Compose plugin installed"
            return 0
        fi
    fi
    
    # Manual installation as last resort
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

# Step 2: Check Fabric Network Status
print_section "2. Checking Fabric Network Status / 检查 Fabric 网络状态"

FABRIC_NEEDS_DEPLOY=false

# Check if Fabric network containers exist
if docker ps -a --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
    echo "Fabric network containers found / 发现 Fabric 网络容器"
    
    # Check if containers are running
    if docker ps --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
        echo -e "${GREEN}✓${NC} Fabric network is running / Fabric 网络正在运行"
        
        # Verify network health by checking if we can query a peer
        if docker exec peer0.org1.example.com peer version >/dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Fabric network is healthy / Fabric 网络健康"
            FABRIC_NEEDS_DEPLOY=false
        else
            echo -e "${YELLOW}⚠️  Fabric network is running but not healthy / 网络运行但不健康${NC}"
            FABRIC_NEEDS_DEPLOY=true
        fi
    else
        echo -e "${YELLOW}⚠️  Fabric containers exist but not running / 容器存在但未运行${NC}"
        echo "Attempting to start existing containers / 尝试启动现有容器..."
        
        # Try to start stopped containers
        if docker start $(docker ps -a --format "{{.Names}}" | grep -E "peer|orderer|ca" | grep "example.com") 2>/dev/null; then
            sleep 3
            if docker ps --format "{{.Names}}" | grep -q "peer0.org1.example.com"; then
                echo -e "${GREEN}✓${NC} Successfully restarted Fabric containers / 成功重启容器"
                FABRIC_NEEDS_DEPLOY=false
            else
                echo -e "${YELLOW}⚠️  Failed to restart containers, will redeploy / 重启失败，将重新部署${NC}"
                FABRIC_NEEDS_DEPLOY=true
            fi
        else
            echo -e "${YELLOW}⚠️  Cannot restart containers, will redeploy / 无法重启容器，将重新部署${NC}"
            FABRIC_NEEDS_DEPLOY=true
        fi
    fi
else
    echo "No Fabric network found / 未发现 Fabric 网络"
    FABRIC_NEEDS_DEPLOY=true
fi

# Step 3: Clean up Docker Compose services
print_section "3. Cleaning Up Application Services / 清理应用服务"

echo "Stopping Docker Compose services (backend/frontend)..."
echo "停止 Docker Compose 服务（后端/前端）..."
$DOCKER_COMPOSE down 2>/dev/null || true
echo -e "${GREEN}✓${NC} Application services cleaned"

# Step 4: Deploy or Skip Fabric Network
if [ "$FABRIC_NEEDS_DEPLOY" = true ]; then
    print_section "4. Deploying Fabric Network / 部署 Fabric 网络"
    
    echo -e "${YELLOW}⚠️  Fabric network needs deployment / 需要部署 Fabric 网络${NC}"
    echo "Cleaning up old network / 清理旧网络..."
    
    cd "${FABRIC_DIR}"
    ./network.sh down 2>/dev/null || true
    
    # Reset chaincode version tracking for fresh network
    CHAINCODE_VERSION_FILE="${CHAINCODE_DIR}/.chaincode_version"
    if [ -f "${CHAINCODE_VERSION_FILE}" ]; then
        echo "Resetting chaincode version tracking / 重置 chaincode 版本追踪..."
        rm -f "${CHAINCODE_VERSION_FILE}"
    fi
    
    # Clean up Docker networks
    docker network prune -f >/dev/null 2>&1 || true
    
    echo ""
    echo "Starting new Fabric network with channel: ${CHANNEL_NAME}"
    echo "启动新的 Fabric 网络，频道：${CHANNEL_NAME}"
    
    if ./network.sh up createChannel -c "${CHANNEL_NAME}"; then
        echo -e "${GREEN}✓${NC} Fabric network deployed successfully"
    else
        echo -e "${RED}❌ Failed to deploy Fabric network${NC}"
        echo ""
        echo "Troubleshooting tips / 故障排除提示:"
        echo "1. Check if Docker daemon is running / 检查 Docker 守护进程是否运行"
        echo "2. Try manual cleanup: cd ${FABRIC_DIR} && ./network.sh down"
        echo "3. Check Docker logs for errors / 查看 Docker 日志"
        exit 1
    fi
    
    cd "${SCRIPT_DIR}"
    
    # Deploy chaincode for new network
    print_section "5. Deploying Chaincode / 部署链码"
    
    cd "${CHAINCODE_DIR}"
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
else
    print_section "4. Using Existing Fabric Network / 使用现有 Fabric 网络"
    
    echo -e "${GREEN}✓${NC} Fabric network is healthy, skipping deployment"
    echo -e "${GREEN}✓${NC} Fabric 网络健康，跳过部署"
    echo ""
    echo -e "${CYAN}ℹ️  Existing chaincode and sequence number will be preserved${NC}"
    echo -e "${CYAN}ℹ️  现有 chaincode 和序列号将被保留${NC}"
    echo ""
    
    # Show current chaincode info if available
    CHAINCODE_VERSION_FILE="${CHAINCODE_DIR}/.chaincode_version"
    if [ -f "${CHAINCODE_VERSION_FILE}" ]; then
        source "${CHAINCODE_VERSION_FILE}"
        echo "Current chaincode version: ${CURRENT_VERSION}"
        echo "Current sequence: ${CURRENT_SEQUENCE}"
        echo "Last deployed: ${LAST_DEPLOY_TIME}"
        echo ""
    fi
fi

# Step 6: Wait for Fabric network to be ready
print_section "6. Waiting for Fabric Network / 等待 Fabric 网络就绪"

sleep 3
if docker ps | grep -q "peer0.org1.example.com"; then
    echo -e "${GREEN}✓${NC} Fabric network is ready"
else
    echo -e "${YELLOW}⚠️  Fabric network containers not fully started${NC}"
fi

# Step 7: Create .env file if not exists
print_section "7. Checking Environment Configuration / 检查环境配置"

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

# Step 8: Start Docker Compose services
print_section "8. Starting Backend and Frontend Services / 启动后端和前端服务"

echo "Building and starting services..."
echo "构建并启动服务..."
$DOCKER_COMPOSE up -d --build

# Step 9: Wait for services to be healthy
print_section "9. Waiting for Services to Start / 等待服务启动"

wait_for_service "fyp-postgres" 30
wait_for_service "fyp-backend" 60
wait_for_service "fyp-frontend" 30

# Step 10: Verify services
print_section "10. Verifying Services / 验证服务状态"

echo ""
echo "Service Status / 服务状态:"
echo "----------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|fyp-|peer0|orderer"
echo ""

# Step 11: Check backend health
print_section "11. Checking Backend Health / 检查后端健康状态"

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
echo "  # First, create a test campaign / 首先，创建一个测试活动"
echo "  cd fabric/fabric-samples/test-network"
echo "  ./network.sh cc invoke -c mychannel -ccn donation \\"
echo "    -ccic '{\"function\":\"CreateCampaign\",\"Args\":[\"CAMP001\",\"Alice\",\"2026-01-28T10:00:00\",\"Test Campaign\",\"AUTO_APPROVED\"]}'"
echo ""
echo "  # Then query the campaign / 然后查询活动"
echo "  ./network.sh cc query -c mychannel -ccn donation \\"
echo "    -ccqc '{\"function\":\"ReadCampaign\",\"Args\":[\"CAMP001\"]}'"
echo ""
echo "  # Or use the backend API (recommended) / 或使用后端 API（推荐）"
echo "  curl -X POST http://localhost:8080/api/campaigns \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"initiator\":\"Alice\",\"description\":\"Test Campaign\"}'"
echo ""
echo -e "${GREEN}✅ All Services Started Successfully! / 所有服务启动成功！${NC}"
echo ""
