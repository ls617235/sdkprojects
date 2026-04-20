/**
 * SDK 打包器 - 优化版
 * 支持代码压缩、语法检查、Source Map
 */

export interface SDKBundleOptions {
  /** SDK 名称 */
  name: string;
  /** SDK Token */
  token: string;
  /** HTML 代码 */
  html: string;
  /** CSS 代码 */
  css: string;
  /** JavaScript 代码 */
  js: string;
  /** 配置 Key */
  configKey: string;
  /** 是否压缩 */
  minify?: boolean;
  /** 是否启用 Source Map */
  sourceMap?: boolean;
}

/**
 * 简单的 JavaScript 代码压缩器
 * 移除注释、多余空格、换行
 */
function minifyCode(code: string): string {
  return code
    // 移除单行注释
    .replace(/\/\/.*$/gm, '')
    // 移除多行注释
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除多余空格
    .replace(/\s+/g, ' ')
    // 移除行首行尾空格
    .replace(/^\s+|\s+$/g, '')
    // 移除分号后的空格
    .replace(/;\s+/g, ';')
    // 移除逗号后的空格
    .replace(/,\s+/g, ',')
    // 移除大括号前后的空格
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    // 移除小括号前后的空格
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    // 移除方括号前后的空格
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    // 移除等号前后的空格
    .replace(/\s*=\s*/g, '=')
    // 移除冒号后的空格
    .replace(/:\s+/g, ':')
    .trim();
}

/**
 * 简单的 CSS 压缩器
 */
function minifyCSS(css: string): string {
  return css
    // 移除注释
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除多余空格
    .replace(/\s+/g, ' ')
    // 移除选择器后的空格
    .replace(/\s*\{\s*/g, '{')
    // 移除属性后的空格
    .replace(/;\s+/g, ';')
    // 移除最后一个分号
    .replace(/;\s*\}/g, '}')
    // 移除行首行尾空格
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

/**
 * 简单的 HTML 压缩器
 */
function minifyHTML(html: string): string {
  return html
    // 移除 HTML 注释
    .replace(/<!--[\s\S]*?-->/g, '')
    // 移除多余空格
    .replace(/\s+/g, ' ')
    // 移除标签间的空格
    .replace(/>\s+</g, '><')
    // 移除行首行尾空格
    .replace(/^\s+|\s+$/g, '')
    .trim();
}

/**
 * 检查 JavaScript 语法错误
 * 使用简单的括号匹配检查
 */
function checkSyntax(code: string): { valid: boolean; error?: string } {
  const brackets: { [key: string]: string } = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`'
  };
  
  const stack: string[] = [];
  let inString = false;
  let stringChar = '';
  let escaped = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    // 处理转义字符
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    // 处理字符串
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
      stack.push(char);
      continue;
    }
    
    if (inString) {
      if (char === stringChar) {
        inString = false;
        stack.pop();
      }
      continue;
    }
    
    // 处理注释
    if (char === '/' && code[i + 1] === '/') {
      // 跳过单行注释
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    
    if (char === '/' && code[i + 1] === '*') {
      // 跳过多行注释
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i++;
      continue;
    }
    
    // 处理括号
    if (char in brackets && char !== '"' && char !== "'" && char !== '`') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      const last = stack.pop();
      if (!last || brackets[last] !== char) {
        return { valid: false, error: `括号不匹配: 在位置 ${i} 发现 ${char}` };
      }
    }
  }
  
  if (stack.length > 0) {
    return { valid: false, error: `括号未闭合: ${stack.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * 生成 Source Map（简化版）
 */
function generateSourceMap(originalCode: string, minifiedCode: string): string {
  const lines = originalCode.split('\n');
  const mappings: string[] = [];
  
  // 简化的 source map 生成
  let currentLine = 0;
  let currentColumn = 0;
  
  for (let i = 0; i < lines.length; i++) {
    mappings.push(`${i};${currentLine};${currentColumn}`);
    currentLine++;
  }
  
  return JSON.stringify({
    version: 3,
    sources: ['original.js'],
    names: [],
    mappings: mappings.join(';'),
    sourcesContent: [originalCode]
  });
}

/**
 * SDK 全局样式（优化版）
 */
function getSDKGlobalStyles(): string {
  return `
    /* SDK 全局样式重置 - 最高优先级 */
    [data-sdk-token] * {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        position: relative !important;
        z-index: 999999 !important;
    }
    
    /* SDK 容器样式 */
    [data-sdk-token] {
        position: relative !important;
        z-index: 999999 !important;
        max-width: 100% !important;
        overflow: visible !important;
    }
    
    /* 弹窗样式增强 */
    [data-sdk-token] .modal {
        position: fixed !important;
        z-index: 999999 !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: auto !important;
        background-color: rgba(0,0,0,0.5) !important;
    }
    
    [data-sdk-token] .modal-content {
        background-color: #fefefe !important;
        margin: 10% auto !important;
        padding: 20px !important;
        border: 1px solid #888 !important;
        width: 90% !important;
        max-width: 600px !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
        position: relative !important;
        z-index: 999999 !important;
        scrollbar-width: thin !important;
        scrollbar-color: #888 #f1f1f1 !important;
    }
    
    [data-sdk-token] .modal-content::-webkit-scrollbar {
        width: 8px !important;
    }
    
    [data-sdk-token] .modal-content::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
        border-radius: 4px !important;
    }
    
    [data-sdk-token] .modal-content::-webkit-scrollbar-thumb {
        background: #888 !important;
        border-radius: 4px !important;
    }
    
    [data-sdk-token] .modal-content::-webkit-scrollbar-thumb:hover {
        background: #555 !important;
    }
    
    [data-sdk-token] .close {
        color: #aaa !important;
        float: right !important;
        font-size: 28px !important;
        font-weight: bold !important;
        cursor: pointer !important;
        z-index: 999999 !important;
    }
    
    [data-sdk-token] .close:hover,
    [data-sdk-token] .close:focus {
        color: black !important;
        text-decoration: none !important;
        cursor: pointer !important;
    }
    
    /* 聊天消息样式 */
    [data-sdk-token] .chat-message {
        margin: 10px 0 !important;
        padding: 10px !important;
        border-radius: 8px !important;
        max-width: 80% !important;
        z-index: 999999 !important;
    }
    
    [data-sdk-token] .user-message {
        background-color: #e3f2fd !important;
        align-self: flex-end !important;
        margin-left: auto !important;
        border-bottom-right-radius: 2px !important;
    }
    
    [data-sdk-token] .ai-message {
        background-color: #f1f1f1 !important;
        align-self: flex-start !important;
        border-bottom-left-radius: 2px !important;
    }
    
    /* 输入框样式 */
    [data-sdk-token] .message-input {
        width: 100% !important;
        padding: 10px !important;
        border: 1px solid #ddd !important;
        border-radius: 20px !important;
        margin-top: 10px !important;
        outline: none !important;
        z-index: 999999 !important;
        position: relative !important;
    }
    
    [data-sdk-token] .message-input:focus {
        border-color: #2196f3 !important;
        box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2) !important;
    }
    
    /* 发送按钮样式 */
    [data-sdk-token] .send-button {
        background-color: #2196f3 !important;
        color: white !important;
        border: none !important;
        border-radius: 20px !important;
        padding: 10px 20px !important;
        margin-left: 10px !important;
        cursor: pointer !important;
        font-weight: bold !important;
        z-index: 999999 !important;
        position: relative !important;
    }
    
    [data-sdk-token] .send-button:hover {
        background-color: #1976d2 !important;
    }
    
    /* 灵童图片样式 */
    [data-sdk-token] .lingtong-image {
        cursor: pointer !important;
        width: 100px !important;
        height: 100px !important;
        border-radius: 50% !important;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2) !important;
        transition: transform 0.3s ease !important;
        z-index: 999999 !important;
    }
    
    [data-sdk-token] .lingtong-image:hover {
        transform: scale(1.05) !important;
    }
    
    /* 新建会话按钮样式 */
    [data-sdk-token] .new-chat-button {
        background-color: #4caf50 !important;
        color: white !important;
        border: none !important;
        border-radius: 20px !important;
        padding: 8px 16px !important;
        margin: 10px 0 !important;
        cursor: pointer !important;
        font-weight: bold !important;
        z-index: 999999 !important;
        position: relative !important;
    }
    
    [data-sdk-token] .new-chat-button:hover {
        background-color: #45a049 !important;
    }
    
    /* 输入区域容器 */
    [data-sdk-token] .input-container {
        position: relative !important;
        z-index: 999999 !important;
        padding: 10px !important;
        background: white !important;
        border-top: 1px solid #eee !important;
    }
    
    /* 确保SDK样式不被第三方网站覆盖 */
    [data-sdk-token] * {
        z-index: 999999 !important;
        position: relative !important;
    }
    
    /* 防止第三方网站的overflow隐藏影响 */
    [data-sdk-token] .modal-content * {
        overflow: visible !important;
        position: relative !important;
        z-index: 999999 !important;
    }
  `;
}

/**
 * 优化版 SDK 打包器
 * 支持代码压缩、语法检查、Source Map
 */
export function webpackBundle(options: SDKBundleOptions): string {
  const { token, configKey, name, css, html, js, minify = false, sourceMap = false } = options;

  // 检查用户代码语法
  const syntaxCheck = checkSyntax(js);
  if (!syntaxCheck.valid) {
    console.warn('[SDK Bundler] 用户代码语法警告:', syntaxCheck.error);
    // 继续打包，但记录警告
  }

  // 压缩代码（如果启用）
  const processedCSS = minify ? minifyCSS(css) : css;
  const processedHTML = minify ? minifyHTML(html) : html;
  const processedJS = minify ? minifyCode(js) : js;

  // 获取 SDK 全局样式
  const sdkGlobalStyles = minify ? minifyCSS(getSDKGlobalStyles()) : getSDKGlobalStyles();

  // 使用字符串拼接生成SDK代码
  let sdkCode = '';
  
  sdkCode += '// ============================================\n';
  sdkCode += '// ' + name + ' SDK\n';
  sdkCode += '// Token: ' + token + '\n';
  if (minify) {
    sdkCode += '// Minified: true\n';
  }
  sdkCode += '// ============================================\n\n';
  
  sdkCode += '(function() {\n';
  sdkCode += '  \'use strict\';\n\n';
  
  sdkCode += '  var SDK_TOKEN = ' + JSON.stringify(token) + ';\n';
  sdkCode += '  var CONFIG_KEY = ' + JSON.stringify(configKey) + ';\n';
  sdkCode += '  var SDK_HTML = ' + JSON.stringify(processedHTML) + ';\n';
  sdkCode += '  var SDK_CSS = ' + JSON.stringify(processedCSS) + ';\n';
  sdkCode += '  var SDK_JS = ' + JSON.stringify(processedJS) + ';\n\n';
  
  // 添加 Source Map（如果启用）
  if (sourceMap) {
    const sourceMapData = generateSourceMap(js, processedJS);
    sdkCode += '  //# sourceMappingURL=data:application/json;base64,' + btoa(sourceMapData) + '\n\n';
  }
  
  sdkCode += '  // 获取宿主配置\n';
  sdkCode += '  function getHostConfig() {\n';
  sdkCode += '    if (typeof window !== \'undefined\' && window[CONFIG_KEY]) {\n';
  sdkCode += '      return window[CONFIG_KEY];\n';
  sdkCode += '    }\n';
  sdkCode += '    return {};\n';
  sdkCode += '  }\n\n';
  
  sdkCode += '  // 初始化 SDK\n';
  sdkCode += '  function initSDK(container) {\n';
  sdkCode += '    if (!container || container._sdkInitialized) return;\n';
  sdkCode += '    container._sdkInitialized = true;\n\n';
  sdkCode += '    var config = getHostConfig();\n\n';
  
  sdkCode += '    // 注入全局样式重置和SDK专用样式\n';
  sdkCode += '    var style = document.createElement(\'style\');\n';
  sdkCode += '    style.textContent = ' + JSON.stringify(sdkGlobalStyles) + ' + SDK_CSS;\n';
  sdkCode += '    style.setAttribute(\'data-sdk-style\', SDK_TOKEN);\n';
  sdkCode += '    document.head.appendChild(style);\n\n';
  
  sdkCode += '    // 处理 innerHTML 插入的 script 标签\n';
  sdkCode += '    var tempDiv = document.createElement(\'div\');\n';
  sdkCode += '    tempDiv.innerHTML = SDK_HTML;\n\n';
  
  sdkCode += '    var scriptsToExecute = [];\n';
  sdkCode += '    var scriptElements = tempDiv.querySelectorAll(\'script\');\n';
  sdkCode += '    scriptElements.forEach(function(script) {\n';
  sdkCode += '      if (script.src) {\n';
  sdkCode += '        scriptsToExecute.push({ src: script.src });\n';
  sdkCode += '      } else if (script.textContent && script.textContent.trim()) {\n';
  sdkCode += '        try {\n';
  sdkCode += '          eval(script.textContent);\n';
  sdkCode += '        } catch(e) {\n';
  sdkCode += '          console.error(\'[SDK] 内联脚本执行错误:\', e.message);\n';
  sdkCode += '        }\n';
  sdkCode += '      }\n';
  sdkCode += '      script.remove();\n';
  sdkCode += '    });\n\n';
  
  sdkCode += '    container.innerHTML = tempDiv.innerHTML;\n\n';
  
  sdkCode += '    function loadScript(src, callback) {\n';
  sdkCode += '      var s = document.createElement(\'script\');\n';
  sdkCode += '      s.src = src;\n';
  sdkCode += '      s.onload = callback;\n';
  sdkCode += '      s.onerror = function() {\n';
  sdkCode += '        console.error(\'[SDK] 脚本加载失败:\', src);\n';
  sdkCode += '        callback();\n';
  sdkCode += '      };\n';
  sdkCode += '      document.head.appendChild(s);\n';
  sdkCode += '    }\n\n';
  
  sdkCode += '    function loadScriptsSequentially(index) {\n';
  sdkCode += '      if (index < scriptsToExecute.length) {\n';
  sdkCode += '        loadScript(scriptsToExecute[index].src, function() {\n';
  sdkCode += '          loadScriptsSequentially(index + 1);\n';
  sdkCode += '        });\n';
  sdkCode += '      }\n';
  sdkCode += '    }\n\n';
  
  sdkCode += '    if (scriptsToExecute.length > 0) {\n';
  sdkCode += '      loadScriptsSequentially(0);\n';
  sdkCode += '    }\n\n';
  
  sdkCode += '    window.dispatchEvent(new CustomEvent(\'sdk:mounted\', { detail: { token: SDK_TOKEN } }));\n';
  sdkCode += '  }\n\n';
  
  sdkCode += '  // 自动初始化\n';
  sdkCode += '  function autoInit() {\n';
  sdkCode += '    var containers = document.querySelectorAll(\'[data-sdk-token="\' + SDK_TOKEN + \'"]\');\n';
  sdkCode += '    containers.forEach(function(c) { initSDK(c); });\n';
  sdkCode += '  }\n\n';
  
  sdkCode += '  if (typeof document !== \'undefined\') {\n';
  sdkCode += '    if (document.readyState === \'loading\') {\n';
  sdkCode += '      document.addEventListener(\'DOMContentLoaded\', autoInit);\n';
  sdkCode += '    } else {\n';
  sdkCode += '      autoInit();\n';
  sdkCode += '    }\n\n';
  
  sdkCode += '    var observer = new MutationObserver(function() { autoInit(); });\n';
  sdkCode += '    if (document.body) observer.observe(document.body, { childList: true, subtree: true });\n\n';
  
  sdkCode += '    function lingtongAPI(endpoint, options) {\n';
  sdkCode += '      options = options || {};\n';
  sdkCode += '      var config = getHostConfig();\n';
  sdkCode += '      var baseUrl = config.apiBaseUrl || \'https://lingtong-platform.com/api\';\n';
  sdkCode += '      var token = config.token || config.apiKey;\n\n';
  
  sdkCode += '      console.log(\'[SDK] 发送灵童平台请求:\', {\n';
  sdkCode += '        endpoint: endpoint,\n';
  sdkCode += '        baseUrl: baseUrl,\n';
  sdkCode += '        method: options.method || \'GET\',\n';
  sdkCode += '        hasToken: !!token,\n';
  sdkCode += '        timestamp: new Date().toISOString()\n';
  sdkCode += '      });\n\n';
  
  sdkCode += '      return fetch(baseUrl + endpoint, {\n';
  sdkCode += '        method: options.method || \'GET\',\n';
  sdkCode += '        headers: {\n';
  sdkCode += '          \'Content-Type\': \'application/json\',\n';
  sdkCode += '          \'Authorization\': token ? \'Bearer \' + token : \'\'\n';
  sdkCode += '        },\n';
  sdkCode += '        body: options.body\n';
  sdkCode += '      }).then(function(response) {\n';
  sdkCode += '        console.log(\'[SDK] 灵童平台响应:\', {\n';
  sdkCode += '          endpoint: endpoint,\n';
  sdkCode += '          status: response.status,\n';
  sdkCode += '          statusText: response.statusText,\n';
  sdkCode += '          timestamp: new Date().toISOString()\n';
  sdkCode += '        });\n\n';
  
  sdkCode += '        if (!response.ok) {\n';
  sdkCode += '          throw new Error(\'API 请求失败: \' + response.status);\n';
  sdkCode += '        }\n';
  sdkCode += '        return response.json();\n';
  sdkCode += '      }).then(function(data) {\n';
  sdkCode += '        console.log(\'[SDK] 灵童平台响应数据:\', {\n';
  sdkCode += '          endpoint: endpoint,\n';
  sdkCode += '          data: data,\n';
  sdkCode += '          timestamp: new Date().toISOString()\n';
  sdkCode += '        });\n';
  sdkCode += '        return data;\n';
  sdkCode += '      }).catch(function(error) {\n';
  sdkCode += '        console.error(\'[SDK] 灵童平台请求错误:\', {\n';
  sdkCode += '          endpoint: endpoint,\n';
  sdkCode += '          error: error.message,\n';
  sdkCode += '          timestamp: new Date().toISOString()\n';
  sdkCode += '        });\n';
  sdkCode += '        throw error;\n';
  sdkCode += '      });\n';
  sdkCode += '    }\n\n';
  
  sdkCode += '    window[\'SDK_\' + SDK_TOKEN.slice(0, 8)] = {\n';
  sdkCode += '      init: autoInit,\n';
  sdkCode += '      config: getHostConfig(),\n';
  sdkCode += '      api: lingtongAPI,\n';
  sdkCode += '      lingtong: {\n';
  sdkCode += '        getUserInfo: function() { return lingtongAPI(\'/user/info\'); },\n';
  sdkCode += '        sendMessage: function(message) { return lingtongAPI(\'/lingtong/chat\', {\n';
  sdkCode += '          method: \'POST\',\n';
  sdkCode += '          body: JSON.stringify({ \n';
  sdkCode += '            message: message,\n';
  sdkCode += '            user_name: config.custom && config.custom.userName ? config.custom.userName : \'anonymous\'\n';
  sdkCode += '          })\n';
  sdkCode += '        }); },\n';
  sdkCode += '        getLingTongList: function() { return lingtongAPI(\'/lingtong/myConversations\'); },\n';
  sdkCode += '        interact: function(action, data) { return lingtongAPI(\'/lingtong/interact\', {\n';
  sdkCode += '          method: \'POST\',\n';
  sdkCode += '          body: JSON.stringify({ action: action, data: data })\n';
  sdkCode += '        }); }\n';
  sdkCode += '      }\n';
  sdkCode += '    };\n\n';
  
  sdkCode += '    window.dispatchEvent(new CustomEvent(\'sdk:initialized\', { detail: { token: SDK_TOKEN } }));\n';
  sdkCode += '  }\n';
  sdkCode += '})();\n';
  
  return sdkCode;
}

// 保持兼容性的别名
export const simpleBundle = webpackBundle;

export default { webpackBundle, simpleBundle };
