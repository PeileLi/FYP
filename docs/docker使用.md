# Docker 使用指南

本项目使用 Docker 和 Docker Compose 进行容器化部署，包含 PostgreSQL 数据库、Spring Boot 后端和 React 前端。

## 前置要求

- 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- 确保 Docker 服务正在运行

## 项目架构

```
├── postgres      端口 5432  - PostgreSQL 数据库
├── backend       端口 8080  - Spring Boot API
└── frontend      端口 3000  - React + Nginx
```

## 常用指令

### 1. 启动所有服务

```bash
# 构建并启动所有容器（后台运行）
docker-compose up -d

# 构建并启动所有容器（查看日志）
docker-compose up

# 强制重新构建后启动
docker-compose up --build
```

### 2. 停止服务

```bash
# 停止所有容器
docker-compose down

# 停止并删除所有数据卷（谨慎使用，会清空数据库）
docker-compose down -v
```

### 3. 查看服务状态

```bash
# 查看运行中的容器
docker-compose ps

# 查看所有容器（包括已停止的）
docker ps -a
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 实时查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# 查看最后50行日志
docker-compose logs --tail=50
```

### 5. 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
docker-compose restart frontend
```

### 6. 单独操作某个服务

```bash
# 启动特定服务
docker-compose up -d backend

# 停止特定服务
docker-compose stop frontend

# 重新构建并启动特定服务
docker-compose up -d --build backend
```

### 7. 进入容器内部

```bash
# 进入后端容器
docker exec -it fyp-backend sh

# 进入数据库容器
docker exec -it fyp-postgres psql -U postgres -d fyp_db

# 进入前端容器
docker exec -it fyp-frontend sh
```

### 8. 清理命令

```bash
# 删除所有已停止的容器
docker container prune

# 删除所有未使用的镜像
docker image prune

# 删除所有未使用的数据卷
docker volume prune

# 清理所有未使用的资源（谨慎使用）
docker system prune -a
```

### 9. 数据库操作

```bash
# 连接到 PostgreSQL
docker exec -it fyp-postgres psql -U postgres -d fyp_db

# 备份数据库
docker exec fyp-postgres pg_dump -U postgres fyp_db > backup.sql

# 恢复数据库
docker exec -i fyp-postgres psql -U postgres fyp_db < backup.sql
```

### 10. 监控资源使用

```bash
# 查看容器资源使用情况
docker stats

# 查看特定容器资源使用
docker stats fyp-backend
```

## 环境变量配置

在项目根目录创建 `.env` 文件来自定义配置：

```env
# 数据库配置
POSTGRES_DB=fyp_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_PORT=5432

# Spring Boot 数据库连接（使用本地 PostgreSQL）
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_secure_password

# 或使用 Supabase（取消注释并填写你的凭据）
# SPRING_DATASOURCE_URL=jdbc:postgresql://your-project.supabase.co:5432/postgres
# SPRING_DATASOURCE_USERNAME=postgres
# SPRING_DATASOURCE_PASSWORD=your_supabase_password

# JWT 配置
JWT_SECRET=your-very-long-secret-key-at-least-32-bytes-long
```

## 服务访问地址

启动成功后，可以通过以下地址访问：

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8080
- **数据库**: localhost:5432

## 常见问题排查

### 端口被占用

```bash
# Windows 查看端口占用
netstat -ano | findstr :8080
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# 结束进程（PID 为上一步查到的进程号）
taskkill /PID <进程号> /F
```

### 容器无法启动

```bash
# 查看详细错误日志
docker-compose logs <service-name>

# 检查容器健康状态
docker inspect fyp-backend
```

### 数据库连接失败

```bash
# 确保数据库容器健康
docker-compose ps

# 等待数据库完全启动（healthcheck）
docker-compose up -d postgres
# 等待10-15秒后再启动其他服务
docker-compose up -d backend frontend
```

### 重新构建镜像

```bash
# 删除旧镜像并重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 开发工作流

### 开发模式

后端代码修改后重新部署：

```bash
docker-compose up -d --build backend
```

前端代码修改后重新部署：

```bash
docker-compose up -d --build frontend
```

### 生产部署

```bash
# 确保使用生产环境变量
# 构建优化后的镜像
docker-compose build --no-cache

# 启动所有服务
docker-compose up -d

# 验证服务状态
docker-compose ps
docker-compose logs -f
```

## 最佳实践

1. **定期备份数据库**：使用 `pg_dump` 定期备份
2. **监控日志**：定期检查 `docker-compose logs`
3. **资源清理**：定期运行 `docker system prune` 清理未使用资源
4. **环境变量**：敏感信息使用 `.env` 文件，不要提交到 Git
5. **健康检查**：利用 Docker 的 healthcheck 确保服务正常
