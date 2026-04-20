# SDK Share Platform 部署手册

## 架构说明

### 前后端分离架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户浏览器                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (可选)                                  │
│                    - HTTPS 终结                                  │
│                    - 负载均衡                                    │
│                    - 静态资源缓存                                │
│                    - API 缓存                                    │
└─────────┬───────────────────────────────────┬───────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────────────────┐
│  前端 (Next.js)     │           │      后端 (FastAPI)              │
│  Port: 3000/5000    │           │      Port: 8000                 │
│                     │           │                                 │
│  - React 19         │◄─────────►│  - Python 3.11                  │
│  - TypeScript       │   API     │  - FastAPI                      │
│  - Tailwind CSS     │   调用     │  - Gunicorn + Uvicorn           │
│  - shadcn/ui        │           │  - 异步 I/O                      │
└─────────────────────┘           └───────────────┬─────────────────┘
                                                  │
                  ┌───────────────────────────────┼───────────────────┐
                  ▼                               ▼                   ▼
        ┌─────────────────┐           ┌─────────────────┐   ┌───────────────┐
        │ Supabase        │           │ Redis           │   │ 日志/监控     │
        │ (PostgreSQL)    │           │ (缓存)          │   │               │
        └─────────────────┘           └─────────────────┘   └───────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Next.js 16 + React 19 | 用户界面 |
| **后端** | Python 3.11 + FastAPI | 高性能异步 API |
| **数据库** | Supabase (PostgreSQL) | 托管数据库服务 |
| **缓存** | Redis 7 | 高性能缓存，减轻数据库压力 |
| **反向代理** | Nginx | HTTPS、负载均衡、缓存 |
| **容器化** | Docker + Docker Compose | 一键部署 |

---

## 快速部署

### 1. 环境准备

```bash
# 检查 Docker
docker --version
# Docker version 20.10+ required

# 检查 Docker Compose
docker-compose --version
# Docker Compose version 2.0+ required
```

### 2. 获取代码

```bash
git clone <your-repo-url> sdk-share
cd sdk-share
```

### 3. 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑配置
vim .env
```

**必须配置的变量：**

```bash
# Supabase 数据库（必需）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 公网域名（用于生成嵌入代码）
FRONTEND_DOMAIN=https://your-domain.com
```

### 4. 启动服务

```bash
# 基础部署（前端 + 后端 + Redis）
docker-compose up -d

# 生产部署（含 Nginx）
docker-compose --profile production up -d
```

### 5. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 检查后端健康
curl http://localhost:8000/health

# 检查前端
curl http://localhost:3000

# 检查 API
curl http://localhost:8000/api/sdk
```

---

## 高并发优化

### 1. 后端优化

| 配置项 | 说明 | 建议值 |
|--------|------|--------|
| `WORKERS` | Gunicorn Worker 数量 | CPU 核心数 × 2 + 1 |
| `DATABASE_POOL_SIZE` | 数据库连接池大小 | 20-50 |
| `CACHE_ENABLED` | Redis 缓存开关 | true |
| `CACHE_TTL` | 缓存过期时间（秒） | 300 |
| `RATE_LIMIT_REQUESTS` | 限流阈值（每分钟） | 100-1000 |

### 2. Redis 缓存

```bash
# Redis 配置（docker-compose.yml 中）
command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

**缓存策略：**
- SDK 列表缓存 60 秒
- SDK 详情缓存 300 秒
- SDK 嵌入代码缓存 3600 秒

### 3. Nginx 缓存

```nginx
# API 响应缓存
proxy_cache api_cache;
proxy_cache_valid 200 10m;

# SDK 嵌入代码长缓存
location ~ ^/api/sdk/[^/]+/embed$ {
    proxy_cache_valid 200 1h;
}
```

### 4. 连接池配置

```bash
# 后端数据库连接池
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Nginx 连接池
upstream backend_upstream {
    server backend:8000;
    keepalive 32;  # 保持 32 个长连接
}
```

---

## 性能指标

### 预期性能（4 核 8G 服务器）

| 指标 | 数值 |
|------|------|
| QPS（每秒请求） | 2000-5000 |
| 平均响应时间 | < 50ms |
| P99 响应时间 | < 200ms |
| 并发连接数 | 10000+ |

### 压测命令

```bash
# 安装 wrk
sudo apt install wrk

# 压测 API
wrk -t 4 -c 100 -d 30s http://localhost:8000/api/sdk

# 压测 SDK 嵌入代码
wrk -t 4 -c 100 -d 30s http://localhost:8000/api/sdk/[token]/embed
```

---

## 扩容方案

### 水平扩展

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3  # 启动 3 个实例
```

### 负载均衡

```nginx
upstream backend_upstream {
    least_conn;  # 最少连接算法
    server backend-1:8000;
    server backend-2:8000;
    server backend-3:8000;
    keepalive 32;
}
```

### Redis 集群

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
```

---

## 监控与日志

### 查看日志

```bash
# 后端日志
docker-compose logs -f backend

# 前端日志
docker-compose logs -f frontend

# Nginx 日志
docker-compose logs -f nginx
```

### Prometheus 监控（可选）

```bash
# 安装监控
docker-compose --profile monitoring up -d

# 访问指标
curl http://localhost:8000/metrics
```

---

## 常见问题

### 1. 后端启动失败

```bash
# 检查环境变量
docker-compose exec backend env | grep SUPABASE

# 检查日志
docker-compose logs backend
```

### 2. 数据库连接失败

```bash
# 测试 Supabase 连接
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"
```

### 3. Redis 连接失败

```bash
# 检查 Redis 状态
docker-compose exec redis redis-cli ping
# 应返回 PONG
```

### 4. 跨域问题

```bash
# 确保 .env 中配置正确
CORS_ORIGINS=["*"]
```

---

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建
docker-compose build --no-cache

# 重启服务
docker-compose up -d

# 验证
docker-compose logs -f
```

---

## 备份与恢复

### 备份数据

```bash
# Supabase 控制台自动备份

# Redis 数据备份
docker-compose exec redis redis-cli BGSAVE
docker cp sdk-share-redis:/data/dump.rdb ./backup/redis-$(date +%Y%m%d).rdb
```

---

## 联系支持

如有问题，请提交 Issue 或联系开发团队。
