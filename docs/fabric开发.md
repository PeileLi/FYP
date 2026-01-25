# Fabric Blockchain 开发运行手册

## 目录
- [快速启动](#快速启动)
- [完整启动流程](#完整启动流程)
- [关闭网络](#关闭网络)
- [重启网络](#重启网络)
- [Mac 配置指南](#mac-配置指南)
- [常见问题](#常见问题)
- [验证测试](#验证测试)

---

## 快速启动

### 前提条件检查
```bash
# 检查 Docker 是否运行
docker ps

# 检查 Fabric 网络状态
docker ps | grep -E "(peer|orderer)"
```

### 一键启动（推荐）
```bash
# 从项目根目录执行
cd /home/li/project/FYP

# 1. 启动 Fabric 网络和链码
./scripts/start-fabric.sh

# 2. 启动应用服务
docker compose up -d
```

如果没有启动脚本，请按照下面的完整启动流程操作。

---

## 完整启动流程

### 步骤 1: 启动 Fabric 测试网络

```bash
# 进入 Fabric 测试网络目录
cd /home/li/project/FYP/fabric/fabric-samples/test-network

# 启动网络（使用 cryptogen 生成证书，更快）
./network.sh up

# 创建通道
./network.sh createChannel

# 或者一步完成（使用 CA，生产环境推荐）
# ./network.sh up createChannel -ca
```

**成功标志：**
```
✔ Container orderer.example.com      Running
✔ Container peer0.org1.example.com   Running  
✔ Container peer0.org2.example.com   Running
Channel 'mychannel' joined
```

### 步骤 2: 部署链码

```bash
# 方法 1: 使用部署脚本（推荐）
cd /home/li/project/FYP/chaincode
chmod +x deploy.sh
./deploy.sh

# 方法 2: 手动部署
cd /home/li/project/FYP/fabric/fabric-samples/test-network
./network.sh deployCC \
  -ccn donation \
  -ccp ../../../chaincode \
  -ccl go \
  -ccv 1.0 \
  -ccs 1
```

**成功标志：**
```
✅ Chaincode Deployed Successfully!
Chaincode definition committed on channel 'mychannel'
```

### 步骤 3: 启动应用服务

```bash
# 返回项目根目录
cd /home/li/project/FYP

# 启动后端、前端和数据库
docker compose up -d

# 查看容器状态
docker compose ps

# 查看后端日志（确认 Fabric 连接成功）
docker logs fyp-backend | grep "Fabric Gateway"
```

**成功标志：**
```
✅ Fabric Gateway initialized successfully
```

### 步骤 4: 验证系统

```bash
# 检查所有容器状态
docker ps

# 访问前端
open http://localhost:3000

# 测试后端 API
curl http://localhost:8080/api/campaigns
```

---

## 关闭网络

### 仅关闭应用服务
```bash
cd /home/li/project/FYP
docker compose down
```

### 关闭所有服务（包括 Fabric）
```bash
# 1. 关闭应用服务
cd /home/li/project/FYP
docker compose down

# 2. 关闭 Fabric 网络
cd fabric/fabric-samples/test-network
./network.sh down

# 3. 清理 Docker 网络（可选）
docker network prune -f
```

---

## 重启网络

### 场景 1: 正常重启（保留数据）

```bash
# 1. 检查 Fabric 网络是否还在运行
cd /home/li/project/FYP/fabric/fabric-samples/test-network
docker ps | grep -E "(peer|orderer)"

# 如果 Fabric 网络还在运行，只需重启应用
cd /home/li/project/FYP
docker compose restart

# 如果 Fabric 网络已停止，按完整启动流程操作
```

### 场景 2: 完全重启（清除所有数据）

```bash
# 1. 关闭所有服务
cd /home/li/project/FYP
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down

# 2. 清理环境
docker network prune -f
docker volume prune -f  # 注意：这会删除所有未使用的卷

# 3. 重新启动（按完整启动流程）
./network.sh up createChannel
cd /home/li/project/FYP/chaincode
./deploy.sh
cd /home/li/project/FYP
docker compose up -d
```

### 场景 3: 仅重启应用（Fabric 保持运行）

```bash
cd /home/li/project/FYP

# 重启所有服务
docker compose restart

# 或重启特定服务
docker compose restart backend
docker compose restart frontend
```

---

## Mac 配置指南

### 1. 安装 Homebrew（如果还没安装）

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 安装必要工具

```bash
# 安装 Docker Desktop for Mac
# 从官网下载: https://www.docker.com/products/docker-desktop

# 安装 Go (链码开发需要)
brew install go

# 验证 Go 安装
go version  # 应该显示 go1.21 或更高版本

# 安装 jq (JSON 处理工具)
brew install jq

# 安装 Git
brew install git
```

### 3. 配置 Docker Desktop

```bash
# 打开 Docker Desktop
open -a Docker

# 配置资源（Settings > Resources）
# 推荐配置：
# - CPUs: 4 cores
# - Memory: 8 GB
# - Swap: 2 GB
# - Disk: 60 GB
```

### 4. 克隆项目（如果是新机器）

```bash
# 创建工作目录
mkdir -p ~/projects
cd ~/projects

# 克隆项目
git clone https://github.com/PeileLi/FYP.git
cd FYP

# 初始化子模块
git submodule update --init --recursive
```

### 5. 下载 Fabric 二进制文件和 Docker 镜像

```bash
cd ~/projects/FYP/fabric

# 下载 Fabric 2.5.x
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.14 1.5.15

# 或手动下载
# curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary docker

# 验证安装
cd fabric-samples/test-network
ls -l ../bin/  # 应该看到 peer, orderer, configtxgen 等工具
```

### 6. 配置环境变量（Mac 专用）

```bash
# 编辑 shell 配置文件
# 如果使用 zsh (macOS Catalina+)
nano ~/.zshrc

# 如果使用 bash
nano ~/.bash_profile

# 添加以下内容：
export PATH=$HOME/projects/FYP/fabric/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/projects/FYP/fabric/fabric-samples/config

# 保存并重新加载
source ~/.zshrc  # 或 source ~/.bash_profile

# 验证
peer version
configtxgen -version
```

### 7. 配置 .env 文件（Mac 路径）

```bash
cd ~/projects/FYP

# 复制并编辑 .env 文件
cp .env.example .env
nano .env
```

修改 Mac 上的路径配置：
```env
# 使用 Mac 的绝对路径
FABRIC_CERT_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem

FABRIC_KEY_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore

FABRIC_TLS_CERT_PATH=/Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
```

### 8. 修改 docker-compose.yml（Mac 路径）

```yaml
# 在 backend 服务的 volumes 部分
volumes:
  # Mac 路径（使用你的实际用户名）
  - /Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com:/fabric/organizations/peerOrganizations/org1.example.com:ro
  - /Users/yourusername/projects/FYP/fabric/fabric-samples/test-network/organizations/ordererOrganizations/example.com:/fabric/organizations/ordererOrganizations/example.com:ro
```

### 9. Mac 上的启动流程

```bash
# 1. 确保 Docker Desktop 正在运行
open -a Docker
# 等待 Docker Desktop 启动完成（菜单栏图标停止动画）

# 2. 启动 Fabric 网络
cd ~/projects/FYP/fabric/fabric-samples/test-network
./network.sh up createChannel

# 3. 部署链码
cd ~/projects/FYP/chaincode
./deploy.sh

# 4. 启动应用
cd ~/projects/FYP
docker compose up -d

# 5. 查看日志
docker logs -f fyp-backend
```

### 10. Mac 特有问题处理

#### 问题 1: Permission Denied
```bash
# 给脚本添加执行权限
chmod +x fabric/fabric-samples/test-network/network.sh
chmod +x chaincode/deploy.sh
```

#### 问题 2: 端口被占用
```bash
# 查看端口占用
lsof -i :7051  # Fabric peer
lsof -i :8080  # Backend
lsof -i :3000  # Frontend

# 终止占用端口的进程
kill -9 <PID>
```

#### 问题 3: Docker 资源不足
```bash
# 清理 Docker 资源
docker system prune -a
docker volume prune

# 重启 Docker Desktop
```

---

## 常见问题

### 1. Fabric Gateway 连接失败

**错误信息：**
```
❌ Failed to initialize Fabric Gateway: Certificate not found
```

**解决方案：**
```bash
# 检查证书文件是否存在
ls -la fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/

# 确保 .env 文件中的证书路径正确
# 文件名应该是: Admin@org1.example.com-cert.pem (不是 cert.pem)
```

### 2. 网络冲突错误

**错误信息：**
```
ERROR: Network "fabric_test" needs to be recreated
```

**解决方案：**
```bash
# 1. 停止所有容器
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down

# 2. 删除网络
docker network rm fabric_test

# 3. 重新启动
./network.sh up createChannel
```

### 3. 端口冲突

**错误信息：**
```
Error: bind: address already in use
```

**解决方案：**
```bash
# Linux/WSL
sudo lsof -i :7051
sudo kill -9 <PID>

# Mac
lsof -i :7051
kill -9 <PID>

# 或者修改端口配置
```

### 4. 链码部署失败

**错误信息：**
```
Error: chaincode install failed
```

**解决方案：**
```bash
# 1. 检查 Go 模块
cd chaincode
go mod tidy
go mod vendor

# 2. 重新部署
cd ../fabric/fabric-samples/test-network
./network.sh deployCC -ccn donation -ccp ../../../chaincode -ccl go
```

### 5. 证书过期

**解决方案：**
```bash
# 重新生成证书
cd fabric/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca

# 重新部署链码
cd ../../chaincode
./deploy.sh

# 重启应用
cd ..
docker compose restart backend
```

---

## 验证测试

### 1. 验证 Fabric 网络

```bash
cd fabric/fabric-samples/test-network

# 查询通道信息
./network.sh peer channel list

# 测试链码
./network.sh cc invoke -c mychannel -ccn donation \
  -ccic '{"function":"CreateCampaign","Args":["TEST001","Alice","2024-01-25T10:00:00","Test Campaign",""]}'

# 查询测试数据
./network.sh cc query -c mychannel -ccn donation \
  -ccqc '{"function":"ReadCampaign","Args":["TEST001"]}'
```

### 2. 验证后端 API

```bash
# 健康检查
curl http://localhost:8080/actuator/health

# 登录获取 token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# 创建活动
curl -X POST http://localhost:8080/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Education",
    "description": "Test blockchain campaign",
    "goalAmount": 1000,
    "imageUrl": "https://example.com/image.jpg"
  }'

# 查看所有活动
curl http://localhost:8080/api/campaigns
```

### 3. 验证区块链集成

```bash
# 查看后端日志，确认区块链操作
docker logs fyp-backend | grep -i "blockchain"

# 应该看到类似：
# Campaign created on blockchain: 1 with Certificate ID: BC_...
```

### 4. 前端测试

1. 打开浏览器访问 `http://localhost:3000`
2. 登录系统
3. 创建新的活动
4. 在活动详情页查看是否显示 "Blockchain Certificate ID"
5. 点击 "Verify on Blockchain" 验证数据

---

## 开发工作流程

### 日常开发启动

```bash
# 1. 检查 Fabric 是否在运行
cd /home/li/project/FYP/fabric/fabric-samples/test-network
docker ps | grep -E "(peer|orderer)"

# 如果未运行，启动它
if [ $? -ne 0 ]; then
    ./network.sh up createChannel
    cd ../../chaincode
    ./deploy.sh
fi

# 2. 启动应用（如果未运行）
cd /home/li/project/FYP
docker compose up -d

# 3. 查看日志
docker compose logs -f backend
```

### 修改链码后重新部署

```bash
# 1. 修改 chaincode/chaincode.go

# 2. 更新版本号并重新部署
cd chaincode
./deploy.sh donation . go 1.1 2  # 版本 1.1, 序列 2

# 3. 重启后端
cd ..
docker compose restart backend
```

### 停止开发环境

```bash
# 仅停止应用（Fabric 继续运行）
docker compose stop

# 停止所有服务
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down
```

---

## 生产环境部署注意事项

### 1. 使用 CA 生成证书
```bash
./network.sh up createChannel -ca
```

### 2. 配置 TLS 证书
```bash
# 确保所有连接使用 TLS
FABRIC_PEER_ENDPOINT=peer0.org1.example.com:7051
# 不要使用 localhost
```

### 3. 安全配置
```env
# 修改 JWT secret
JWT_SECRET=your-long-random-secret-key-at-least-32-bytes

# 使用环境变量存储敏感信息
# 不要提交 .env 文件到 Git
```

### 4. 监控和日志
```bash
# 启用日志收集
docker compose logs -f > logs/app.log

# 监控 Fabric 网络
cd fabric/fabric-samples/test-network
./network.sh monitoring
```

---

## 快速参考

### 常用命令

```bash
# 检查所有容器状态
docker ps -a

# 查看网络
docker network ls

# 查看卷
docker volume ls

# 清理未使用的资源
docker system prune -a

# 重启 Fabric 网络
cd fabric/fabric-samples/test-network
./network.sh restart

# 重启应用
docker compose restart

# 查看实时日志
docker compose logs -f

# 进入容器调试
docker exec -it fyp-backend bash
```

### 重要路径

```bash
# 项目根目录
/home/li/project/FYP

# Fabric 网络
/home/li/project/FYP/fabric/fabric-samples/test-network

# 链码
/home/li/project/FYP/chaincode

# 后端
/home/li/project/FYP/backend

# 前端
/home/li/project/FYP/frontend

# 证书目录
/home/li/project/FYP/fabric/fabric-samples/test-network/organizations
```

### 重要端口

| 服务 | 端口 | 说明 |
|-----|------|------|
| Frontend | 3000 | React 前端 |
| Backend | 8080 | Spring Boot API |
| PostgreSQL | 5432 | 数据库 |
| Peer Org1 | 7051 | Fabric peer |
| Peer Org2 | 9051 | Fabric peer |
| Orderer | 7050 | Fabric orderer |
| CA Org1 | 7054 | Certificate Authority |

---

## 故障排查清单

- [ ] Docker Desktop 是否运行？
- [ ] 所有容器是否健康？ `docker ps`
- [ ] Fabric 网络是否启动？ `docker ps | grep peer`
- [ ] 链码是否部署？ 查看 `deploy.sh` 输出
- [ ] 证书路径是否正确？ 检查 `.env` 文件
- [ ] 端口是否被占用？ `lsof -i :8080`
- [ ] 后端日志是否有错误？ `docker logs fyp-backend`
- [ ] 网络连接是否正常？ `docker network inspect fabric_test`

---

## 获取帮助

- Hyperledger Fabric 文档: https://hyperledger-fabric.readthedocs.io
- Fabric Samples: https://github.com/hyperledger/fabric-samples
- 项目问题: https://github.com/PeileLi/FYP/issues

---

**最后更新：** 2026-01-25  
**版本：** 1.0
