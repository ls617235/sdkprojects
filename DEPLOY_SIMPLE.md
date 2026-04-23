# SDK 分享平台 - Docker 镜像部署指南

## 一、本地打包

### 前端打包

```powershell
cd f:/sdkprojects
docker build -t sdk-share-frontend:1.0.0 .
docker save sdk-share-frontend:1.0.0 -o sdk-share-frontend-1.0.0.tar
```

### 后端打包

```powershell
cd f:/sdkprojects/backend
docker build -t sdk-share-backend:1.0.0 .
docker save sdk-share-backend:1.0.0 -o sdk-share-backend-1.0.0.tar
```

---

## 二、传输到服务器

```powershell
scp f:/sdkprojects/sdk-share-frontend-1.0.0.tar user@服务器IP:/opt/
scp f:/sdkprojects/backend/sdk-share-backend-1.0.0.tar user@服务器IP:/opt/
```

---

## 三、服务器部署

### 1. 加载镜像

```bash
ssh user@服务器IP
cd /opt
docker load -i sdk-share-frontend-1.0.0.tar
docker load -i sdk-share-backend-1.0.0.tar
```

### 2. 启动前端

```bash
docker run -d \
  --name sdk-share-frontend \
  --restart unless-stopped \
  -p 3000:5000 \
  -e NEXT_PUBLIC_API_URL=http://服务器IP:8000 \
  -e NEXT_PUBLIC_FRONTEND_URL=http://服务器IP:3000 \
  -e PORT=5000 \
  sdk-share-frontend:1.0.0
```

### 3. 启动后端

```bash
docker run -d \
  --name sdk-share-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  -e DATABASE_URL=postgres://postgres:密码@数据库IP:5432/postgres \
  -e CACHE_ENABLED=false \
  -e CORS_ORIGINS='["*"]' \
  -e FRONTEND_DOMAIN=http://服务器IP:3000 \
  sdk-share-backend:1.0.0
```

---

## 四、验证

```bash
curl http://localhost:3000           # 前端
curl http://localhost:8000/health    # 后端
```

---

## 五、更新

### 本地重新打包

```powershell
# 前端
cd f:/sdkprojects
docker build -t sdk-share-frontend:2.0.0 . 
docker save sdk-share-frontend:2.0.0 -o sdk-share-frontend-2.0.0.tar

# 后端
cd f:/sdkprojects/backend
docker build -t sdk-share-backend:2.0.0 .
docker save sdk-share-backend:2.0.0 -o sdk-share-backend-2.0.0.tar
```

### 服务器更新

```bash
# 停止旧容器
docker stop sdk-share-frontend sdk-share-backend
docker rm sdk-share-frontend sdk-share-backend

# 加载新镜像
docker load -i sdk-share-frontend-2.0.0.tar
docker load -i sdk-share-backend-2.0.0.tar

# 重新启动（使用上面的启动命令，改版本号）
```

---

## 六、常用命令

```bash
# 查看容器状态
docker ps | grep sdk-share

# 查看日志
docker logs -f sdk-share-backend
docker logs -f sdk-share-frontend

# 重启容器
docker restart sdk-share-backend
docker restart sdk-share-frontend

# 删除容器
docker stop sdk-share-frontend sdk-share-backend
docker rm sdk-share-frontend sdk-share-backend
```
