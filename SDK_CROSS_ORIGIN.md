# SDK 跨域嵌入说明

## 问题描述

当 SDK 嵌入到其他网站时，需要从 SDK 平台加载 JS 脚本和资源。由于浏览器的同源策略，必须使用完整的绝对 URL 而不是相对路径。

## 解决方案

### 1. 使用完整 URL

所有嵌入代码现在都使用完整的绝对 URL，而不是相对路径：

```html
<!-- ❌ 错误：相对路径（只能在同域名下使用） -->
<script src="/api/sdk/your-token/embed" async></script>

<!-- ✅ 正确：完整 URL（支持跨域嵌入） -->
<script src="https://your-sdk-platform.com/api/sdk/your-token/embed" async></script>
```

### 2. CORS 配置

API 路由已配置 CORS 头，允许跨域访问：

```typescript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
```

## 环境变量配置

### 开发环境

在开发环境中，使用当前页面的 origin 作为 SDK 平台 URL。

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 生产环境

在生产环境中，必须配置 `FRONTEND_DOMAIN` 环境变量：

```bash
# .env
FRONTEND_DOMAIN=https://your-sdk-platform.com
```

或在环境变量中配置：

```bash
export FRONTEND_DOMAIN=https://your-sdk-platform.com
```

## 工具函数

项目中提供了 `src/lib/sdk-url.ts` 工具函数，用于生成完整的 URL：

```typescript
import { getEmbedScriptUrl, getPreviewUrl, getSDKInfoUrl } from '@/lib/sdk-url';

// 生成嵌入脚本 URL
const embedUrl = getEmbedScriptUrl('your-token');
// 返回: https://your-sdk-platform.com/api/sdk/your-token/embed

// 生成预览 URL
const previewUrl = getPreviewUrl('your-token');
// 返回: https://your-sdk-platform.com/sdk/your-token/preview

// 生成 SDK 信息 URL
const infoUrl = getSDKInfoUrl('your-token');
// 返回: https://your-sdk-platform.com/api/sdk/your-token/info
```

## 嵌入代码示例

### HTML

```html
<div data-sdk-token="your-token" style="width:100%;min-height:400px;"></div>
<script src="https://your-sdk-platform.com/api/sdk/your-token/embed" async></script>
```

### React

```jsx
import { useEffect, useRef } from 'react';

export function MySDK({ config = {}, width = '100%', height = '400px', onLoad, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    window.SDK_CONFIG_YOUR_TOKEN = { ...config, container: containerRef.current };

    const script = document.createElement('script');
    script.src = 'https://your-sdk-platform.com/api/sdk/your-token/embed';
    script.async = true;
    script.onload = () => onLoad?.();
    script.onerror = (err) => onError?.(err);
    document.head.appendChild(script);

    return () => script.remove();
  }, [config]);

  return <div ref={containerRef} data-sdk-token="your-token" style={{ width, minHeight: height }} />;
}
```

### Vue

```vue
<template>
  <div ref="containerRef" :data-sdk-token="token" :style="{ width, minHeight: height }" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  width: { type: String, default: '100%' },
  height: { type: String, default: '400px' }
});

const emit = defineEmits(['load', 'error']);
const containerRef = ref(null);
const token = 'your-token';
const configKey = 'SDK_CONFIG_YOUR_TOKEN';
let scriptEl = null;

onMounted(() => {
  window[configKey] = { ...props.config, container: containerRef.value };
  scriptEl = document.createElement('script');
  scriptEl.src = 'https://your-sdk-platform.com/api/sdk/your-token/embed';
  scriptEl.async = true;
  scriptEl.onload = () => emit('load');
  scriptEl.onerror = (err) => emit('error', err);
  document.head.appendChild(scriptEl);
});

onUnmounted(() => scriptEl?.remove());
</script>
```

## 部署注意事项

### 1. 配置域名

确保在部署时设置正确的环境变量：

```bash
# Dockerfile
ENV FRONTEND_DOMAIN=https://your-sdk-platform.com

# 或使用 docker-compose.yml
environment:
  - FRONTEND_DOMAIN=https://your-sdk-platform.com
```

### 2. HTTPS 配置

生产环境必须使用 HTTPS：

```nginx
server {
    listen 443 ssl;
    server_name your-sdk-platform.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/sdk/ {
        proxy_pass http://backend:8000/api/sdk/;
        # 添加 CORS 头（可选，后端已配置）
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
    }

    location / {
        proxy_pass http://frontend:5000;
    }
}
```

### 3. CDN 配置（可选）

如果使用 CDN，需要配置 CDN 正确转发 API 请求：

```javascript
// CDN 配置
{
  "origin": "https://your-sdk-platform.com",
  "paths": ["/api/sdk/*"],
  "methods": ["GET", "OPTIONS"],
  "headers": ["Content-Type", "Authorization"]
}
```

## 安全建议

### 1. 限制 CORS 域名

在生产环境中，建议将 `Access-Control-Allow-Origin` 从 `*` 改为特定的域名：

```typescript
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com'
];

const origin = request.headers.get('origin');
const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

return new NextResponse(sdkCode, {
  headers: {
    'Access-Control-Allow-Origin': allowedOrigin,
    // ...
  }
});
```

### 2. 添加认证

如果需要限制 SDK 访问，可以添加 API Key 认证：

```html
<script src="https://your-sdk-platform.com/api/sdk/your-token/embed?api_key=your-api-key" async></script>
```

### 3. 速率限制

后端应配置速率限制，防止滥用：

```python
# FastAPI 速率限制示例
from fastapi import FastAPI
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter

@app.get("/api/sdk/{token}/embed")
@limiter.limit("10/minute")
async def get_sdk_embed(request: Request, token: str):
    # ...
```

## 常见问题

### Q1: 嵌入后在其他网站无法加载？

A: 检查以下几点：
1. 确认使用了完整的绝对 URL
2. 检查环境变量 `FRONTEND_DOMAIN` 是否配置正确
3. 检查浏览器控制台是否有 CORS 错误
4. 确认 API 服务器正常运行

### Q2: 如何在本地测试跨域嵌入？

A: 使用 `http://localhost:5000` 作为 `FRONTEND_DOMAIN`，然后在另一个本地服务器（如 `http://localhost:3000`）嵌入代码测试。

### Q3: 开发环境和生产环境的 URL 不同？

A: 工具函数会自动处理：
- 开发环境：使用 `window.location.origin`（客户端）或相对路径（服务端）
- 生产环境：使用 `FRONTEND_DOMAIN` 环境变量

## 更新日志

- 2026-04-02: 添加完整 URL 支持，修复跨域嵌入问题
- 2026-04-02: 添加 CORS 头配置
- 2026-04-02: 创建 URL 工具函数
