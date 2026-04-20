"""
SDK Share Platform - SDK 生成服务
生成可嵌入的 JavaScript SDK 代码，支持宿主系统配置注入
"""
import json
import re
import base64
from typing import List, Dict, Optional

from loguru import logger


class SDKGenerator:
    """SDK 代码生成器"""

    @staticmethod
    def encode_code(code: str) -> str:
        """使用 Base64 编码用户代码，避免 JSON 转义导致的语法错误"""
        return base64.b64encode(code.encode('utf-8')).decode('ascii')

    @staticmethod
    def process_template_variables(code: str) -> str:
        """处理模板变量
        
        将模板变量替换为运行时变量引用：
        - {{assets_base_url}} → SDK_CONFIG.assetsBaseUrl
        - {{api_base_url}} → SDK_CONFIG.apiBaseUrl
        - {{api_key}} → SDK_CONFIG.apiKey
        - {{custom.xxx}} → SDK_CONFIG.custom?.xxx
        """
        # 处理配置变量
        replacements = {
            r'\{\{assets_base_url\}\}': 'SDK_CONFIG.assetsBaseUrl',
            r'\{\{api_base_url\}\}': 'SDK_CONFIG.apiBaseUrl',
            r'\{\{api_key\}\}': 'SDK_CONFIG.apiKey',
        }
        
        for pattern, replacement in replacements.items():
            code = re.sub(pattern, f'" + {replacement} + "', code)
        
        # 处理自定义变量 {{custom.xxx}}
        code = re.sub(
            r'\{\{custom\.(\w+)\}\}',
            lambda m: f'" + (SDK_CONFIG.custom?.{m.group(1)} || "") + "',
            code
        )
        
        return code

    @staticmethod
    def inject_sdk_helpers(code: str) -> str:
        """注入 SDK 辅助方法到页面代码
        
        在页面代码开头注入 SDK 工具对象
        """
        helper_code = """
<script>
// SDK 工具对象（由 SDK 自动注入）
window.__SDK__ = {
  config: SDK_CONFIG,
  // API 请求封装
  api: function(endpoint, options) {
    options = options || {};
    var url = SDK_CONFIG.apiBaseUrl + endpoint;
    var headers = options.headers || {};
    
    if (SDK_CONFIG.apiKey) {
      headers['X-API-Key'] = SDK_CONFIG.apiKey;
    }
    
    return fetch(url, { ...options, headers: headers }).then(r => r.json());
  },
  // 获取资源 URL
  asset: function(path) {
    if (!path || path.startsWith('http') || path.startsWith('data:')) return path;
    return SDK_CONFIG.assetsBaseUrl + '/' + path;
  }
};
</script>
"""
        return helper_code + code

    @classmethod
    def generate_sdk_loader(
        cls, 
        sdk: dict, 
        domain: str = "",
        default_config: Optional[Dict] = None
    ) -> str:
        """生成 SDK 加载器代码
        
        SDK 会自动读取宿主页面注入的配置：
        1. 查找 window.SDK_CONFIG_{TOKEN}
        2. 读取 data-sdk-config 属性
        3. 使用默认配置
        
        页面代码支持模板变量：
        - {{assets_base_url}} - 资源基础路径
        - {{api_base_url}} - API 基础路径
        - {{api_key}} - API Key
        - {{custom.xxx}} - 自定义配置
        """
        pages_data = []
        default_page = None

        for page in sdk.get('pages', []):
            page_code = page['code']
            
            # 处理模板变量
            page_code = cls.process_template_variables(page_code)
            
            # 使用 Base64 编码避免转义问题
            pages_data.append({
                "id": page['page_id'],
                "name": page['name'],
                "code": cls.encode_code(page_code),
                "isDefault": page.get('is_default', False),
            })
            if page.get('is_default'):
                default_page = page['page_id']

        if not default_page and pages_data:
            default_page = pages_data[0]['id']

        # 默认配置
        default_config = default_config or {}

        # 检查用户代码是否是纯 HTML 页面（不是 SDK 格式）
        # 如果是纯 HTML 页面，创建一个简单的 SDK 加载器，直接在 iframe 中显示
        if pages_data:
            # first_page_code 现在是 Base64 编码的，需要先解码来检测 HTML 类型
            first_page_code_b64 = pages_data[0].get('code', '')
            first_page_code_raw = base64.b64decode(first_page_code_b64).decode('utf-8')
            
            # 检查是否是完整的 HTML 页面（包含 doctype、html、body 标签）
            is_pure_html = ('<!DOCTYPE html' in first_page_code_raw.lower() or 
                          '<html' in first_page_code_raw.lower() or 
                          '<body' in first_page_code_raw.lower())
            # 检查是否不是 SDK 格式
            is_not_sdk_format = ('var SDK_TOKEN' not in first_page_code_raw and 
                                'var SDK_CSS' not in first_page_code_raw and 
                                'var SDK_HTML' not in first_page_code_raw and 
                                'var SDK_JS' not in first_page_code_raw)
            
            if is_pure_html and is_not_sdk_format:
                logger.info("检测到纯 HTML 页面，创建简单 SDK 加载器")
                # 创建一个简单的 SDK 加载器，直接在 iframe 中显示 HTML 页面
                token = sdk['share_token']
                config_key = f"SDK_CONFIG_{token[:8].upper()}"
                
                # 对原始 HTML 内容进行 repr 编码
                html_content_str = repr(first_page_code_raw)
                
                simple_sdk_code = """
(function() {
  'use strict';
  
  var SDK_TOKEN = '%s';
  var CONFIG_KEY = 'SDK_CONFIG_' + SDK_TOKEN.slice(0, 8).toUpperCase();
  
  function loadConfig() {
    var config = null;
    if (window[CONFIG_KEY]) {
      config = window[CONFIG_KEY];
    }
    var container = document.querySelector("[data-sdk-token='" + SDK_TOKEN + "']");
    if (container && container.dataset.sdkConfig) {
      try {
        config = JSON.parse(container.dataset.sdkConfig);
      } catch(e) {}
    }
    if (!config) {
      config = {};
    }
    return {
      assetsBaseUrl: config.assetsBaseUrl || config.assets_base_url || '%s',
      apiBaseUrl: config.apiBaseUrl || config.api_base_url || '%s',
      apiKey: config.apiKey || config.api_key || null,
      custom: config.custom || {},
      ...config
    };
  }
  
  var SDK_CONFIG = loadConfig();
  
  // 暴露 API
  window[CONFIG_KEY] = {
    config: SDK_CONFIG,
    api: function(endpoint, options) {
      options = options || {};
      var url = SDK_CONFIG.apiBaseUrl + endpoint;
      var headers = options.headers || {};
      if (SDK_CONFIG.apiKey) {
        headers['X-API-Key'] = SDK_CONFIG.apiKey;
      }
      if (SDK_CONFIG.token) {
        headers['Authorization'] = 'Bearer ' + SDK_CONFIG.token;
      }
      return fetch(url, options).then(function(r) { return r.json(); });
    },
    asset: function(path) {
      if (!path) return path;
      if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) {
        return path;
      }
      return SDK_CONFIG.assetsBaseUrl + '/' + path;
    }
  };
  
  function init() {
    var containers = document.querySelectorAll("[data-sdk-token='" + SDK_TOKEN + "']");
    
    containers.forEach(function(container) {
      if (container._sdkInitialized) return;
      container._sdkInitialized = true;
      
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'width:100%%;height:100%%;border:none;';
      container.innerHTML = '';
      container.appendChild(iframe);
      
      var html_content = %s;
      
      // 在 iframe 加载完成后，确保脚本中的函数能被 onclick 访问
      // 通过在 iframe 的 window 上暴露必要的函数
      iframe.onload = function() {
        // 将父窗口的 SDK 工具方法暴露给 iframe
        iframe.contentWindow.__SDK__ = { 
          api: function(e,o){ return window[CONFIG_KEY].api(e,o); }, 
          asset: function(p){ return window[CONFIG_KEY].asset(p); } 
        };
        iframe.contentWindow.SDK_CONFIG = SDK_CONFIG;
        iframe.contentWindow.SDK_TOKEN = SDK_TOKEN;
      };
      
      // 注入 SDK 配置到 iframe
      // 在 html_content 的 </body> 标签前插入 SDK 配置脚本和工具方法
      var sdk_config_script = '<script>window.SDK_CONFIG = ' + JSON.stringify(SDK_CONFIG) + ';window.SDK_TOKEN = "' + SDK_TOKEN + '";<\/scr' + 'ipt>';
      var sdk_helper_script = '<script>window.__SDK__ = { api: function(e,o){ return window.parent["' + CONFIG_KEY + '"].api(e,o); }, asset: function(p){ return window.parent["' + CONFIG_KEY + '"].asset(p); } };<\/scr' + 'ipt>';
      
      // 将 SDK 配置脚本和工具方法插入到 HTML 内容中
      var final_html = html_content;
      if (final_html.includes('</body>')) {
        final_html = final_html.replace('</body>', sdk_config_script + sdk_helper_script + '</body>');
      } else {
        final_html = final_html + sdk_config_script + sdk_helper_script;
      }
      
      iframe.srcdoc = final_html;
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(init, 100);
})();
""" % (token, domain, domain, html_content_str)
                return simple_sdk_code

        # 生成 SDK 代码
        sdk_code = f"""
(function() {{
  'use strict';

  // ==========================================
  // SDK Token
  // ==========================================
  var SDK_TOKEN = '{sdk['share_token']}';
  var CONFIG_KEY = 'SDK_CONFIG_' + SDK_TOKEN.slice(0, 8).toUpperCase();

  // ==========================================
  // 读取宿主系统配置（优先级从高到低）
  // ==========================================
  function loadConfig() {{
    var config = null;
    
    // 1. 从全局变量读取（推荐方式）
    if (window[CONFIG_KEY]) {{
      config = window[CONFIG_KEY];
    }}
    
    // 2. 从容器 data 属性读取
    var container = document.querySelector('[data-sdk-token="' + SDK_TOKEN + '"]');
    if (container && container.dataset.sdkConfig) {{
      try {{
        config = JSON.parse(container.dataset.sdkConfig);
      }} catch(e) {{}}
    }}
    
    // 3. 使用默认配置
    if (!config) {{
      config = {json.dumps(default_config)};
    }}
    
    // 合并默认值
    return {{
      assetsBaseUrl: config.assetsBaseUrl || config.assets_base_url || '{domain}',
      apiBaseUrl: config.apiBaseUrl || config.api_base_url || '{domain}',
      apiKey: config.apiKey || config.api_key || null,
      custom: config.custom || {{}},
      // 保留原始配置
      ...config
    }};
  }}

  var SDK_CONFIG = loadConfig();

  // ==========================================
  // SDK 工具方法
  // ==========================================
  
  // API 请求封装
  function sdkApi(endpoint, options) {{
    options = options || {{}};
    var url = SDK_CONFIG.apiBaseUrl + endpoint;
    var headers = options.headers || {{}};
    
    // 添加 API Key 认证
    if (SDK_CONFIG.apiKey) {{
      headers['X-API-Key'] = SDK_CONFIG.apiKey;
    }}
    
    // 添加 Token 认证（Bearer）
    if (SDK_CONFIG.token) {{
      headers['Authorization'] = 'Bearer ' + SDK_CONFIG.token;
    }}
    
    return fetch(url, {{
      ...options,
      headers: headers
    }}).then(function(response) {{
      if (!response.ok) {{
        throw new Error('API 请求失败: ' + response.status);
      }}
      return response.json();
    }});
  }}

  // 获取资源 URL
  function sdkAsset(path) {{
    if (!path) return path;
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('/')) {{
      return path;
    }}
    return SDK_CONFIG.assetsBaseUrl + '/' + path;
  }}

  // 暴露到全局
  window[CONFIG_KEY] = {{
    config: SDK_CONFIG,
    api: sdkApi,
    asset: sdkAsset,
    // 兼容旧版
    getAsset: sdkAsset
  }};

  // ==========================================
  // Base64 解码函数
  // ==========================================
  function decodeB64(str) {{
    try {{
      return decodeURIComponent(atob(str).split('').map(function(c) {{
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }}).join(''));
    }} catch(e) {{
      return atob(str);
    }}
  }}

  // ==========================================
  // 页面数据（使用 Base64 编码避免转义问题）
  // ==========================================
  var PAGES_DATA_RAW = {json.dumps(pages_data)};
  var PAGES = PAGES_DATA_RAW.map(function(page) {{
    return {{
      id: page.id,
      name: page.name,
      code: decodeB64(page.code),
      isDefault: page.isDefault
    }};
  }});
  var DEFAULT_PAGE = '{default_page}';

  // 当前页面状态
  var currentPage = DEFAULT_PAGE;

  // SDK 实例存储
  var instances = new Map();

  // ==========================================
  // UI 生成
  // ==========================================
  
  function generateNavHTML() {{
    if (PAGES.length <= 1) return '';

    var navItems = PAGES.map(function(page) {{
      return '<button class="sdk-nav-btn" data-page="' + page.id + '" ' +
      (page.id === currentPage ? 'active' : '') + '>' + page.name + '</button>';
    }}).join('');

    return '<div class="sdk-nav-bar">' + navItems + '</div>';
  }}

  function generateStyles() {{
    return `
      <style>
        .sdk-container {{ 
          width: 100%; 
          height: 100%; 
          display: flex; 
          flex-direction: column; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        }}
        .sdk-nav-bar {{ 
          display: flex; 
          gap: 8px; 
          padding: 12px; 
          background: #1a1a2e; 
          border-bottom: 1px solid rgba(255,255,255,0.1); 
          flex-wrap: wrap; 
        }}
        .sdk-nav-btn {{ 
          padding: 8px 16px; 
          border: none; 
          border-radius: 6px; 
          background: rgba(255,255,255,0.1); 
          color: #fff; 
          cursor: pointer; 
          font-size: 14px; 
          transition: all 0.2s; 
        }}
        .sdk-nav-btn:hover {{ background: rgba(255,255,255,0.2); }}
        .sdk-nav-btn[active] {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }}
        .sdk-content {{ flex: 1; overflow: auto; position: relative; }}
        .sdk-page-frame {{ width: 100%; height: 100%; border: none; }}
      </style>
    `;
  }}

  // ==========================================
  // 页面渲染
  // ==========================================
  
  function renderPage(container, pageId) {{
    var page = PAGES.find(function(p) {{ return p.id === pageId; }});
    if (!page) return;

    currentPage = pageId;

    // 更新导航按钮状态
    var navBtns = container.querySelectorAll('.sdk-nav-btn');
    navBtns.forEach(function(btn) {{
      if (btn.getAttribute('data-page') === pageId) {{
        btn.setAttribute('active', '');
      }} else {{
        btn.removeAttribute('active');
      }}
    }});

    // 创建 iframe 隔离环境
    var contentEl = container.querySelector('.sdk-content');
    var iframe = contentEl.querySelector('.sdk-page-frame');
    
    if (!iframe) {{
      iframe = document.createElement('iframe');
      iframe.className = 'sdk-page-frame';
      contentEl.innerHTML = '';
      contentEl.appendChild(iframe);
    }}

    // 注入 SDK 配置到 iframe
    var configScript = '<script>window.SDK_CONFIG = ' + JSON.stringify(SDK_CONFIG) + ';<' + '/script>';
    var helperScript = '<script>window.__SDK__ = {{ api: function(e,o){{ return window.parent[CONFIG_KEY].api(e,o); }}, asset: function(p){{ return window.parent[CONFIG_KEY].asset(p); }} }};<' + '/script>';
    
    // 设置 iframe 内容
    iframe.srcdoc = generateStyles() + configScript + helperScript + page['code'];
  }}

  // ==========================================
  // 初始化
  // ==========================================
  
  function init() {{
    // 重新加载配置（可能在 script 加载后才设置）
    SDK_CONFIG = loadConfig();
    
    var containers = document.querySelectorAll('[data-sdk-token="' + SDK_TOKEN + '"]');
    
    containers.forEach(function(container) {{
      if (instances.has(container)) return;

      var instance = {{
        container: container,
        currentPage: DEFAULT_PAGE,
        navigate: function(pageId) {{
          renderPage(container, pageId);
        }},
        updateConfig: function(newConfig) {{
          Object.assign(SDK_CONFIG, newConfig);
          renderPage(container, currentPage);
        }}
      }};

      instances.set(container, instance);

      // 注入样式
      var styleContainer = document.createElement('div');
      styleContainer.innerHTML = generateStyles();
      container.appendChild(styleContainer.firstChild);

      // 创建导航和内容区域
      var wrapper = document.createElement('div');
      wrapper.className = 'sdk-container';
      wrapper.innerHTML = generateNavHTML() + '<div class="sdk-content"></div>';
      container.appendChild(wrapper);

      // 渲染默认页面
      renderPage(container, DEFAULT_PAGE);

      // 绑定导航事件
      wrapper.querySelectorAll('.sdk-nav-btn').forEach(function(btn) {{
        btn.addEventListener('click', function() {{
          var pageId = btn.getAttribute('data-page');
          renderPage(container, pageId);
        }});
      }});
    }});
  }}

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', init);
  }} else {{
    init();
  }}

  // 支持动态加载（延迟设置的配置）
  setTimeout(init, 100);

  // 暴露 API
  window[CONFIG_KEY].init = init;
  window[CONFIG_KEY].navigate = function(container, pageId) {{
    var instance = instances.get(container);
    if (instance) instance.navigate(pageId);
  }};
  window[CONFIG_KEY].updateConfig = function(newConfig) {{
    Object.assign(SDK_CONFIG, newConfig);
    init();
  }};

}})();
"""
        return sdk_code

    @staticmethod
    def generate_embed_code(
        token: str,
        config_example: Optional[Dict] = None
    ) -> str:
        """生成嵌入代码 HTML
        
        包含配置示例，宿主系统需要填写实际值
        """
        config_example = config_example or {
            "assetsBaseUrl": "当前系统的资源地址（如：https://your-system.com/assets）",
            "apiBaseUrl": "当前系统的API地址（如：https://your-system.com/api）",
            "apiKey": "API Key（如果SDK是私有的）",
            "custom": {
                "userId": "当前用户ID",
                "token": "当前用户Token",
                # 其他自定义字段
            }
        }
        
        config_json = json.dumps(config_example, indent=4, ensure_ascii=False)
        
        return f"""<!-- SDK 配置（必须放在 SDK 脚本之前） -->
<script>
window.SDK_CONFIG_{token[:8].upper()} = {{
  // 【必填】资源基础路径 - 用于加载图片等静态资源
  assetsBaseUrl: '/assets',  // 或完整URL: 'https://your-system.com/assets'
  
  // 【必填】API基础路径 - 用于调用后台接口
  apiBaseUrl: '/api',  // 或完整URL: 'https://your-system.com/api'
  
  // 【可选】API Key（私有SDK必需）
  apiKey: '',  // 如: 'sk_live_xxx'
  
  // 【可选】自定义数据 - 可在页面代码中通过 {{custom.xxx}} 引用
  custom: {{
    userId: '',      // 当前用户ID
    userName: '',    // 当前用户名
    token: '',       // 认证Token
    // 添加更多自定义字段...
  }}
}};
</script>

<!-- SDK 脚本 -->
<script src="/api/sdk/{token}/embed"></script>

<!-- SDK 容器 -->
<div data-sdk-token="{token}"></div>

<!-- 可选：通过 data 属性传递配置（另一种方式） -->
<!-- <div data-sdk-token="{token}" data-sdk-config='{{"assetsBaseUrl":"/assets","apiBaseUrl":"/api"}}'></div> -->
"""

    @staticmethod
    def generate_usage_examples(token: str) -> str:
        """生成使用示例"""
        config_key = token[:8].upper()
        return f"""## SDK 使用示例

### 1. 在页面代码中使用配置

上传的页面代码支持以下模板变量:

```html
<!-- 使用资源路径 -->
<img src="{{assets_base_url}}/images/logo.png">
<link href="{{assets_base_url}}/css/style.css">

<!-- 使用 API 路径 -->
<script>
fetch('{{api_base_url}}/users', {{
  headers: {{
    'Authorization': 'Bearer {{custom.token}}'
  }}
}}
)</script>

<!-- 使用自定义配置 -->
<div>当前用户: {{custom.userName}}</div>
</script>
```

### 2. 使用 SDK 工具方法

SDK 会自动注入工具对象到页面:

```javascript
// 方式一: 使用注入的 __SDK__ 对象
__SDK__.api('/users').then(data => console.log(data));
__SDK__.asset('images/logo.png');  // 返回完整URL

// 方式二: 使用全局配置对象
SDK_CONFIG.assetsBaseUrl
SDK_CONFIG.apiBaseUrl
SDK_CONFIG.custom.userId
```

### 3. 动态更新配置

```javascript
// 更新配置并刷新
window.SDK_CONFIG_{config_key}.updateConfig({{
  custom: {{
    userId: '123',
    userName: '张三'
  }}
}});
```

### 4. 页面导航

```javascript
// 跳转到指定页面
window.SDK_CONFIG_{config_key}.navigate(container, 'page_2');
```
"""


    @staticmethod
    def generate_download_filename(token: str) -> str:
        """生成下载文件名"""
        return f"sdk_{token[:8]}.js"
