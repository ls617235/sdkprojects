import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// GET: 下载 SDK 文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 直接调用后端 Python API 获取 SDK 详情
    const apiResponse = await apiClient.get(`/api/sdk/${token}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || 'SDK 不存在或已删除' },
        { status: 404 }
      );
    }

    const sdk = apiResponse.data as { name?: string; pages?: any[]; config?: any };

    if (!sdk || !sdk.pages || sdk.pages.length === 0) {
      return NextResponse.json(
        { error: 'SDK 没有配置页面' },
        { status: 404 }
      );
    }

    // 生成完整的 SDK 文件内容
    const sdkCode = generateDownloadableSDK(token, sdk.name || '', sdk.pages, sdk.config);
    
    // 生成 ASCII 安全的文件名
    const safeFileName = `sdk_${token.substring(0, 8)}.js`;

    // 返回 JavaScript 文件
    return new NextResponse(sdkCode, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
      },
    });
  } catch (error) {
    console.error('下载 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下载失败' },
      { status: 500 }
    );
  }
}

// 生成可下载的完整 SDK 代码
function generateDownloadableSDK(
  token: string,
  name: string,
  pages: any[],
  config: any
): string {
  // 转义代码中的特殊字符
  const escapeCode = (code: string) => {
    return code
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
  };

  // 构建页面数据
  const pagesData = pages.map(page => ({
    id: page.page_id,
    name: page.name,
    code: escapeCode(page.code),
    isDefault: page.is_default,
  }));

  const defaultPage = pages.find(p => p.is_default)?.page_id || pages[0]?.page_id;

  return `/**
 * ${name} SDK
 * 版本: 2.0.0
 * 生成时间: ${new Date().toISOString()}
 * 
 * 使用说明:
 * 1. 将此文件保存到服务器（如：/static/sdk/${name}.js）
 * 2. 在 HTML 中引入：<script src="/static/sdk/${name}.js"></script>
 * 3. 添加容器：<div data-sdk-token="${token}"></div>
 * 
 * 详细说明请查看 README.md
 */

(function() {
  'use strict';
  
  // SDK 配置
  const SDK_NAME = '${name}';
  const SDK_TOKEN = '${token}';
  const SDK_CONFIG = ${JSON.stringify(config || {})};
  
  // 页面数据
  const PAGES = ${JSON.stringify(pagesData)};
  const DEFAULT_PAGE = '${defaultPage}';
  
  // 当前页面状态
  let currentPage = DEFAULT_PAGE;
  
  // SDK 实例存储
  const instances = new Map();
  
  // 生成页面导航 HTML
  function generateNavHTML() {
    if (PAGES.length <= 1) return '';
    
    const navItems = PAGES.map(page => 
      '<button class="sdk-nav-btn" data-page="' + page.id + '" ' + 
      (page.id === currentPage ? 'active' : '') + '>' + page.name + '</button>'
    ).join('');
    
    return '<div class="sdk-nav-bar">' + navItems + '</div>';
  }
  
  // 生成样式
  function generateStyles() {
    return \`
      <style>
        .sdk-container { width: 100%; height: 100%; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .sdk-nav-bar { display: flex; gap: 8px; padding: 12px; background: #1a1a2e; border-bottom: 1px solid rgba(255,255,255,0.1); flex-wrap: wrap; }
        .sdk-nav-btn { padding: 8px 16px; border: none; border-radius: 6px; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer; font-size: 14px; transition: all 0.2s; }
        .sdk-nav-btn:hover { background: rgba(255,255,255,0.2); }
        .sdk-nav-btn[active] { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .sdk-content { flex: 1; overflow: auto; }
        .sdk-page-frame { width: 100%; height: 100%; border: none; }
      </style>
    \`;
  }
  
  // 渲染页面内容
  function renderPage(container, pageId) {
    const page = PAGES.find(p => p.id === pageId);
    if (!page) return;
    
    currentPage = pageId;
    
    // 更新导航按钮状态
    const navBtns = container.querySelectorAll('.sdk-nav-btn');
    navBtns.forEach(btn => {
      if (btn.getAttribute('data-page') === pageId) {
        btn.setAttribute('active', '');
      } else {
        btn.removeAttribute('active');
      }
    });
    
    // 获取或创建 iframe
    let iframe = container.querySelector('.sdk-page-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className = 'sdk-page-frame';
      const content = container.querySelector('.sdk-content');
      if (content) content.appendChild(iframe);
    }
    
    // 写入页面内容
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(\`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; font-family: system-ui, sans-serif; min-height: 100vh; }
          </style>
        </head>
        <body>
          \${page.code}
        </body>
      </html>
    \`);
    iframeDoc.close();
  }
  
  // 初始化 SDK
  function initSDK(container, options = {}) {
    if (!container) {
      console.error('[${name} SDK] 容器元素不存在');
      return null;
    }
    
    const instanceId = 'instance_' + Date.now();
    
    // 合并配置
    const finalConfig = { ...SDK_CONFIG, ...options };
    
    // 创建主容器
    const mainContainer = document.createElement('div');
    mainContainer.className = 'sdk-container';
    mainContainer.style.width = finalConfig.width || '100%';
    mainContainer.style.height = finalConfig.height || '600px';
    mainContainer.style.overflow = 'hidden';
    
    // 添加样式
    const styleEl = document.createElement('div');
    styleEl.innerHTML = generateStyles();
    mainContainer.appendChild(styleEl.firstChild);
    
    // 添加导航栏（多页面时显示）
    if (PAGES.length > 1) {
      const navWrapper = document.createElement('div');
      navWrapper.innerHTML = generateNavHTML();
      const navBar = navWrapper.firstChild;
      
      // 绑定导航事件
      navBar.addEventListener('click', (e) => {
        const btn = e.target.closest('.sdk-nav-btn');
        if (btn) {
          const pageId = btn.getAttribute('data-page');
          renderPage(mainContainer, pageId);
        }
      });
      
      mainContainer.appendChild(navBar);
    }
    
    // 添加内容区域
    const contentArea = document.createElement('div');
    contentArea.className = 'sdk-content';
    mainContainer.appendChild(contentArea);
    
    // 挂载到容器
    container.innerHTML = '';
    container.appendChild(mainContainer);
    
    // 渲染默认页面
    renderPage(mainContainer, DEFAULT_PAGE);
    
    // 存储实例
    const instance = {
      id: instanceId,
      name: SDK_NAME,
      token: SDK_TOKEN,
      container: mainContainer,
      config: finalConfig,
      currentPage: DEFAULT_PAGE,
      pages: PAGES,
      switchPage: (pageId) => renderPage(mainContainer, pageId),
      destroy: () => {
        mainContainer.remove();
        instances.delete(instanceId);
      }
    };
    
    instances.set(instanceId, instance);
    return instance;
  }
  
  // 自动初始化
  function autoInit() {
    const containers = document.querySelectorAll('[data-sdk-token="' + SDK_TOKEN + '"]');
    containers.forEach(function(container) {
      if (!container.hasAttribute('data-sdk-initialized')) {
        container.setAttribute('data-sdk-initialized', 'true');
        const options = {};
        try {
          const configAttr = container.getAttribute('data-sdk-config');
          if (configAttr) {
            Object.assign(options, JSON.parse(configAttr));
          }
        } catch (e) {
          console.warn('[${name} SDK] 配置解析失败:', e);
        }
        initSDK(container, options);
      }
    });
  }
  
  // DOM 加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
  
  // 暴露全局 API
  const globalName = '${name.replace(/[^a-zA-Z0-9]/g, '_')}SDK';
  window[globalName] = {
    init: initSDK,
    token: SDK_TOKEN,
    name: SDK_NAME,
    version: '2.0.0',
    pages: PAGES.map(p => ({ id: p.id, name: p.name })),
    instances: instances
  };
  
})();
`.trim();
}

// 生成 README 说明
function generateReadme(name: string, token: string): string {
  return `# ${name} SDK 使用说明

## 快速开始

### 方式一：直接嵌入（推荐用于测试）

将以下代码复制到你的 HTML 文件中：

\`\`\`html
<script src="https://your-domain/api/sdk/${token}/embed"></script>
<div data-sdk-token="${token}"></div>
\`\`\`

### 方式二：下载到服务器（推荐用于生产环境）

1. 点击"下载 SDK"按钮，保存 JS 文件
2. 将文件上传到你的服务器（如：\`/static/sdk/${name}.js\`）
3. 在 HTML 中引入：

\`\`\`html
<script src="/static/sdk/${name}.js"></script>
<div data-sdk-token="${token}"></div>
\`\`\`

## 配置选项

可以通过 \`data-sdk-config\` 属性传递配置：

\`\`\`html
<div data-sdk-token="${token}" data-sdk-config='{"width":"800px","height":"600px"}'></div>
\`\`\`

支持的配置项：
- \`width\`: 容器宽度（默认：100%）
- \`height\`: 容器高度（默认：600px）

## JavaScript API

SDK 会暴露全局对象，可用于手动控制：

\`\`\`javascript
// 获取 SDK 实例
const sdk = window.${name.replace(/[^a-zA-Z0-9]/g, '_')}SDK;

// 手动初始化
const instance = sdk.init(document.getElementById('my-container'), {
  width: '800px',
  height: '600px'
});

// 切换页面（多页面 SDK）
instance.switchPage('page_id');

// 销毁实例
instance.destroy();

// 查看所有页面
console.log(sdk.pages);
\`\`\`

## 注意事项

1. 确保 SDK 文件正确加载后再使用
2. 每个容器只能初始化一个 SDK 实例
3. 多个页面在独立的 iframe 中运行，互不影响
4. 建议在生产环境使用方式二（下载到服务器）

## 问题排查

### SDK 不显示
- 检查 script 标签路径是否正确
- 检查容器元素是否存在
- 查看浏览器控制台是否有错误

### 样式冲突
- SDK 在独立的 iframe 中运行，不会与宿主页面样式冲突
- 如需自定义样式，可以在页面代码中定义

## 更新日志

- v2.0.0: 支持多页面切换
- v1.0.0: 初始版本
`;
}
