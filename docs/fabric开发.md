# Fabric Blockchain 开发运行手册

## 目录
- [快速启动](#快速启动)
- [完整启动流程](#完整启动流程)
- [关闭网络](#关闭网络)
- [重启网络](#重启网络)
- [跨平台配置](#跨平台配置)
- [常见问题](#常见问题)
- [验证测试](#验证测试)

---

## 🌟 跨平台支持

本项目**自动适配** Linux、WSL 和 macOS：
- ✅ 脚本自动检测操作系统
- ✅ 使用相对路径，无需手动修改
- ✅ 自动处理平台差异

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
# 进入项目目录
cd /path/to/FYP  # Linux/WSL
cd ~/projects/FYP  # Mac

# 1. 启动 Fabric 网络和链码
./scripts/start-fabric.sh

# 2. 启动应用服务
docker compose up -d

# 3. 验证
docker logs fyp-backend | grep "Fabric Gateway"
```

---

## 完整启动流程

### 步骤 1: 启动 Fabric 测试网络

```bash
# 进入项目根目录
cd /path/to/your/FYP  # 替换为你的实际项目路径

# 进入 Fabric 测试网络目录
cd fabric/fabric-samples/test-network

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
cd chaincode  # 从项目根目录
chmod +x deploy.sh
./deploy.sh

# 方法 2: 手动部署
cd fabric/fabric-samples/test-network
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
cd ../..  # 或直接 cd /path/to/FYP

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

---

## 关闭网络

### 仅关闭应用服务
```bash
cd /path/to/FYP
docker compose down
```

### 关闭所有服务（包括 Fabric）
```bash
# 使用自动化脚本
./scripts/stop-all.sh

# 或手动执行
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down
```

---

## 重启网络

### 场景 1: 正常重启（保留数据）

```bash
# 检查 Fabric 网络是否还在运行
docker ps | grep -E "(peer|orderer)"

# 如果 Fabric 网络还在运行，只需重启应用
docker compose restart

# 如果 Fabric 网络已停止，使用自动化脚本
./scripts/start-fabric.sh
docker compose up -d
```

### 场景 2: 完全重启（清除所有数据）

```bash
# 使用自动化脚本
./scripts/restart-all.sh

# 或手动执行
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down
docker network prune -f

./network.sh up createChannel
cd ../../../chaincode
./deploy.sh
cd ..
docker compose up -d
```

### 场景 3: 仅重启应用（Fabric 保持运行）

```bash
# 重启所有应用服务
docker compose restart

# 或重启特定服务
docker compose restart backend
docker compose restart frontend
```

---

## 跨平台配置

### 🐧 Linux / WSL

#### 1. 安装 Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# 添加用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker-compose --version
```

#### 2. 克隆项目

```bash
cd ~
git clone https://github.com/PeileLi/FYP.git
cd FYP
git submodule update --init --recursive
```

#### 3. 配置环境

```bash
# 复制环境变量模板
cp .env.example .env

# 无需修改路径！docker-compose.yml 使用相对路径自动适配
```

#### 4. 启动

```bash
./scripts/start-fabric.sh
docker compose up -d
```

---

### 🍎 macOS

#### 1. 安装 Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. 安装必要工具

```bash
# 安装 Docker Desktop
brew install --cask docker

# 安装开发工具
brew install go git jq

# 启动 Docker Desktop
open -a Docker
```

#### 3. 配置 Docker Desktop

打开 Docker Desktop → Settings → Resources：
```
CPUs: 4-6
Memory: 8-12 GB
Swap: 2 GB
Disk: 60 GB
```

启用 VirtioFS（更快的文件共享）：
Settings → General → Enable VirtioFS

#### 4. 克隆项目

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/PeileLi/FYP.git
cd FYP
git submodule update --init --recursive
```

#### 5. 下载 Fabric 工具

```bash
cd fabric/fabric-samples
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.14 1.5.15
```

#### 6. 配置环境变量

编辑 `~/.zshrc`（或 `~/.bash_profile`）：
```bash
# 替换为你的实际项目路径
export PATH=$HOME/projects/FYP/fabric/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$HOME/projects/FYP/fabric/fabric-samples/config
```

重新加载：
```bash
source ~/.zshrc
```

#### 7. 配置项目

```bash
cd ~/projects/FYP

# 复制环境变量模板
cp .env.example .env

# 无需修改！docker-compose.yml 使用相对路径自动适配
```

#### 8. 启动

```bash
# 确保 Docker Desktop 运行
open -a Docker
sleep 10

# 启动服务
./scripts/start-fabric.sh
docker compose up -d
```

---

## 环境变量说明

### .env 文件配置

创建 `.env` 文件（从 `.env.example` 复制）：

```env
# 数据库配置（本地开发）
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# JWT 密钥
JWT_SECRET=your-secret-key-at-least-32-bytes-long

# Fabric 配置（无需修改，使用容器内路径）
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=mychannel
FABRIC_CHAINCODE_NAME=donation
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=peer0.org1.example.com:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com

# Fabric 证书路径（容器内路径，自动映射，无需修改）
FABRIC_CERT_PATH=/fabric/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
FABRIC_KEY_PATH=/fabric/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore
FABRIC_TLS_CERT_PATH=/fabric/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
```

### 重要说明

1. **路径配置**
   - `docker-compose.yml` 使用相对路径：`./fabric/fabric-samples/...`
   - 自动适配 Linux/WSL/Mac
   - `.env` 中的路径是容器内路径，无需修改

2. **跨平台兼容**
   - ✅ 项目使用相对路径，自动适配所有平台
   - ✅ 脚本自动检测操作系统
   - ✅ 无需手动修改任何路径配置

3. **Docker 卷挂载**
   ```yaml
   volumes:
     # 相对路径，自动适配
     - ./fabric/fabric-samples/test-network/organizations/...:/fabric/organizations/...
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
# 1. 检查 Fabric 网络是否运行
docker ps | grep peer

# 2. 检查证书文件
ls -la fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/

# 3. 重启服务
./scripts/restart-all.sh
```

### 2. 网络冲突错误

**错误信息：**
```
ERROR: Network "fabric_test" needs to be recreated
```

**解决方案：**
```bash
docker compose down
cd fabric/fabric-samples/test-network
./network.sh down
docker network rm fabric_test
./network.sh up createChannel
```

### 3. Mac: Permission Denied

```bash
chmod +x scripts/*.sh
chmod +x fabric/fabric-samples/test-network/network.sh
chmod +x chaincode/deploy.sh
```

### 4. Mac: Docker 未运行

```bash
# 启动 Docker Desktop
open -a Docker

# 等待启动完成
sleep 10

# 验证
docker ps
```

### 5. 端口冲突

```bash
# Linux/WSL
sudo lsof -i :7051
sudo kill -9 <PID>

# Mac
lsof -i :7051
kill -9 <PID>
```

---

## 验证测试

### 1. 验证 Fabric 网络

```bash
cd fabric/fabric-samples/test-network

# 查询通道
./network.sh peer channel list

# 测试链码
./network.sh cc invoke -c mychannel -ccn donation \
  -ccic '{"function":"CreateCampaign","Args":["TEST001","Alice","2024-01-25T10:00:00","Test",""]}'

# 查询数据
./network.sh cc query -c mychannel -ccn donation \
  -ccqc '{"function":"ReadCampaign","Args":["TEST001"]}'
```

### 2. 验证后端 API

```bash
# 健康检查
curl http://localhost:8080/actuator/health

# 查看活动列表
curl http://localhost:8080/api/campaigns
```

### 3. 验证前端

访问 http://localhost:3000
- 登录系统
- 创建新活动
- 查看区块链证书ID

---

## 开发工作流程

### 日常开发启动

```bash
# 1. 进入项目目录
cd /path/to/FYP  # 或 ~/projects/FYP

# 2. 启动 Fabric（如果未运行）
./scripts/start-fabric.sh

# 3. 启动应用
docker compose up -d

# 4. 查看日志
docker compose logs -f backend
```

### 修改代码后

```bash
# 前端修改 - 自动热重载
# 无需操作

# 后端修改
docker compose build backend
docker compose restart backend

# 链码修改
cd chaincode
# 修改 chaincode.go
./deploy.sh donation . go 1.1 2  # 更新版本号
docker compose restart backend
```

### 停止开发环境

```bash
# 仅停止应用
docker compose stop

# 停止所有服务
./scripts/stop-all.sh
```

---

## 快速参考

### 常用命令

```bash
# 检查状态
docker ps -a
docker compose ps

# 查看日志
docker logs -f fyp-backend
docker logs peer0.org1.example.com

# 重启服务
docker compose restart
./scripts/restart-all.sh

# 清理资源
docker system prune -a
docker volume prune
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

### 文件结构

```
FYP/
├── scripts/              # 自动化脚本
│   ├── start-fabric.sh   # 启动 Fabric
│   ├── stop-all.sh       # 停止所有服务
│   └── restart-all.sh    # 重启所有服务
├── fabric/
│   └── fabric-samples/
│       └── test-network/ # Fabric 测试网络
├── chaincode/            # 智能合约
├── backend/              # Spring Boot 后端
├── frontend/             # React 前端
├── docker-compose.yml    # Docker 编排（使用相对路径）
├── .env                  # 环境变量（从 .env.example 复制）
└── .env.example          # 环境变量模板
```

---

## 故障排查清单

- [ ] Docker 是否运行？ `docker ps`
- [ ] 项目路径是否正确？ `pwd`
- [ ] Fabric 网络是否启动？ `docker ps | grep peer`
- [ ] 链码是否部署？ 查看部署输出
- [ ] 证书文件是否存在？ `ls fabric/.../signcerts/`
- [ ] 端口是否被占用？ `lsof -i :8080`
- [ ] 后端日志有错误？ `docker logs fyp-backend`
- [ ] 网络连接正常？ `docker network ls`

---

## 获取帮助

- 📚 快速参考：`docs/快速参考卡.md`
- 💻 Mac 配置：`docs/MAC配置指南.md`
- 📖 Fabric 文档: https://hyperledger-fabric.readthedocs.io
- 🐛 项目问题: https://github.com/PeileLi/FYP/issues

---

**最后更新：** 2026-01-25  
**版本：** 2.0（跨平台版本）  
**支持平台：** Linux, WSL2, macOS
