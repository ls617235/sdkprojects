# SDK API 集成说明

## 概述

SDK 内置了完整的 API 客户端，用于与后端服务进行交互。本文档说明如何在生成的 SDK 代码中使用 API 客户端。

## 嵌入代码中的 API 配置

### HTML 嵌入代码

```html
<!-- 配置 SDK -->
<script>
window.SDK_CONFIG_E2C194D8 = {
  // API 配置（可选）
  apiBaseUrl: 'https://your-sdk-platform.com',
  apiKey: 'your-api-key-here',

  // 自定义配置
  custom: {
    userId: 'user-123',
    userName: '张三',
    environment: 'production'
  },

  // 其他配置
  useShadowDOM: true
};
</script>

<!-- SDK 容器 -->
<div data-sdk-token="e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f"
     style="width:100%;min-height:400px;">
</div>

<!-- 加载 SDK 脚本 -->
<script src="https://your-sdk-platform.com/api/sdk/e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f/embed"
        async>
</script>
```

### React 嵌入代码

```jsx
import { useEffect, useRef } from 'react';

export function MySDK({ config = {}, width = '100%', height = '400px', onLoad, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // SDK 配置
    window.SDK_CONFIG_E2C194D8 = {
      ...config,
      container: containerRef.current,
      // API 配置（可选）
      apiBaseUrl: config.apiBaseUrl || 'https://your-sdk-platform.com',
      apiKey: config.apiKey || '',
      // 自定义配置
      custom: {
        userId: config.userId || '',
        userName: config.userName || '',
        environment: config.environment || 'production',
        ...config.custom
      }
    };

    const script = document.createElement('script');
    script.src = 'https://your-sdk-platform.com/api/sdk/e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f/embed';
    script.async = true;
    script.onload = () => onLoad?.();
    script.onerror = (err) => onError?.(err);
    document.head.appendChild(script);

    return () => script.remove();
  }, [config]);

  return <div ref={containerRef}
              data-sdk-token="e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f"
              style={{ width, minHeight: height }} />;
}
```

### Vue 嵌入代码

```vue
<template>
  <div ref="containerRef"
       :data-sdk-token="token"
       :style="{ width, minHeight: height }" />
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
const token = 'e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f';
const configKey = 'SDK_CONFIG_E2C194D8';
let scriptEl = null;

onMounted(() => {
  // SDK 配置
  window[configKey] = {
    ...props.config,
    container: containerRef.value,
    // API 配置（可选）
    apiBaseUrl: props.config.apiBaseUrl || 'https://your-sdk-platform.com',
    apiKey: props.config.apiKey || '',
    // 自定义配置
    custom: {
      userId: props.config.userId || '',
      userName: props.config.userName || '',
      environment: props.config.environment || 'production',
      ...props.config.custom
    }
  };

  scriptEl = document.createElement('script');
  scriptEl.src = 'https://your-sdk-platform.com/api/sdk/e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f/embed';
  scriptEl.async = true;
  scriptEl.onload = () => emit('load');
  scriptEl.onerror = (err) => emit('error', err);
  document.head.appendChild(scriptEl);
});

onUnmounted(() => scriptEl?.remove());
</script>
```

## SDK 内部使用 API 客户端

在生成的 SDK 代码中，可以使用 `getSDKAPI` 快捷方法获取 API 客户端实例：

```javascript
// 获取 SDK 配置
const configKey = 'SDK_CONFIG_E2C194D8';
const config = window[configKey];

if (!config) {
  console.error('SDK 配置未找到');
  return;
}

// 获取 API 客户端
const api = getSDKAPI(config.token);

if (api) {
  // 使用 API 客户端
  fetchData(api);
}
```

## API 客户端方法

### GET 请求

```javascript
const api = getSDKAPI(token);
if (!api) return;

// 简单 GET 请求
const response = await api.get('/api/data');

if (response.success) {
  console.log('数据:', response.data);
} else {
  console.error('错误:', response.error);
}

// 带查询参数
const response = await api.get('/api/users', {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### POST 请求

```javascript
const api = getSDKAPI(token);
if (!api) return;

const response = await api.post('/api/users', {
  name: '张三',
  email: 'zhangsan@example.com'
});

if (response.success) {
  console.log('创建成功:', response.data);
} else {
  console.error('创建失败:', response.error);
}
```

### PUT 请求

```javascript
const api = getSDKAPI(token);
if (!api) return;

const response = await api.put('/api/users/123', {
  name: '李四',
  email: 'lisi@example.com'
});

if (response.success) {
  console.log('更新成功:', response.data);
}
```

### DELETE 请求

```javascript
const api = getSDKAPI(token);
if (!api) return;

const response = await api.delete('/api/users/123');

if (response.success) {
  console.log('删除成功');
}
```

## API 请求头

SDK API 客户端会自动添加以下请求头：

### 默认头
- `Content-Type: application/json`

### API Key（如果配置）
- `Authorization: Bearer {apiKey}`
- `X-API-Key: {apiKey}`

### 自定义信息（如果配置）
- `X-SDK-User-ID: {userId}`
- `X-SDK-User-Name: {userName}`
- `X-SDK-Environment: {environment}`

## 配置选项

### SDKConfig 接口

```typescript
interface SDKConfig {
  token: string;              // SDK 令牌
  configKey: string;          // 配置键名
  apiBaseUrl?: string;        // API 基础 URL（默认：当前域名）
  apiKey?: string;            // API 密钥（可选）
  custom?: {
    userId?: string;          // 用户 ID
    userName?: string;        // 用户名
    environment?: string;     // 环境（production/development）
    [key: string]: any;       // 其他自定义字段
  };
  useShadowDOM?: boolean;     // 是否使用 Shadow DOM
}
```

## 错误处理

```javascript
const api = getSDKAPI(token);
if (!api) return;

const response = await api.get('/api/data');

if (!response.success) {
  // 处理错误
  switch (response.error) {
    case '请求超时':
      console.warn('请求超时，请重试');
      break;
    case 'HTTP 404':
      console.error('资源不存在');
      break;
    case 'HTTP 401':
    case 'HTTP 403':
      console.error('权限不足，请检查 API Key');
      break;
    default:
      console.error('请求失败:', response.error);
  }
}
```

## 完整示例

```javascript
// SDK 初始化
(function() {
  const configKey = 'SDK_CONFIG_E2C194D8';
  const token = 'e2c194d84e3868519fbec5f7ae81b7e3b9fb4aa63ebf311c4fe1625757edfa9f';
  const config = window[configKey];

  if (!config) {
    console.error('[SDK] 配置未找到');
    return;
  }

  // 获取 API 客户端
  const api = getSDKAPI(token);

  if (!api) {
    console.error('[SDK] 无法创建 API 客户端');
    return;
  }

  // 示例：获取用户数据
  async function loadUserData() {
    const userId = config.custom?.userId;

    if (!userId) {
      console.warn('[SDK] 用户 ID 未配置');
      return;
    }

    const response = await api.get(`/api/users/${userId}`);

    if (response.success) {
      displayUserData(response.data);
    } else {
      displayError(response.error);
    }
  }

  // 示例：提交表单数据
  async function submitForm(formData) {
    const response = await api.post('/api/submit', {
      ...formData,
      userId: config.custom?.userId
    });

    if (response.success) {
      showSuccess('提交成功');
      loadUserData(); // 重新加载数据
    } else {
      showError('提交失败: ' + response.error);
    }
  }

  // 初始化
  loadUserData();
})();
```

## 超时设置

默认超时时间为 30 秒，可以通过 `timeout` 选项自定义：

```javascript
const api = getSDKAPI(token);
if (!api) return;

// 设置 10 秒超时
const response = await api.get('/api/slow-endpoint', {
  timeout: 10000
});
```

## 环境配置

### 开发环境

```javascript
window.SDK_CONFIG_E2C194D8 = {
  apiBaseUrl: 'http://localhost:5000',
  custom: {
    environment: 'development',
    userId: 'dev-user-123'
  }
};
```

### 生产环境

```javascript
window.SDK_CONFIG_E2C194D8 = {
  apiBaseUrl: 'https://your-sdk-platform.com',
  apiKey: 'prod-api-key',
  custom: {
    environment: 'production',
    userId: 'prod-user-456'
  }
};
```

## 调试技巧

### 1. 查看配置

```javascript
console.log('SDK 配置:', window.SDK_CONFIG_E2C194D8);
```

### 2. 测试 API 连接

```javascript
const api = getSDKAPI(token);
if (api) {
  console.log('API 基础 URL:', api.getConfig().apiBaseUrl);
}
```

### 3. 监控网络请求

使用浏览器开发者工具（F12）的 Network 标签查看所有 API 请求。

## 最佳实践

### 1. 错误处理

```javascript
async function safeAPICall() {
  try {
    const api = getSDKAPI(token);
    if (!api) {
      console.error('API 客户端未初始化');
      return null;
    }

    const response = await api.get('/api/data');

    if (response.success) {
      return response.data;
    } else {
      console.error('API 错误:', response.error);
      return null;
    }
  } catch (error) {
    console.error('请求异常:', error);
    return null;
  }
}
```

### 2. 请求重试

```javascript
async function retryRequest(endpoint, maxRetries = 3) {
  const api = getSDKAPI(token);
  if (!api) return null;

  for (let i = 0; i < maxRetries; i++) {
    const response = await api.get(endpoint);

    if (response.success) {
      return response.data;
    }

    if (i < maxRetries - 1) {
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  return null;
}
```

### 3. 请求缓存

```javascript
const cache = new Map();

async function cachedGet(endpoint) {
  const cacheKey = endpoint;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const api = getSDKAPI(token);
  if (!api) return null;

  const response = await api.get(endpoint);

  if (response.success) {
    cache.set(cacheKey, response.data);
    return response.data;
  }

  return null;
}
```

## 常见问题

### Q: API 请求失败，显示 CORS 错误？

A: 确保后端 API 已配置 CORS 头：

```typescript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
```

### Q: 如何使用不同的 API 基础 URL？

A: 在 SDK 配置中设置 `apiBaseUrl`：

```javascript
window.SDK_CONFIG_E2C194D8 = {
  apiBaseUrl: 'https://api.example.com'
};
```

### Q: 如何传递自定义请求头？

A: 使用 `headers` 选项：

```javascript
const response = await api.get('/api/data', {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

## 更新日志

- 2026-04-02: 添加 API 客户端集成
- 2026-04-02: 支持自定义 API 配置
- 2026-04-02: 添加请求头自动注入
- 2026-04-02: 添加错误处理和超时机制
