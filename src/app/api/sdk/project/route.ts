import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';
import { 
  ProjectConfig, 
  validateProject, 
  generateSDKWrapperEnhanced,
  processProjectFilesEnhanced,
  detectFramework,
  getCDNScripts,
  CDN_DEPENDENCIES,
} from '@/lib/react-to-sdk';

// 生成配置键
function generateConfigKey(name: string): string {
  return `SDK_CONFIG_${name.slice(0, 8).toUpperCase()}`;
}

/**
 * POST /api/sdk/project
 * 创建 SDK
 * 支持两种类型：
 * 1. 纯 HTML/CSS/JS (type: 'pure')
 * 2. React/Vue 项目 (type: 'framework' 或自动检测)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, description, files, html, css, js, framework: userFramework, externalDeps: userExternalDeps } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'SDK 名称不能为空' },
        { status: 400 }
      );
    }

    // 纯 HTML/CSS/JS 类型 - 直接发送原始代码给后端，后端使用 Webpack 打包
    if (type === 'pure' || html) {
      return await createPureSDK({ name, description, html, css, js });
    }

    // React/Vue 项目类型
    return await createFrameworkSDK({ 
      name, 
      description, 
      files, 
      framework: userFramework,
      externalDeps: userExternalDeps 
    });
  } catch (error) {
    console.error('创建 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建纯 HTML/CSS/JS SDK - 后端使用 Webpack 打包
 */
async function createPureSDK(options: {
  name: string;
  description?: string;
  html: string;
  css?: string;
  js?: string;
}) {
  const { name, description, html, css = '', js = '' } = options;
  
  if (!html) {
    return NextResponse.json(
      { error: 'HTML 代码不能为空' },
      { status: 400 }
    );
  }

  const configKey = generateConfigKey(name);

  // 直接调用后端 API，后端会使用 Webpack 打包
  const apiResponse = await apiClient.post('/api/sdk', undefined, {
    name,
    description,
    status: 'public',
    pages: [{
      page_id: 'main',
      name: '主组件',
      code: html,  // 发送原始 HTML，后端 Webpack 打包
      is_default: true,
    }],
    config: { 
      type: 'pure',
      name,
      configKey,
    },
  });

  if (!apiResponse.success) {
    return NextResponse.json(
      { error: apiResponse.error || '创建失败' },
      { status: 400 }
    );
  }

  const sdk = apiResponse.data as { id?: string; share_token?: string; created_at?: string };

  // 生成嵌入代码
  const embedCode = generatePureEmbedCode({
    token: sdk['share_token'] || '',
    name,
    css,
    configKey,
  });

  return NextResponse.json({
    success: true,
    data: {
      id: sdk['id'],
      name,
      share_token: sdk['share_token'],
      embed_code: embedCode,
      created_at: sdk['created_at'],
    },
  });
}

/**
 * 创建 React/Vue 项目 SDK
 */
async function createFrameworkSDK(options: {
  name: string;
  description?: string;
  files: Array<{ path: string; content: string }>;
  framework?: string;
  externalDeps?: string[];
}) {
  const { name, description, files, framework: userFramework = 'auto', externalDeps: userExternalDeps } = options;

  const validation = validateProject({ name, files });
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors.join('; ') },
      { status: 400 }
    );
  }

  // 处理项目文件并自动检测依赖
  const { code: processedCode, framework, detectedDeps, warnings } = processProjectFilesEnhanced(files);
  
  // 确定最终框架
  const finalFramework = (userFramework === 'auto' ? framework : userFramework) as 'react' | 'vue';
  
  // 合并用户指定的依赖和自动检测的依赖
  const allDeps = new Set([...detectedDeps]);
  if (userExternalDeps) {
    userExternalDeps.forEach(dep => allDeps.add(dep));
  }
  const externalDeps = Array.from(allDeps);
  
  // 生成完整的 SDK 代码
  const sdkCode = generateSDKWrapperEnhanced({
    componentName: 'App',
    componentCode: processedCode,
    sdkToken: 'temp_token', // 临时 token，后端会生成真实的
    externalDeps,
    framework: finalFramework,
  });

  try {
    // 直接调用后端 Python API 创建 SDK
    const apiResponse = await apiClient.post('/api/sdk', undefined, {
      name,
      description,
      status: 'public',
      pages: [{
        page_id: 'main',
        name: '主组件',
        code: sdkCode,
        is_default: true,
      }],
      config: {
        type: 'framework-project',
        framework: finalFramework,
        fileCount: files.length,
        externalDeps,
        detectedDeps,
      },
    });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '创建失败' },
        { status: 400 }
      );
    }

    const sdk = apiResponse.data as { id?: string; share_token?: string; created_at?: string };

    // 生成嵌入代码
    const embedCode = generateEmbedCode({
      token: sdk['share_token'] || '',
      name,
      framework: finalFramework,
      externalDeps,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: sdk['id'],
        name,
        share_token: sdk['share_token'],
        framework: finalFramework,
        file_count: files.length,
        external_deps: externalDeps,
        detected_deps: detectedDeps,
        warnings: warnings || [],
        embed_code: embedCode,
        created_at: sdk['created_at'],
      },
    });
  } catch (error) {
    console.error('创建项目 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

/**
 * 生成嵌入代码（分层架构版本）
 * 包含：事件驱动通信、生命周期管理、跨域通信、Shadow DOM 隔离
 */
function generateEmbedCode(options: {
  token: string;
  name: string;
  framework: 'react' | 'vue';
  externalDeps: string[];
}): string {
  const { token, name, externalDeps } = options;
  const configKey = generateConfigKey(token);
  const sdkKey = `SDK_${token.slice(0, 8)}`;

  // 生成 CDN 脚本标签
  const cdnScripts = getCDNScripts(externalDeps);
  
  // 生成 CSS（Ant Design 需要）
  const needsAntd = externalDeps.includes('antd');
  const antdCSS = needsAntd 
    ? '<link rel="stylesheet" href="https://unpkg.com/antd@5/dist/reset.css">'
    : '';

  return `<!-- ${name} SDK 嵌入代码 -->
<!-- ======================================== -->
<!-- 分层架构：事件驱动 + 生命周期管理 + 跨域安全 + Shadow DOM 隔离 -->
<!-- ======================================== -->

<!-- 1. 加载样式 -->
${antdCSS}

<!-- 2. 加载外部依赖 -->
${cdnScripts}

<!-- 3. SDK 配置（分层架构配置） -->
<script>
/**
 * 宿主系统配置 - 向 SDK 注入配置
 * 支持：资源路径、API接口、认证、生命周期、跨域安全等
 */
window.${configKey} = {
  // ===== 基础资源配置 =====
  assetsBaseUrl: 'https://your-cdn.example.com',
  apiBaseUrl: 'https://your-api.example.com',
  apiKey: 'your-api-key',
  token: 'your-jwt-token',
  
  // ===== 样式隔离配置 =====
  // 使用 Shadow DOM 隔离样式（推荐开启）
  useShadowDOM: true,
  
  // ===== 跨域安全配置 =====
  // 允许的跨域消息来源域名（用于 iframe/跨窗口通信）
  allowedOrigins: ['https://your-domain.com', '*'],
  
  // ===== 调试模式 =====
  debug: false,
  
  // ===== 自定义业务数据 =====
  custom: {
    userId: '12345',
    userName: '张三',
    userEmail: 'test@example.com',
    tenantId: 'tenant-001',
    theme: 'light',
    locale: 'zh-CN',
    // ... 更多业务数据
  }
};
</script>

<!-- 4. 加载 SDK 脚本 -->
<script src="/api/sdk/${token}/embed"></script>

<!-- 5. SDK 容器 -->
<div data-sdk-token="${token}" style="width: 100%; min-height: 400px;"></div>

<!-- 6. 事件监听与生命周期管理 -->
<script>
/**
 * 监听 SDK 生命周期事件
 * 通过自定义事件与 SDK 交互
 */
const sdkInstance = window.${sdkKey};

// ===== 生命周期事件 =====
window.addEventListener('sdk:initialized', (e) => {
  console.log('[宿主] SDK 已初始化', e.detail);
});

window.addEventListener('sdk:mounted', (e) => {
  console.log('[宿主] SDK 已挂载到 DOM');
});

window.addEventListener('sdk:config-updated', (e) => {
  console.log('[宿主] SDK 配置已更新', e.detail.config);
});

window.addEventListener('sdk:destroyed', (e) => {
  console.log('[宿主] SDK 已销毁');
});

window.addEventListener('sdk:error', (e) => {
  console.error('[宿主] SDK 错误:', e.detail.error);
});

// ===== 数据交互事件 =====
window.addEventListener('sdk:request:start', (e) => {
  console.log('[宿主] SDK 开始请求:', e.detail.url);
});

window.addEventListener('sdk:request:success', (e) => {
  console.log('[宿主] SDK 请求成功:', e.detail.duration + 'ms');
});

window.addEventListener('sdk:request:error', (e) => {
  console.error('[宿主] SDK 请求失败:', e.detail.error);
});

// ===== 跨域消息事件 =====
window.addEventListener('sdk:message:received', (e) => {
  console.log('[宿主] SDK 收到跨域消息:', e.detail);
});

// ===== 动态更新配置 =====
function updateSDKConfig(newConfig) {
  if (sdkInstance?.sdk) {
    sdkInstance.sdk.setConfig(newConfig);
  }
}

// ===== 销毁 SDK =====
function destroySDK() {
  if (sdkInstance?.lifecycle) {
    sdkInstance.lifecycle.destroy();
  }
}

// 暴露给全局使用
window.updateSDKConfig_${token.slice(0, 8)} = updateSDKConfig;
window.destroySDK_${token.slice(0, 8)} = destroySDK;
</script>`;
}

/**
 * GET /api/sdk/project?token=xxx
 * 获取 SDK 信息
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: '缺少 token 参数' },
      { status: 400 }
    );
  }

  try {
    // 直接调用后端 Python API 获取 SDK 详情
    const apiResponse = await apiClient.get(`/api/sdk/${token}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || 'SDK 不存在' },
        { status: 400 }
      );
    }

    const sdk = apiResponse.data as { name?: string; config?: { framework?: string; externalDeps?: string[] }; pages?: any[] };
    const config = sdk.config || {};
    const framework = (config.framework || 'react') as 'react' | 'vue';
    const externalDeps = config.externalDeps || [];

    const embedCode = generateEmbedCode({
      token,
      name: sdk.name || '',
      framework,
      externalDeps,
    });

    return NextResponse.json({
      success: true,
      data: {
        sdk,
        pages: sdk.pages,
        embedCode,
      },
    });
  } catch (error) {
    console.error('获取 SDK 失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

/**
 * 生成纯 HTML/CSS/JS SDK 的嵌入代码
 */
function generatePureEmbedCode(options: {
  token: string;
  name: string;
  css: string;
  configKey: string;
}): string {
  const { token, name, css, configKey } = options;

  return `<!-- ${name} SDK 嵌入代码 -->
<!-- 纯 HTML + CSS + JS SDK -->

<!-- 1. SDK 配置 -->
<script>
window.${configKey} = {
  assetsBaseUrl: '',
  apiBaseUrl: '',
  apiKey: '',
  token: '',
  useShadowDOM: true,
  custom: {
    userId: '',
    userName: '',
  }
};
</script>

<!-- 2. 加载 SDK 脚本 -->
<script src="/api/sdk/${token}/embed"></script>

<!-- 3. SDK 容器 -->
<div data-sdk-token="${token}" style="width: 100%; min-height: 400px;"></div>`;
}