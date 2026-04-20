# SDK 分享平台 - 内网离线部署文档

## 概述

本文档指导如何在内网无网络环境下部署 SDK 分享平台，所有依赖已打包进镜像。

## 端口规划（可自定义）

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| 前端 (Next.js) | 5000 | 容器内部端口，宿主机映射可自定义 |
| 后端 (FastAPI) | 8000 | 容器内部端口，宿主机映射可自定义 |
| PostgreSQL | 5432 | 外网数据库，内网需自建 |
| Redis | 6379 | 外网缓存，内网需自建 |

## 前置准备

### 1. 有网络环境的机器准备镜像

在有网络的机器上执行以下步骤：

#### 1.1 准备基础镜像

```bash
# 拉取所需的基础镜像
docker pull node:20-alpine
docker pull python:3.11-slim

# 保存基础镜像（用于内网导入）
docker save node:20-alpine -o node-20-alpine.tar
docker save python:3.11-slim -o python-3.11-slim.tar
```

#### 1.2 构建应用镜像

```bash
# 进入项目目录
cd sdkprojects

# 构建前端镜像
docker build -t sdk-platform-frontend:v1.0.0 -f Dockerfile .

# 构建后端镜像
docker build -t sdk-platform-backend:v1.0.0 -f backend/Dockerfile ./backend

# 保存应用镜像
docker save sdk-platform-frontend:v1.0.0 -o sdk-platform-frontend-v1.0.0.tar
docker save sdk-platform-backend:v1.0.0 -o sdk-platform-backend-v1.0.0.tar
```

#### 1.3 准备配置文件

创建 `intranet-config.zip` 包含：
- `docker-compose.intranet.yml` - 内网专用编排文件
- `.env.intranet` - 内网环境变量
- `init-db.sql` - 数据库初始化脚本

### 2. 传输到内网

将以下文件传输到内网服务器：
```
node-20-alpine.tar
python-3.11-slim.tar
sdk-platform-frontend-v1.0.0.tar
sdk-platform-backend-v1.0.0.tar
intranet-config.zip
```

## 内网部署步骤

### 1. 导入镜像

```bash
# 加载基础镜像
docker load -i node-20-alpine.tar
docker load -i python-3.11-slim.tar

# 加载应用镜像
docker load -i sdk-platform-frontend-v1.0.0.tar
docker load -i sdk-platform-backend-v1.0.0.tar

# 验证镜像
docker images
```

### 2. 准备内网基础设施

#### 2.1 部署 PostgreSQL（内网）

```bash
# 使用已有 PostgreSQL 或 Docker 部署
docker run -d \
  --name sdk-postgres \
  -e POSTGRES_USER=sdkuser \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=sdkplatform \
  -p 5432:5432 \
  -v /data/postgres:/var/lib/postgresql/data \
  postgres:15-alpine

# 初始化数据库
docker cp init-db.sql sdk-postgres:/tmp/
docker exec sdk-postgres psql -U sdkuser -d sdkplatform -f /tmp/init-db.sql
```

#### 2.2 部署 Redis（内网）

```bash
# 使用已有 Redis 或 Docker 部署
docker run -d \
  --name sdk-redis \
  -p 6379:6379 \
  -v /data/redis:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

### 3. 配置环境变量

创建 `.env` 文件：

```env
# ============================================
# 内网部署环境变量配置
# ============================================

# 前端端口映射（宿主机端口:容器端口5000）
FRONTEND_PORT=8080

# 后端端口映射（宿主机端口:容器端口8000）
BACKEND_PORT=8081

# ============================================
# 数据库配置（内网 PostgreSQL）
# ============================================
DATABASE_URL=postgresql://sdkuser:your_password@192.168.1.100:5432/sdkplatform

# ============================================
# Redis 配置（内网 Redis）
# ============================================
REDIS_URL=redis://192.168.1.100:6379/0

# ============================================
# JWT 密钥（请修改为强密码）
# ============================================
SECRET_KEY=your-strong-secret-key-here-min-32-characters

# ============================================
# Supabase 配置（内网部署可不配置）
# ============================================
SUPABASE_URL=
SUPABASE_ANON_KEY=

# ============================================
# 应用配置
# ============================================
APP_NAME=SDK Share Platform
APP_VERSION=1.0.0
ENVIRONMENT=production
DEBUG=false

# ============================================
# 后端工作进程数
# ============================================
WORKERS=4

# ============================================
# 数据库连接池
# ============================================
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# ============================================
# 缓存配置
# ============================================
CACHE_ENABLED=true
CACHE_TTL=300

# ============================================
# 限流配置
# ============================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100

# ============================================
# 前端域名（用于 CORS，内网 IP 或域名）
# ============================================
FRONTEND_DOMAIN=http://192.168.1.100:8080

# ============================================
# API URL（前端调用后端的地址）
# ============================================
NEXT_PUBLIC_API_URL=http://192.168.1.100:8081
```

### 4. 创建内网专用 Docker Compose

创建 `docker-compose.intranet.yml`：

```yaml
version: '3.8'

services:
  # ==========================================
  # 前端服务 (Next.js)
  # ==========================================
  frontend:
    image: sdk-platform-frontend:v1.0.0
    container_name: sdk-share-frontend
    restart: unless-stopped
    ports:
      - "${FRONTEND_PORT:-8080}:5000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8081}
    networks:
      - sdk-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ==========================================
  # 后端服务 (FastAPI)
  # ==========================================
  backend:
    image: sdk-platform-backend:v1.0.0
    container_name: sdk-share-backend
    restart: unless-stopped
    ports:
      - "${BACKEND_PORT:-8081}:8000"
    environment:
      - ENVIRONMENT=production
      - DEBUG=${DEBUG:-false}
      - HOST=0.0.0.0
      - PORT=8000
      - WORKERS=${WORKERS:-4}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - CACHE_ENABLED=${CACHE_ENABLED:-true}
      - CACHE_TTL=${CACHE_TTL:-300}
      - RATE_LIMIT_ENABLED=${RATE_LIMIT_ENABLED:-true}
      - RATE_LIMIT_REQUESTS=${RATE_LIMIT_REQUESTS:-100}
      - FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-}
    networks:
      - sdk-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  sdk-network:
    driver: bridge
```

### 5. 启动服务

```bash
# 使用内网配置启动
docker-compose -f docker-compose.intranet.yml --env-file .env up -d

# 查看日志
docker-compose -f docker-compose.intranet.yml logs -f

# 查看状态
docker-compose -f docker-compose.intranet.yml ps
```

### 6. 验证部署

```bash
# 检查前端
curl http://localhost:8080

# 检查后端健康
curl http://localhost:8081/health

# 检查 API
curl http://localhost:8081/api/health
```

## 常见问题

### 1. 数据库连接失败

检查内网 PostgreSQL 是否允许远程连接：
```bash
# 修改 pg_hba.conf 允许内网访问
host    all             all             192.168.0.0/16          scram-sha-256

# 修改 postgresql.conf
listen_addresses = '*'
```

### 2. Redis 连接失败

检查 Redis 是否允许远程连接：
```bash
# 修改 redis.conf
bind 0.0.0.0
protected-mode no
```

### 3. 前端无法访问后端

检查 `.env` 中的 `NEXT_PUBLIC_API_URL` 是否为内网可访问的地址。

### 4. 端口冲突

修改 `.env` 中的端口配置：
```env
FRONTEND_PORT=9090
BACKEND_PORT=9091
```

## 升级维护

### 升级版本

```bash
# 1. 停止服务
docker-compose -f docker-compose.intranet.yml down

# 2. 备份数据
docker exec sdk-postgres pg_dump -U sdkuser sdkplatform > backup.sql

# 3. 导入新镜像
docker load -i sdk-platform-frontend-v1.1.0.tar
docker load -i sdk-platform-backend-v1.1.0.tar

# 4. 修改 docker-compose.intranet.yml 中的镜像版本

# 5. 启动服务
docker-compose -f docker-compose.intranet.yml up -d
```

## 安全建议

1. **修改默认密钥**：务必修改 `SECRET_KEY`
2. **数据库密码**：使用强密码
3. **防火墙**：只开放必要的端口
4. **定期备份**：数据库定期备份
5. **日志审计**：定期检查日志

## 联系支持

如有问题，请联系技术支持。
