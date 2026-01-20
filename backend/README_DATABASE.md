# 数据库连接设置 / Database Connection Setup

本项目支持两种数据库连接方式：
- 🌐 **Supabase Cloud Database** (生产环境推荐)
- 🐳 **Local Docker PostgreSQL** (本地开发推荐)

### 🤔 应该使用哪个数据库？/ Which Database Should I Use?

| 场景 / Scenario | 推荐 / Recommended | 原因 / Reason |
|----------------|-------------------|---------------|
| 本地开发 / Local Development | 🐳 Docker | 快速启动，无需网络，数据隔离 |
| 团队协作 / Team Collaboration | 🌐 Supabase | 共享数据，实时同步 |
| 生产环境 / Production | 🌐 Supabase | 高可用，自动备份，专业管理 |
| 测试/实验 / Testing | 🐳 Docker | 可快速重置，不影响云端数据 |
| 离线开发 / Offline Development | 🐳 Docker | 无需网络连接 |
| CI/CD 测试 / CI/CD Testing | 🐳 Docker | 隔离环境，可重复构建 |

---

## 🐳 选项 1: 使用本地 Docker 数据库（推荐用于开发）

### 快速启动（3 步）

#### Step 1: 启动 Docker 数据库
```bash
# 在项目根目录运行
docker-compose up -d postgres
```

#### Step 2: 配置 .env 文件（或使用默认配置）

**选项 A: 使用默认配置（最简单）**
```bash
cd backend
# 如果没有 .env 文件，创建一个空的或使用以下内容
cat > .env << 'EOF'
# 使用本地 Docker 数据库（默认配置）
# 可以不设置这些变量，application.yml 会使用默认值
# SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
# SPRING_DATASOURCE_USERNAME=postgres
# SPRING_DATASOURCE_PASSWORD=postgres

# JWT Secret
JWT_SECRET=your-secure-jwt-secret-key-here
EOF
```

**选项 B: 显式配置本地数据库**
```env
# 本地 Docker 数据库配置
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# JWT Secret
JWT_SECRET=your-secure-jwt-secret-key-here
```

#### Step 3: 运行应用
```bash
cd backend
./mvnw spring-boot:run
```

### Docker 数据库管理命令

```bash
# 启动数据库
docker-compose up -d postgres

# 停止数据库
docker-compose stop postgres

# 查看数据库日志
docker-compose logs -f postgres

# 重启数据库
docker-compose restart postgres

# 删除数据库（包括数据）
docker-compose down -v postgres

# 进入数据库命令行
docker exec -it fyp-postgres psql -U postgres -d fyp_db
```

### 本地数据库连接信息

| 项目 / Item | 值 / Value |
|------------|-----------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `fyp_db` |
| **Username** | `postgres` |
| **Password** | `postgres` |

---

## 🌐 选项 2: 使用 Supabase 云数据库

### ⚡ 快速设置（只需 2 步）/ Quick Setup (Only 2 Steps)

### Step 1: 创建 .env 文件 / Create .env file

在 `backend/` 目录下创建 `.env` 文件：

```bash
cd backend
cp .env.example .env
```

### Step 2: 填写数据库密码 / Fill in Database Password

编辑 `backend/.env` 文件，**只需替换密码**：

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
SPRING_DATASOURCE_PASSWORD=你的数据库密码
JWT_SECRET=你的JWT密钥
```

**就这么简单！** 其他配置都已经设置好了。

---

## 🔑 获取密码 / Get Your Password

### 方式 1: 从 Supabase 控制台获取
1. 访问 https://app.supabase.com
2. 选择你的项目
3. Settings → Database
4. 查看或重置 Database Password

### 方式 2: 如果已保存
如果你在创建项目时保存了密码，直接使用那个密码。

---

## ✅ 测试连接 / Test Connection

```bash
cd backend
./mvnw spring-boot:run
```

**成功的标志：**
- 控制台显示：`HikariPool-1 - Start completed.`
- 没有数据库连接错误
- 应用成功启动在 `http://localhost:8080`

---

## 📊 连接信息总结 / Connection Summary

| 项目 / Item | 值 / Value |
|------------|-----------|
| **Host** | `aws-1-eu-west-1.pooler.supabase.com` |
| **Port** | `5432` |
| **Database** | `postgres` |
| **Username** | `postgres.jxqrdqnfwqukunugydxd` |
| **Password** | 你的密码 / Your password |
| **Connection Mode** | Session Pool (Supabase Pooler) |

---

## 🎯 优势 / Advantages

您的配置使用了 **Supabase Connection Pooler**，这带来：

✅ **更好的性能** - 连接池自动管理  
✅ **更高的并发** - 支持更多同时连接  
✅ **更稳定** - Session 模式适合 Spring Boot  
✅ **自动优化** - Supabase 自动处理连接管理  

---

## 🛠️ 故障排除 / Troubleshooting

### 本地 Docker 数据库问题

#### 问题：连接被拒绝 (Connection refused)
```bash
# 检查容器是否运行
docker ps | grep fyp-postgres

# 如果没有运行，启动它
docker-compose up -d postgres

# 查看日志
docker-compose logs postgres
```

#### 问题：端口 5432 已被占用
```bash
# 检查占用端口的进程
sudo lsof -i :5432
# 或
sudo netstat -nlp | grep 5432

# 选项 1: 停止占用端口的服务
sudo systemctl stop postgresql

# 选项 2: 修改 docker-compose.yml 中的端口映射
# 将 "5432:5432" 改为 "5433:5432"
# 然后更新 .env 中的 URL 为 jdbc:postgresql://localhost:5433/fyp_db
```

#### 问题：Docker 容器启动失败
```bash
# 查看详细日志
docker-compose logs -f postgres

# 完全重置数据库（会删除所有数据）
docker-compose down -v
docker-compose up -d postgres
```

#### 问题：数据库数据丢失
```bash
# Docker 数据存储在 volume 中，检查 volume
docker volume ls | grep postgres

# 备份数据库
docker exec fyp-postgres pg_dump -U postgres fyp_db > backup.sql

# 恢复数据库
docker exec -i fyp-postgres psql -U postgres fyp_db < backup.sql
```

### Supabase 数据库问题

#### 问题：认证失败
- ✅ 确认密码正确（数据库密码，不是账户密码）
- ✅ 检查用户名完整：`postgres.jxqrdqnfwqukunugydxd`
- ✅ 确认使用的是 Connection Pooler URL

#### 问题：连接超时
- ✅ 检查网络连接
- ✅ 确认 Supabase 项目正在运行
- ✅ 检查防火墙设置

### 通用问题

#### 问题：找不到 .env 文件
- ✅ 确保在 `backend/` 目录下创建
- ✅ 文件名是 `.env` (以点开头)
- ✅ 使用 `ls -la` 查看隐藏文件

#### 问题：应用启动但无法连接数据库
```bash
# 检查 .env 文件是否被正确加载
# 在应用启动日志中查找数据库连接 URL

# 测试数据库连接（本地）
docker exec -it fyp-postgres psql -U postgres -d fyp_db

# 测试数据库连接（Supabase）
psql "postgresql://postgres.jxqrdqnfwqukunugydxd:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
```

---

## 📝 示例 .env 文件 / Example .env File

### 示例 1: 本地 Docker 数据库

```env
# Local Docker PostgreSQL Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=dev-jwt-secret-key-change-in-production
```

### 示例 2: Supabase 云数据库

```env
# Supabase Cloud Database (Connection Pooler)
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
SPRING_DATASOURCE_PASSWORD=your_actual_supabase_password_here

# JWT Configuration
JWT_SECRET=prod-jwt-secret-key-change-this-to-secure-random-string
```

### 示例 3: 注释版本（可快速切换）

```env
# ====================
# 本地开发数据库 / Local Development Database
# ====================
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

# ====================
# Supabase 云数据库 / Supabase Cloud Database
# 使用时取消下面三行的注释，并注释掉上面的本地配置
# ====================
# SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
# SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
# SPRING_DATASOURCE_PASSWORD=your_supabase_password

# ====================
# JWT Configuration
# ====================
JWT_SECRET=your-secure-jwt-secret-key-here
```

**记得替换：**
- `your_actual_supabase_password_here` → 你的 Supabase 数据库密码
- `your-secure-jwt-secret-key-here` → 一个安全的随机字符串（至少 32 字节）

---

## 🔄 如何在数据库之间切换 / How to Switch Between Databases

### 从 Supabase 切换到本地 Docker

1. **停止应用** (如果正在运行)
2. **启动本地数据库**
   ```bash
   docker-compose up -d postgres
   ```
3. **编辑 `.env` 文件**，注释掉 Supabase 配置，使用本地配置：
   ```env
   # Supabase (注释掉)
   # SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
   # SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
   # SPRING_DATASOURCE_PASSWORD=your-supabase-password
   
   # 本地 Docker 数据库（启用）
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=postgres
   
   JWT_SECRET=your-jwt-secret
   ```
4. **重启应用**
   ```bash
   ./mvnw spring-boot:run
   ```

### 从本地 Docker 切换到 Supabase

1. **停止应用** (如果正在运行)
2. **编辑 `.env` 文件**，使用 Supabase 配置：
   ```env
   # 本地数据库（注释掉）
   # SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
   # SPRING_DATASOURCE_USERNAME=postgres
   # SPRING_DATASOURCE_PASSWORD=postgres
   
   # Supabase（启用）
   SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
   SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
   SPRING_DATASOURCE_PASSWORD=your-supabase-password
   
   JWT_SECRET=your-jwt-secret
   ```
3. **（可选）停止本地数据库**
   ```bash
   docker-compose stop postgres
   ```
4. **重启应用**
   ```bash
   ./mvnw spring-boot:run
   ```

### 💡 专业提示 / Pro Tips

**使用环境特定的配置文件：**

你可以创建多个 `.env` 文件来快速切换：

```bash
# 创建本地开发配置
cat > .env.local << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/fyp_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
JWT_SECRET=dev-jwt-secret-key
EOF

# 创建 Supabase 配置
cat > .env.supabase << 'EOF'
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres.jxqrdqnfwqukunugydxd
SPRING_DATASOURCE_PASSWORD=your-supabase-password
JWT_SECRET=prod-jwt-secret-key
EOF

# 切换到本地数据库
cp .env.local .env

# 切换到 Supabase
cp .env.supabase .env
```

**记得：** 将 `.env.local` 和 `.env.supabase` 也添加到 `.gitignore`（已经通过 `.env*` 模式忽略）

---

## 📦 数据迁移 / Data Migration

### 从本地 Docker 导出数据到 Supabase

```bash
# Step 1: 导出本地数据库
docker exec fyp-postgres pg_dump -U postgres -d fyp_db > local_backup.sql

# Step 2: 导入到 Supabase
# 方式 1: 使用 psql (需要安装 PostgreSQL 客户端)
psql "postgresql://postgres.jxqrdqnfwqukunugydxd:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" < local_backup.sql

# 方式 2: 使用 Docker 容器中的 psql
cat local_backup.sql | docker exec -i fyp-postgres psql "postgresql://postgres.jxqrdqnfwqukunugydxd:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
```

### 从 Supabase 导出数据到本地 Docker

```bash
# Step 1: 导出 Supabase 数据
pg_dump "postgresql://postgres.jxqrdqnfwqukunugydxd:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" > supabase_backup.sql

# 或使用 Docker
docker run --rm postgres:15-alpine pg_dump "postgresql://postgres.jxqrdqnfwqukunugydxd:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" > supabase_backup.sql

# Step 2: 导入到本地数据库
docker exec -i fyp-postgres psql -U postgres -d fyp_db < supabase_backup.sql
```

### 使用 Supabase Dashboard 导入/导出

1. 访问 Supabase Dashboard
2. 进入 **Database** → **Backups**
3. 可以下载备份或从 SQL 文件恢复

### ⚠️ 数据迁移注意事项

- 迁移前先备份目标数据库
- 确保两个数据库的 schema 版本一致
- Hibernate `ddl-auto: update` 会自动创建/更新表结构
- 大量数据迁移时考虑使用 `--data-only` 或 `--schema-only` 选项

---

## 🔒 安全提示 / Security Notes

⚠️ **重要：** 
- `.env` 文件已在 `.gitignore` 中，不会被提交到 Git
- 永远不要在代码中硬编码密码
- 不要将 `.env` 文件分享或上传到公共仓库
- 在生产环境使用强密码和安全的 JWT 密钥

---

## 🚀 快速命令参考 / Quick Command Reference

### 本地 Docker 数据库

```bash
# 启动
docker-compose up -d postgres

# 停止
docker-compose stop postgres

# 重启
docker-compose restart postgres

# 查看日志
docker-compose logs -f postgres

# 进入数据库
docker exec -it fyp-postgres psql -U postgres -d fyp_db

# 备份
docker exec fyp-postgres pg_dump -U postgres fyp_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复
docker exec -i fyp-postgres psql -U postgres fyp_db < backup.sql

# 清空数据库（保留结构）
docker exec -it fyp-postgres psql -U postgres -d fyp_db -c "TRUNCATE TABLE users, campaigns, donations CASCADE;"

# 完全删除（包括数据）
docker-compose down -v
```

### 应用管理

```bash
# 运行应用（开发模式）
cd backend
./mvnw spring-boot:run

# 构建应用
./mvnw clean package

# 运行测试
./mvnw test

# 跳过测试构建
./mvnw clean package -DskipTests
```

### 数据库查询示例

```sql
-- 进入数据库后可以执行的 SQL

-- 查看所有表
\dt

-- 查看表结构
\d users
\d campaigns
\d donations

-- 查询数据
SELECT * FROM users;
SELECT * FROM campaigns;
SELECT * FROM donations;

-- 清空表
TRUNCATE TABLE users CASCADE;

-- 删除表
DROP TABLE IF EXISTS users CASCADE;

-- 退出
\q
```

---

## 📚 更多信息 / More Information

### 文档资源
- 🐳 Docker Compose 配置：`../docker-compose.yml`
- 🌐 Supabase 详细设置：`SUPABASE_SETUP.md`
- ⚡ 快速入门指南：`DATABASE_SETUP_QUICKSTART.md`

### 外部文档
- [Supabase 数据库文档](https://supabase.com/docs/guides/database)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Spring Boot 数据库配置](https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html#appendix.application-properties.data)
- [Docker Compose 文档](https://docs.docker.com/compose/)

---

## 🎯 总结 / Summary

### 推荐工作流 / Recommended Workflow

1. **本地开发** → 使用 Docker PostgreSQL
   ```bash
   docker-compose up -d postgres
   # .env 使用本地配置
   ./mvnw spring-boot:run
   ```

2. **团队协作/测试** → 切换到 Supabase
   ```bash
   # 更新 .env 为 Supabase 配置
   ./mvnw spring-boot:run
   ```

3. **生产部署** → 使用 Supabase
   - 设置环境变量
   - 配置 CI/CD
   - 启用自动备份

### 快速切换

```bash
# 切换到本地
cp .env.local .env
docker-compose up -d postgres
./mvnw spring-boot:run

# 切换到 Supabase
cp .env.supabase .env
./mvnw spring-boot:run
```

---

**准备好了吗？开始开发！** 🚀

```bash
# 本地开发快速启动
docker-compose up -d postgres
cd backend
./mvnw spring-boot:run
```
