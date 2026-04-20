# SDK 分享平台 - 项目说明

## 项目概述

这是一个类似 Langflow 的 SDK 分享平台，支持用户上传前端代码并生成可嵌入的 JavaScript SDK。

## 技术栈

### 前端
- **框架**: Next.js 16 (App Router)
- **核心**: React 19
- **语言**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4

### 后端
- **语言**: Python 3.11
- **框架**: FastAPI
- **服务器**: Gunicorn + Uvicorn Workers
- **数据库**: Supabase (PostgreSQL)
- **缓存**: Redis 7
- **反向代理**: Nginx

## 核心功能

### 1. 用户系统
- 用户注册/登录
- Token 认证
- 用户信息管理

### 2. API Key 管理
- 创建/删除 API Key
- 权限控制 (read/write)
- 速率限制
- 过期时间设置

### 3. 应用管理
- 创建/管理应用场景
- 应用类型: 网站、移动应用、小程序、管理后台等
- SDK 关联应用

### 4. SDK 管理
- 多页面 SDK 支持
- 在线嵌入代码生成
- SDK 文件下载
- React 转 JS SDK (可选功能)

## 目录结构

```
.
├── backend/                    # Python 后端
│   ├── app/
│   │   ├── api/               # API 路由
│   │   │   ├── auth.py       # 认证相关 API
│   │   │   └── sdk.py        # SDK 相关 API
│   │   ├── core/             # 核心配置
│   │   │   ├── config.py     # 配置管理
│   │   │   ├── database.py   # 数据库连接
│   │   │   └── cache.py      # 缓存管理
│   │   ├── models/           # 数据模型
│   │   │   └── models.py     # Pydantic 模型
│   │   ├── services/         # 业务逻辑
│   │   │   ├── user_service.py
│   │   │   └── sdk_service.py
│   │   └── main.py           # FastAPI 入口
│   └── requirements.txt
├── src/                       # Next.js 前端
│   ├── app/
│   │   ├── page.tsx          # 主页面
│   │   └── layout.tsx        # 布局
│   ├── components/
│   │   ├── auth/             # 认证组件
│   │   │   ├── AuthDialog.tsx
│   │   │   ├── APIKeyManager.tsx
│   │   │   └── AppManager.tsx
│   │   └── ui/               # shadcn/ui 组件
│   └── lib/
│       └── api.ts            # API 客户端
├── init-db.sql               # 数据库初始化脚本
├── docker-compose.yml        # Docker 编排
└── nginx.conf                # Nginx 配置
```

## API 端点

### 认证 API (`/api/auth`)
- `POST /register` - 用户注册
- `POST /login` - 用户登录
- `GET /api-keys` - 获取 API Key 列表
- `POST /api-keys` - 创建 API Key
- `DELETE /api-keys/{id}` - 删除 API Key
- `GET /apps` - 获取应用列表
- `POST /apps` - 创建应用
- `GET /apps/{id}` - 获取应用详情
- `PUT /apps/{id}` - 更新应用
- `DELETE /apps/{id}` - 删除应用

### SDK API (`/api/sdk`)
- `GET /` - 获取 SDK 列表
- `POST /` - 创建 SDK
- `GET /{token}` - 获取 SDK 详情
- `PUT /{token}` - 更新 SDK
- `DELETE /{token}` - 删除 SDK
- `GET /{token}/embed` - 获取嵌入代码
  - 参数:
    - `api_key`: API Key（私有 SDK 必需）
    - `assets_base_url`: 资源基础 URL
    - `api_base_url`: API 基础 URL
- `GET /{token}/download` - 下载 SDK 文件

## SDK 配置说明

### 配置注入方式

SDK 支持宿主系统注入配置，用于访问宿主系统的资源和 API。

#### 嵌入代码示例

```html
<!-- SDK 配置（必须放在 SDK 脚本之前） -->
<script>
window.SDK_CONFIG_ABCD1234 = {
  // 【必填】资源基础路径 - 图片等静态资源的加载地址
  assetsBaseUrl: '/assets',  // 或完整URL: 'https://your-system.com/assets'
  
  // 【必填】API基础路径 - 后台接口的服务地址
  apiBaseUrl: '/api',  // 或完整URL: 'https://your-system.com/api'
  
  // 【可选】API Key（私有SDK必需）
  apiKey: 'sk_live_xxx',
  
  // 【可选】自定义数据 - 可在页面代码中引用
  custom: {
    userId: '123',
    userName: '张三',
    token: 'bearer_xxx',
  }
};
</script>

<!-- SDK 脚本 -->
<script src="/api/sdk/{token}/embed"></script>

<!-- SDK 容器 -->
<div data-sdk-token="{token}"></div>
```

### 页面代码中的模板变量

上传的页面代码支持以下模板变量：

```html
<!-- 资源路径 -->
<img src="{{assets_base_url}}/images/logo.png">
<link href="{{assets_base_url}}/css/style.css">

<!-- API 调用 -->
<script>
fetch('{{api_base_url}}/users', {
  headers: {
    'X-API-Key': '{{api_key}}',
    'Authorization': 'Bearer {{custom.token}}'
  }
})
</script>

<!-- 自定义数据 -->
<div>欢迎, {{custom.userName}}</div>
<input type="hidden" value="{{custom.userId}}">
```

### SDK 工具方法

SDK 会自动注入工具对象到页面：

```javascript
// 方式一：使用 __SDK__ 对象（推荐）
__SDK__.api('/users')  // API 请求（自动添加基础路径和认证）
__SDK__.asset('images/logo.png')  // 获取资源完整URL

// 方式二：使用 SDK_CONFIG 对象
SDK_CONFIG.assetsBaseUrl
SDK_CONFIG.apiBaseUrl
SDK_CONFIG.custom.userId
```

### API 请求封装

```javascript
// 使用 __SDK__.api() 发起请求
__SDK__.api('/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'test' })
}).then(data => console.log(data));

// 等同于
fetch(SDK_CONFIG.apiBaseUrl + '/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': SDK_CONFIG.apiKey
  },
  body: JSON.stringify({ name: 'test' })
})
```

### 宿主系统集成示例

#### Vue.js 项目

```html
<template>
  <div>
    <!-- SDK 配置 -->
    <component :is="'script'" v-html="sdkConfig"></component>
    
    <!-- SDK 脚本 -->
    <script src="/api/sdk/{token}/embed"></script>
    
    <!-- SDK 容器 -->
    <div :data-sdk-token="token"></div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      token: 'xxx',
      sdkConfig: `
        window.SDK_CONFIG_XXX = {
          assetsBaseUrl: '/assets',
          apiBaseUrl: '/api',
          custom: {
            userId: '${this.$store.state.user.id}',
            token: '${this.$store.state.user.token}'
          }
        };
      `
    }
  }
}
</script>
```

#### React 项目

```jsx
function MyComponent() {
  const user = useSelector(state => state.user);
  
  useEffect(() => {
    // 动态设置配置
    window.SDK_CONFIG_XXX = {
      assetsBaseUrl: '/assets',
      apiBaseUrl: '/api',
      custom: {
        userId: user.id,
        token: user.token
      }
    };
  }, [user]);
  
  return (
    <>
      <script src="/api/sdk/{token}/embed"></script>
      <div data-sdk-token="{token}"></div>
    </>
  );
}
```

### 动态更新配置

```javascript
// 更新配置并刷新SDK
window.SDK_CONFIG_ABCD1234.updateConfig({
  custom: {
    userId: '456',
    userName: '李四'
  }
});

// 导航到指定页面
window.SDK_CONFIG_ABCD1234.navigate(container, 'page_2');
```

## 数据库 Schema

### users
- 用户基本信息
- 邮箱、密码哈希、昵称

### api_keys
- API Key 信息
- 用户关联、权限、速率限制

### apps
- 应用信息
- 用户关联、场景类型、配置

### sdk_shares
- SDK 主表
- 用户/应用关联、名称、Token

### sdk_pages
- SDK 页面
- SDK 关联、页面代码

### usage_logs
- 使用日志
- API Key 关联、请求统计

## 开发指南

### 前端开发
```bash
# 安装依赖
pnpm install

# 启动开发服务器 (端口 5000)
pnpm dev

# 类型检查
npx tsc --noEmit
```

### 后端开发
```bash
cd backend

# 安装依赖
pip install -r requirements.txt

# 启动开发服务器
uvicorn app.main:app --reload

# 运行生产服务器
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### 数据库初始化
```bash
# 使用 Supabase 客户端
psql -f init-db.sql
```

## 部署说明

### 方式一：Docker 部署（推荐）

#### 1. 构建 Docker 镜像

```bash
# 构建前端镜像
docker build -t sdk-platform-frontend:latest -f Dockerfile.frontend .

# 构建后端镜像
docker build -t sdk-platform-backend:latest -f Dockerfile.backend .
```

#### 2. 使用 Docker Compose 启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 3. 环境变量配置

创建 `.env` 文件：

```env
# 数据库配置（外网地址）
DATABASE_URL=postgresql://user:password@your-db-host:5432/dbname

# Redis 配置（外网地址）
REDIS_URL=redis://your-redis-host:6379/0

# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# JWT 密钥
SECRET_KEY=your-secret-key-here

# 应用配置
APP_NAME=SDK Share Platform
APP_VERSION=1.0.0
ENVIRONMENT=production
PORT=8000
```

### 方式二：手动部署

1. 设置环境变量:
   - `SUPABASE_URL`: Supabase 项目 URL
   - `SUPABASE_KEY`: Supabase 服务端密钥
   - `REDIS_URL`: Redis 连接 URL
   - `SECRET_KEY`: JWT 密钥

2. 使用 Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. Nginx 配置已包含:
   - 前端静态文件服务
   - 后端 API 代理
   - Gzip 压缩
   - 缓存策略

### Docker 镜像说明

| 镜像 | 说明 | 端口 |
|------|------|------|
| sdk-platform-frontend | Next.js 前端 | 3000 |
| sdk-platform-backend | FastAPI 后端 | 8000 |
| nginx | 反向代理 | 80/443 |

### 健康检查

```bash
# 检查前端
curl http://localhost:3000

# 检查后端
curl http://localhost:8000/health

# 检查 API
curl http://localhost:8000/api/health
```

## 变更记录

### 2026-04-02 - 完善 SDK 测试流程
- 创建测试 SDK：图片按钮 + 弹窗组件
- 验证 SDK 创建 API (`POST /api/sdk/project`)
- 验证 SDK embed API (`GET /api/sdk/[token]/embed`)
- 使用 JSON.stringify 确保所有用户代码正确转义
- 测试 SDK share_token: `7376eb3884491652a26716fccebcba0fc760983a0ed68cd1eddbfe5ba8cf5cef`

### 2026-04-02 - 修复 SDK 生成器语法错误
- 问题：`generateSDKLoader` 函数使用模板字符串嵌入用户代码，当用户代码包含特殊字符（反引号、美元符号等）时会产生 "Invalid or unexpected token" 错误
- 解决方案：完全重写 SDK 生成逻辑，使用 `JSON.stringify()` 确保所有用户代码被正确转义
- 修改文件：
  - `src/app/api/sdk/[token]/embed/route.ts` - 移除 `escapeCode` 函数，改用 `JSON.stringify()` 安全序列化
- 关键改进：
  - 移除模板字符串中嵌入用户代码的方式
  - 所有用户数据通过 `JSON.stringify()` 序列化后再嵌入生成的代码
  - 生成的 SDK 代码使用普通字符串拼接，避免注入问题

### 2026-04-02 - 移除内网数据库依赖
- 问题：项目配置中存在内网数据库地址（localhost、127.0.0.1、redis 容器网络等）
- 解决方案：强制使用外网数据库和 Redis
- 修改文件：
  - `backend/.env.example` - 更新示例使用外网地址，添加警告注释
  - `docker-compose.yml` - 移除内部 Redis 服务，改为必须配置外网 REDIS_URL
  - `backend/app/core/cache.py` - 移除 localhost 默认值，改进 Redis URL 解析
  - `.env.example` - 更新为外网地址示例，移除 Supabase 相关配置
  - `src/lib/react-to-sdk.ts` - 内置简易模块打包器，移除对已删除 module-bundler 的依赖
- 强制要求：DATABASE_URL 和 REDIS_URL 必须使用外网地址

### 2026-04-02 - 重构 SDK 打包器解决运行时语法错误
- 问题：自研的 `module-bundler.ts` 使用正则表达式处理模块，容易产生 "Invalid or unexpected token" 语法错误
- 解决方案：创建 `webpack-sdk-bundler.ts`，使用 JSON.stringify 确保所有字符串正确转义
- 移除 `sdk-bundler.ts` 和 `module-bundler.ts`（自研打包器）
- 更新 `embed/route.ts` 和 `project/route.ts` 使用新的打包器
- 简化 `simpleBundle` 接口，移除 minify 参数

### 2026-04-01 - 修复纯 SDK 类型代码预览问题
- 检测用户代码是否已经是完整的 SDK 格式（包含 SDK_TOKEN、SDK_CSS、SDK_HTML、SDK_JS）
- 如果是纯 SDK 格式，直接执行用户代码，不再包装外层加载器
- 避免双重嵌套导致的预览失败问题
- 预览组件默认显示效果预览（通过 iframe 加载预览页面）
- 用户可切换到"嵌入代码"视图查看 HTML/React/Vue 三种格式的嵌入代码
- SDK embed 代码增加重试机制（每 200ms 重试一次，最多 10 次）

### 2026-04-01 - 添加 SDK 预览功能
- 新增 SDKPreview 组件，支持 HTML/React/Vue 三种环境预览
- 新增预览页面路由 `/sdk/[token]/preview`
- 新增 SDK 信息 API `/api/sdk/[token]/info`
- SDKResult 组件添加预览按钮
- 预览支持设备切换（桌面/平板/手机）
- 预览支持代码视图和效果视图切换

### 2025-01-XX - 添加资源路径和 API 配置
- SDK 支持配置资源基础 URL (assets_base_url)
- SDK 支持配置 API 基础 URL (api_base_url)
- 自动转换代码中的相对路径为绝对路径
- 嵌入代码支持 URL 参数和运行时配置
- 添加 SDK 工具方法: api(), getAsset()

### 2025-01-XX - 添加首页导航
- 新增首页选项卡，展示平台介绍和使用指南
- 导航栏从4列扩展为5列（首页、创建SDK、应用管理、API Key、SDK列表）
- 首页包含：Hero区域、功能特性、使用指南、嵌入示例、快速开始

### 2025-01-XX - 重构为用户系统
- 新增用户注册/登录功能
- 新增 API Key 认证机制
- 新增应用管理功能
- React 转 JS SDK 改为页面级别可选功能
- 去除预设示例内容
- SDK 关联应用和用户

## 注意事项

1. **API Key 安全**: API Key 只在创建时显示一次，请妥善保存
2. **认证方式**: 创建 SDK 需要 API Key 认证，查看/下载 SDK 无需认证
3. **React 转 SDK**: 此功能位于代码编辑完成后，需要手动开启
4. **数据隔离**: 每个用户只能管理自己的应用和 SDK
