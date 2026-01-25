# 自动化脚本使用指南

这个目录包含了用于管理 Fabric 网络和应用服务的自动化脚本。

## 脚本列表

### 1. `start-fabric.sh` - 启动 Fabric 网络

**功能：**
- 检查 Docker 是否运行
- 启动 Fabric 测试网络（如果未运行）
- 创建通道 `mychannel`
- 部署 `donation` 链码

**使用方法：**
```bash
cd /home/li/project/FYP
./scripts/start-fabric.sh
```

**智能特性：**
- 如果网络已在运行，会询问是否重启
- 如果链码已部署，会询问是否重新部署
- 自动显示网络状态摘要

### 2. `stop-all.sh` - 停止所有服务

**功能：**
- 停止应用服务（frontend、backend、postgres）
- 停止 Fabric 网络
- 可选：清理 Docker 网络和卷

**使用方法：**
```bash
cd /home/li/project/FYP
./scripts/stop-all.sh
```

**注意：** 会询问是否清理 Docker 资源，谨慎选择。

### 3. `restart-all.sh` - 完全重启

**功能：**
- 调用 `stop-all.sh` 停止所有服务
- 调用 `start-fabric.sh` 启动 Fabric
- 启动应用服务
- 显示最终状态

**使用方法：**
```bash
cd /home/li/project/FYP
./scripts/restart-all.sh
```

**使用场景：**
- 遇到网络问题需要完全重启
- 修改了配置文件需要重新加载
- 定期维护清理

## 快速开始工作流

### 每日启动

```bash
# 1. 启动 Fabric 网络和链码
./scripts/start-fabric.sh

# 2. 启动应用
docker compose up -d

# 3. 查看日志
docker logs -f fyp-backend
```

### 正常关闭

```bash
# 停止应用（Fabric 继续运行）
docker compose stop

# 或停止所有服务
./scripts/stop-all.sh
```

### 遇到问题时

```bash
# 完全重启所有服务
./scripts/restart-all.sh

# 查看详细日志
docker compose logs backend
docker logs peer0.org1.example.com
```

## 手动操作（不使用脚本）

如果你需要更多控制：

### 手动启动 Fabric

```bash
cd fabric/fabric-samples/test-network

# 启动网络
./network.sh up

# 创建通道
./network.sh createChannel

# 部署链码
cd ../../../chaincode
./deploy.sh
```

### 手动启动应用

```bash
cd /home/li/project/FYP
docker compose up -d
```

### 手动停止

```bash
# 停止应用
docker compose down

# 停止 Fabric
cd fabric/fabric-samples/test-network
./network.sh down
```

## 常见问题

### Q: 脚本提示 "Permission denied"

```bash
chmod +x scripts/*.sh
```

### Q: Fabric 网络启动失败

```bash
# 清理并重试
cd fabric/fabric-samples/test-network
./network.sh down
docker network prune -f
./network.sh up createChannel
```

### Q: 链码部署失败

```bash
# 重新生成依赖
cd chaincode
rm -rf vendor/
go mod tidy
go mod vendor

# 重新部署
./deploy.sh
```

### Q: 后端无法连接到 Fabric

```bash
# 检查证书路径
cat .env | grep FABRIC_CERT_PATH

# 验证文件存在
ls -la fabric/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/

# 重启后端
docker compose restart backend
docker logs fyp-backend | grep Fabric
```

## 脚本输出说明

### 成功标志

```
✅ Docker is running
✅ Fabric network started
✅ Channel created
✅ Chaincode deployed
✅ Fabric Gateway initialized successfully
```

### 警告信息

```
⚠️ Fabric network is already running
⚠️ Chaincode 'donation' is already deployed
```
这些是正常的，脚本会询问你如何处理。

### 错误信息

```
❌ Docker is not running
❌ Failed to start Fabric network
❌ Failed to deploy chaincode
```
请根据具体错误信息进行排查。

## 检查服务状态

```bash
# 查看所有容器
docker ps

# 查看特定容器
docker ps | grep -E "(peer|orderer|fyp)"

# 查看网络
docker network ls

# 查看卷
docker volume ls

# 查看详细状态
docker compose ps
docker stats
```

## 调试技巧

### 查看实时日志

```bash
# 后端日志
docker logs -f fyp-backend

# Fabric peer 日志
docker logs -f peer0.org1.example.com

# 所有应用日志
docker compose logs -f
```

### 进入容器调试

```bash
# 进入后端容器
docker exec -it fyp-backend bash

# 进入 peer 容器
docker exec -it peer0.org1.example.com bash

# 进入数据库
docker exec -it fyp-postgres psql -U postgres fyp_db
```

### 测试 Fabric 连接

```bash
cd fabric/fabric-samples/test-network

# 查询已部署的链码
./network.sh peer lifecycle chaincode querycommitted -C mychannel

# 测试链码调用
./network.sh cc invoke -c mychannel -ccn donation \
  -ccic '{"function":"CreateCampaign","Args":["TEST001","Alice","2024-01-25T10:00:00","Test",""]}'

# 查询测试数据
./network.sh cc query -c mychannel -ccn donation \
  -ccqc '{"function":"ReadCampaign","Args":["TEST001"]}'
```

## 性能优化建议

1. **首次启动后保持 Fabric 运行**
   - Fabric 网络启动较慢（~30秒）
   - 开发时只重启应用，不重启 Fabric

2. **使用 Docker 构建缓存**
   - 修改代码后只重建特定服务
   - `docker compose build backend`

3. **定期清理**
   - 每周运行 `docker system prune`
   - 删除未使用的镜像和容器

## 更多帮助

- 完整开发手册：[docs/fabric开发.md](../docs/fabric开发.md)
- Mac 配置指南：[docs/MAC配置指南.md](../docs/MAC配置指南.md)
- 项目文档：[docs/开发手册.md](../docs/开发手册.md)

---

**最后更新：** 2026-01-25
