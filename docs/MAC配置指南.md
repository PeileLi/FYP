# Mac 环境配置指南

## 快速开始（Mac）

### 1. 安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 配置环境变量（按照安装完成后的提示操作）
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2. 安装 Docker Desktop

```bash
# 方法 1: 使用 Homebrew
brew install --cask docker

# 方法 2: 手动下载
# 访问: https://www.docker.com/products/docker-desktop
# 下载 Mac 版本（Apple Silicon 或 Intel）
```

启动 Docker Desktop：
```bash
open -a Docker

# 等待 Docker Desktop 完全启动（菜单栏图标变绿）
```

### 3. 配置 Docker Desktop 资源

1. 打开 Docker Desktop
2. 点击菜单栏的 Docker 图标 → Settings
3. 配置 Resources：

```
Resources > Advanced:
- CPUs: 4 (推荐 6 如果有足够资源)
- Memory: 8 GB (推荐 12 GB)
- Swap: 2 GB
- Disk image size: 60 GB
```

4. 点击 "Apply & Restart"

### 4. 安装开发工具

```bash
# 安装 Go（链码开发需要）
brew install go

# 验证安装
go version  # 应该显示 >= 1.21

# 安装 Git
brew install git

# 安装 jq（JSON 处理工具）
brew install jq

# 安装 Node.js（前端开发需要）
brew install node

# 验证安装
node --version  # >= 18.x
npm --version
```

### 5. 克隆项目

```bash
# 创建项目目录
mkdir -p ~/projects
cd ~/projects

# 克隆项目
git clone https://github.com/PeileLi/FYP.git
cd FYP

# 初始化 Git 子模块
git submodule update --init --recursive
```

### 6. 下载 Fabric 工具和镜像

```bash
cd ~/projects/FYP/fabric

# 如果 fabric-samples 已存在，先进入
cd fabric-samples

# 下载 Fabric 二进制文件和 Docker 镜像
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.14 1.5.15

# 验证下载
ls -l bin/  # 应该看到 peer, orderer, configtxgen 等
docker images | grep hyperledger  # 应该看到 fabric 镜像
```

### 7. 配置环境变量

编辑你的 shell 配置文件：

```bash
# macOS Catalina+ 使用 zsh
nano ~/.zshrc

# 或者如果使用 bash
nano ~/.bash_profile
```

添加以下内容（**替换为你的实际用户名**）：

```bash
# Fabric 环境变量
export PATH=$HOME/projects/FYP/fabric/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/projects/FYP/fabric/fabric-samples/config

# Go 环境变量
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
```

重新加载配置：

```bash
source ~/.zshrc  # 或 source ~/.bash_profile

# 验证
peer version
orderer version
configtxgen -version
```

### 8. 配置项目环境文件

创建 `.env` 文件：

```bash
cd ~/projects/FYP

# 如果存在 .env.example，复制它
cp .env.example .env

# 编辑 .env 文件
nano .env
```

**重要：修改以下路径为 Mac 路径（替换 `yourusername` 为你的实际用户名）：**

```env
# PostgreSQL 配置（可选，默认使用本地）
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# JWT Secret
JWT_SECRET=change-this-secret-to-a-long-random-string-at-least-32-bytes

# Fabric 配置
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=donation
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=peer0.org1.example.com:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com

# ⚠️ Mac 特定路径 - 修改 yourusername 为你的实际用户名
FABRIC_CERT_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem

FABRIC_KEY_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore

FABRIC_TLS_CERT_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
```

**获取你的用户名：**
```bash
whoami  # 显示你的 Mac 用户名
pwd     # 显示当前完整路径
```

### 9. 修改 docker-compose.yml

编辑 `docker-compose.yml` 文件：

```bash
nano docker-compose.yml
```

找到 `backend` 服务的 `volumes` 部分，修改为 Mac 路径：

```yaml
backend:
  # ... 其他配置 ...
  volumes:
    - campaign_images:/app/uploads/images
    
    # ⚠️ Mac 路径 - 替换 yourusername
    - /Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com:/fabric/organizations/peerOrganizations/org1.example.com:ro
    
    - /Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/ordererOrganizations/example.com:/fabric/organizations/ordererOrganizations/example.com:ro
```

### 10. 首次启动

```bash
cd ~/projects/FYP

# 1. 确保 Docker Desktop 正在运行
open -a Docker
# 等待 Docker 图标变绿

# 2. 启动 Fabric 网络（使用自动化脚本）
./scripts/start-fabric.sh

# 或者手动启动
cd fabric/fabric-samples/test-network
./network.sh up createChannel
cd ~/projects/FYP/chaincode
./deploy.sh

# 3. 启动应用服务
cd ~/projects/FYP
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看后端日志（确认 Fabric 连接成功）
docker logs fyp-backend | grep "Fabric Gateway"
```

成功标志：
```
✅ Fabric Gateway initialized successfully
```

### 11. 访问应用

```bash
# 前端
open http://localhost:3000

# 后端 API
curl http://localhost:8080/api/campaigns

# 健康检查
curl http://localhost:8080/actuator/health
```

---

## Mac 常见问题

### 问题 1: Permission Denied

```bash
# 错误信息
permission denied while trying to connect to the Docker daemon socket

# 解决方案
# 确保 Docker Desktop 正在运行
open -a Docker

# 等待几秒钟让 Docker 完全启动
sleep 10

# 重新尝试
docker ps
```

### 问题 2: 脚本没有执行权限

```bash
# 错误信息
-bash: ./network.sh: Permission denied

# 解决方案
chmod +x fabric/fabric-samples/test-network/network.sh
chmod +x chaincode/deploy.sh
chmod +x scripts/*.sh
```

### 问题 3: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :7051  # Fabric peer
lsof -i :8080  # Backend API
lsof -i :3000  # Frontend

# 终止进程
kill -9 <PID>

# 或者使用 killall（谨慎使用）
killall -9 node  # 终止所有 Node.js 进程
```

### 问题 4: Docker 空间不足

```bash
# 查看 Docker 使用情况
docker system df

# 清理未使用的资源
docker system prune -a
docker volume prune

# 重启 Docker Desktop
osascript -e 'quit app "Docker"'
sleep 5
open -a Docker
```

### 问题 5: Rosetta 2（Apple Silicon Mac）

如果你使用 Apple Silicon (M1/M2/M3) Mac：

```bash
# 某些镜像可能需要 Rosetta 2
softwareupdate --install-rosetta

# 在 Docker Desktop 设置中启用 Rosetta 2：
# Settings > General > Use Rosetta for x86/amd64 emulation on Apple Silicon
```

### 问题 6: 证书路径错误

```bash
# 验证证书文件是否存在
ls -la ~/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/

# 应该看到: Admin@org1.example.com-cert.pem

# 检查 .env 文件中的路径
cat .env | grep FABRIC_CERT_PATH

# 确保路径正确且文件名是 Admin@org1.example.com-cert.pem
```

### 问题 7: Go 模块问题

```bash
# 进入链码目录
cd ~/projects/FYP/chaincode

# 清理并重新下载依赖
rm -rf vendor/
go clean -modcache
go mod tidy
go mod vendor

# 重新部署
./deploy.sh
```

---

## Mac 日常开发工作流

### 每天开始工作

```bash
# 1. 打开终端 (Terminal.app 或 iTerm2)

# 2. 进入项目目录
cd ~/projects/FYP

# 3. 确保 Docker Desktop 运行
open -a Docker
sleep 10

# 4. 检查 Fabric 网络状态
docker ps | grep -E "(peer|orderer)"

# 如果没有运行，启动它
if [ $? -ne 0 ]; then
    ./scripts/start-fabric.sh
fi

# 5. 启动应用
docker compose up -d

# 6. 查看日志
docker compose logs -f backend
```

### 修改代码后

```bash
# 前端修改（在 Docker 中会自动热重载）
# 无需重启

# 后端修改（需要重新构建）
cd ~/projects/FYP
docker compose build backend
docker compose restart backend

# 链码修改
cd ~/projects/FYP/chaincode
# 修改 chaincode.go 后
./deploy.sh donation . go 1.1 2  # 更新版本号
cd ~/projects/FYP
docker compose restart backend
```

### 结束工作

```bash
# 方法 1: 仅停止应用（Fabric 继续运行）
docker compose stop

# 方法 2: 停止所有服务
./scripts/stop-all.sh

# 方法 3: 完全清理（下次需要重新部署）
./scripts/stop-all.sh
# 然后选择 'y' 清理网络
```

---

## Mac 性能优化建议

### 1. 调整 Docker Desktop 资源

根据你的 Mac 配置调整：

**16GB RAM Mac:**
```
CPUs: 4
Memory: 8 GB
Swap: 2 GB
```

**32GB+ RAM Mac:**
```
CPUs: 6-8
Memory: 12-16 GB
Swap: 2-4 GB
```

### 2. 启用文件共享缓存

在 Docker Desktop 设置中：
```
Settings > Resources > File Sharing
确保项目目录在列表中
启用 "VirtioFS" (更快的文件系统)
```

### 3. 使用本地数据库（开发环境）

如果不需要持久化数据：

```yaml
# docker-compose.yml
postgres:
  # ... 其他配置 ...
  volumes:
    # 注释掉卷挂载，使用容器内存储（更快但不持久）
    # - postgres_data:/var/lib/postgresql/data
```

### 4. 定期清理 Docker

```bash
# 创建定期清理脚本
cat > ~/cleanup-docker.sh << 'EOF'
#!/bin/bash
echo "Cleaning Docker..."
docker system prune -f
docker volume prune -f
docker builder prune -f
echo "Done!"
EOF

chmod +x ~/cleanup-docker.sh

# 每周运行一次
~/cleanup-docker.sh
```

---

## 快速命令参考（Mac）

```bash
# 项目导航
alias fyp='cd ~/projects/FYP'
alias fabric='cd ~/projects/FYP/fabric/fabric-samples/test-network'

# Docker 快捷命令
alias dps='docker ps'
alias dlog='docker compose logs -f'
alias dstart='docker compose up -d'
alias dstop='docker compose down'

# Fabric 快捷命令
alias fabric-up='cd ~/projects/FYP && ./scripts/start-fabric.sh'
alias fabric-down='cd ~/projects/FYP/fabric/fabric-samples/test-network && ./network.sh down'

# 添加到 ~/.zshrc
echo "# FYP Project Aliases" >> ~/.zshrc
echo "alias fyp='cd ~/projects/FYP'" >> ~/.zshrc
echo "alias dlog='docker compose logs -f'" >> ~/.zshrc
source ~/.zshrc
```

---

## 备份和迁移（Mac）

### 备份重要数据

```bash
# 1. 导出数据库
docker exec fyp-postgres pg_dump -U postgres fyp_db > ~/backup-$(date +%Y%m%d).sql

# 2. 备份 .env 文件
cp ~/projects/FYP/.env ~/projects/FYP/.env.backup

# 3. 备份 Fabric 证书（如果需要）
tar -czf ~/fabric-certs-$(date +%Y%m%d).tar.gz \
  ~/projects/FYP/fabric/fabric-samples/test-network/organizations
```

### 在新 Mac 上恢复

```bash
# 1. 克隆项目
git clone https://github.com/PeileLi/FYP.git ~/projects/FYP

# 2. 恢复 .env 文件
cp ~/.env.backup ~/projects/FYP/.env

# 3. 按照配置指南重新设置环境

# 4. 恢复数据库（如果需要）
cat ~/backup-20240125.sql | docker exec -i fyp-postgres psql -U postgres fyp_db
```

---

## 获取帮助

如果遇到问题：

1. **查看日志**
   ```bash
   docker compose logs backend
   docker logs peer0.org1.example.com
   ```

2. **检查 Docker Desktop 日志**
   - 打开 Docker Desktop
   - 点击 "Troubleshoot" 图标
   - 查看日志

3. **重启服务**
   ```bash
   ./scripts/restart-all.sh
   ```

4. **完全重置**
   ```bash
   ./scripts/stop-all.sh
   docker system prune -a
   # 然后重新启动
   ```

---

**最后更新：** 2026-01-25  
**适用于：** macOS Sonoma 14.x 及以上
