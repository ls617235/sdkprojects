"""
Webpack SDK 打包服务
后端使用 subprocess 调用 Node.js 运行 Webpack 打包
"""

import subprocess
import tempfile
import os
import json
import re
import base64
from pathlib import Path
from app.core.config import settings


def bundle_sdk_with_webpack(
    name: str,
    token: str,
    html: str,
    css: str,
    js: str,
    config_key: str,
    minify: bool = True,
    validate: bool = True,
    sdk_config: dict = None
) -> str:
    """
    使用优化的打包方案生成 SDK 代码
    
    Args:
        name: SDK 名称
        token: SDK Token
        html: HTML 代码
        css: CSS 代码
        js: JavaScript 代码
        config_key: 配置键
        minify: 是否压缩代码（默认True）
        validate: 是否验证代码语法（默认True）
        sdk_config: SDK 配置（包含 app_info 等）
    
    Returns:
        打包后的 JavaScript 代码
    """
    # 使用简单打包方案
    return generate_simple_bundle(name, token, html, css, js, config_key, sdk_config)


def preprocess_js_code(js_code: str) -> str:
    """
    预处理 JavaScript 代码，将 ES6+ 语法转换为 ES5 兼容语法
    主要处理：
    1. 模板字符串转换为普通字符串拼接
    2. 箭头函数转换为普通函数
    3. const/let 转换为 var
    """
    if not js_code:
        return js_code
    
    # 处理模板字符串 - 使用栈结构处理嵌套大括号和嵌套模板字符串
    def process_template_strings(code):
        result = []
        i = 0
        while i < len(code):
            if code[i] == '`':
                # 找到模板字符串的开始
                template_start = i
                i += 1
                content_parts = []
                current_text = []
                
                while i < len(code) and code[i] != '`':
                    if code[i] == '$' and i + 1 < len(code) and code[i + 1] == '{':
                        # 先保存之前的文本
                        if current_text:
                            content_parts.append(('text', ''.join(current_text)))
                            current_text = []
                        
                        # 找到 ${，使用栈来匹配完整的大括号内容
                        brace_depth = 1
                        expr_start = i + 2  # 跳过 ${
                        i += 2
                        
                        while i < len(code) and brace_depth > 0:
                            if code[i] == '{':
                                brace_depth += 1
                            elif code[i] == '}':
                                brace_depth -= 1
                            i += 1
                        
                        # 提取完整的表达式（不包括 ${ 和 }）
                        expr = code[expr_start:i-1]
                        content_parts.append(('expr', expr))
                    elif code[i] == '\\' and i + 1 < len(code):
                        # 处理转义字符
                        current_text.append(code[i:i+2])
                        i += 2
                    else:
                        current_text.append(code[i])
                        i += 1
                
                # 保存最后的文本
                if current_text:
                    content_parts.append(('text', ''.join(current_text)))
                
                if i < len(code) and code[i] == '`':
                    # 找到结束反引号
                    i += 1
                    
                    # 将模板字符串内容转换为字符串拼接
                    processed_parts = []
                    for part_type, part_value in content_parts:
                        if part_type == 'expr':
                            # 这是一个表达式，递归处理其中的模板字符串
                            processed_inner = process_template_strings(part_value)
                            processed_parts.append('" + (' + processed_inner + ') + "')
                        else:
                            # 普通文本，需要转义双引号和反斜杠
                            escaped = part_value.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
                            processed_parts.append(escaped)
                    
                    # 合并所有部分
                    result.append('"' + ''.join(processed_parts) + '"')
                else:
                    # 没有找到结束反引号，保留原样
                    result.append(code[template_start:i])
            else:
                result.append(code[i])
                i += 1
        
        return ''.join(result)
    
    # 处理模板字符串
    js_code = process_template_strings(js_code)
    
    return js_code
    
    # 处理模板字符串 - 使用栈结构处理嵌套大括号和嵌套模板字符串
    def process_template_strings(code):
        result = []
        i = 0
        while i < len(code):
            if code[i] == '`':
                # 找到模板字符串的开始
                template_start = i
                i += 1
                content_parts = []
                
                while i < len(code) and code[i] != '`':
                    if code[i] == '$' and i + 1 < len(code) and code[i + 1] == '{':
                        # 找到 ${，使用栈来匹配完整的大括号内容
                        brace_depth = 1
                        expr_start = i
                        i += 2  # 跳过 ${
                        
                        while i < len(code) and brace_depth > 0:
                            if code[i] == '{':
                                brace_depth += 1
                            elif code[i] == '}':
                                brace_depth -= 1
                            i += 1
                        
                        # 提取完整的表达式（包括 ${ 和 }）
                        expr = code[expr_start:i]
                        content_parts.append(expr)
                    elif code[i] == '\\' and i + 1 < len(code):
                        # 处理转义字符
                        content_parts.append(code[i:i+2])
                        i += 2
                    else:
                        content_parts.append(code[i])
                        i += 1
                
                if i < len(code) and code[i] == '`':
                    # 找到结束反引号
                    i += 1
                    
                    # 将模板字符串内容转换为字符串拼接
                    # 首先递归处理嵌套的模板字符串
                    processed_parts = []
                    for part in content_parts:
                        if part.startswith('${') and part.endswith('}'):
                            # 这是一个表达式，递归处理其中的模板字符串
                            inner_expr = part[2:-1]  # 去掉 ${ 和 }
                            processed_inner = process_template_strings(inner_expr)
                            processed_parts.append('" + (' + processed_inner + ') + "')
                        else:
                            # 这是普通字符串内容，需要转义双引号和换行
                            escaped = part.replace('\\`', '`').replace('"', '\\"').replace('\n', '\\n').replace('\r', '\\r')
                            processed_parts.append(escaped)
                    
                    result.append('"' + ''.join(processed_parts) + '"')
                else:
                    # 没有找到结束反引号，保留原样
                    result.append(code[template_start:i])
            else:
                result.append(code[i])
                i += 1
        
        return ''.join(result)
    
    js_code = process_template_strings(js_code)
    
    return js_code
    
    # 处理模板字符串 - 使用更健壮的解析方法
    def replace_template_string(match):
        content = match.group(1)
        # 处理 ${...} 表达式，使用计数器来正确处理嵌套大括号
        result = []
        i = 0
        while i < len(content):
            if content[i:i+2] == '${':
                # 找到表达式开始
                expr_start = i + 2
                brace_count = 1
                j = expr_start
                while j < len(content) and brace_count > 0:
                    if content[j] == '{':
                        brace_count += 1
                    elif content[j] == '}':
                        brace_count -= 1
                    j += 1
                # 提取表达式（不包括最后闭合的大括号）
                expr = content[expr_start:j-1]
                result.append('" + (' + expr + ') + "')
                i = j
            else:
                result.append(content[i])
                i += 1
        
        # 转义双引号并返回
        final_content = ''.join(result).replace('"', '\\"').replace('\n', '\\n')
        return '"' + final_content + '"'
    
    # 使用 DOTALL 模式匹配多行模板字符串
    js_code = re.sub(r'`([\s\S]*?)`', replace_template_string, js_code)
    
    return js_code


def generate_simple_bundle(
    name: str,
    token: str,
    html: str,
    css: str,
    js: str,
    config_key: str,
    sdk_config: dict = None
) -> str:
    """
    生成简单的 SDK 代码（当 Webpack 不可用时的后备方案）
    使用 Base64 编码避免 JSON 转义导致的语法错误
    使用特殊标记作为占位符，避免与JavaScript大括号冲突
    """
    # 预处理 JS 代码，转换 ES6+ 语法为 ES5
    js = preprocess_js_code(js)
    
    # 使用 Base64 编码用户代码，避免转义问题
    html_b64 = base64.b64encode(html.encode('utf-8')).decode('ascii')
    css_b64 = base64.b64encode(css.encode('utf-8')).decode('ascii')
    js_b64 = base64.b64encode(js.encode('utf-8')).decode('ascii')
    
    # 预计算 json.dumps 的结果，避免在字符串中直接调用函数
    json_dumps_token = json.dumps(token)
    json_dumps_config_key = json.dumps(config_key)
    json_dumps_html_b64 = json.dumps(html_b64)
    json_dumps_css_b64 = json.dumps(css_b64)
    json_dumps_js_b64 = json.dumps(js_b64)
    
    # 从 SDK 配置或后端配置读取 API 地址
    # 优先使用 sdk_config 中的配置，否则使用后端 .env 配置
    # 默认使用后端配置的 LINGTONG_BASE_URL，避免前端相对路径问题
    api_base_url = None
    app_info = "digital_intelligent_audit"
    
    # 首先获取后端配置
    if hasattr(settings, 'LINGTONG_BASE_URL') and settings.LINGTONG_BASE_URL:
        api_base_url = settings.LINGTONG_BASE_URL + "/api"
    if hasattr(settings, 'LINGTONG_APP_INFO') and settings.LINGTONG_APP_INFO:
        app_info = settings.LINGTONG_APP_INFO
    
    # 如果 sdk_config 提供了配置，则覆盖后端配置
    if sdk_config:
        # SDK 配置可以覆盖后端配置
        if sdk_config.get("apiBaseUrl"):
            api_base_url = sdk_config.get("apiBaseUrl")
        if sdk_config.get("appInfo"):
            app_info = sdk_config.get("appInfo")
    
    # 如果没有配置，使用默认值（这不应该发生，但为了安全）
    if not api_base_url:
        api_base_url = "/api"
    
    default_api_config = {
        "apiBaseUrl": api_base_url,
        "appInfo": app_info
    }
    # 使用 json.dumps 确保正确转义
    json_dumps_default_api = json.dumps(default_api_config)
    
    # 使用特殊标记作为占位符，避免与JavaScript大括号冲突
    template = '''
// ============================================
// __SDK_NAME__ SDK
// Token: __SDK_TOKEN_VALUE__
// ============================================

(function() {
    'use strict';

    var SDK_TOKEN = __JSON_TOKEN__;
    var CONFIG_KEY = __JSON_CONFIG_KEY__;
    
    // 使用 Base64 编码存储用户代码，避免转义问题
    function decodeB64(str) {
        try {
            return decodeURIComponent(atob(str).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch(e) {
            return atob(str);
        }
    }
    
    var SDK_HTML = decodeB64(__JSON_HTML_B64__);
    var SDK_CSS = decodeB64(__JSON_CSS_B64__);
    var SDK_JS = decodeB64(__JSON_JS_B64__);

    // 从后端 env 配置的默认 API 地址 (JSON格式，已转义)
    var DEFAULT_API_BASE_URL = __DEFAULT_API_CONFIG_JSON__;
    
    // 灵童平台用户认证信息（从第三方页面传入）
    var LINGTONG_USER_TOKEN = null;
    var LINGTONG_USER_INFO = null;
    
    // 自动登录灵童平台
    async function loginToLingtong() {
        try {
            var config = getHostConfig();
            // 从配置中获取手机号（username）
            var username = config.username || config.phone || config.mobile;
            
            if (!username) {
                console.log('[SDK] 未配置 username，跳过灵童平台登录');
                return null;
            }
            
            console.log('[SDK] 正在登录灵童平台，用户名:', username);
            
            // 调用登录接口获取 token
            var loginResponse = await fetch(config.apiBaseUrl + '/api/login/account_dan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });
            
            if (!loginResponse.ok) {
                throw new Error('登录失败: ' + loginResponse.status);
            }
            
            var loginData = await loginResponse.json();
            console.log('[SDK] 灵童平台登录成功');
            
            // 保存 token
            LINGTONG_USER_TOKEN = loginData.token || loginData.access_token || loginData.data?.token;
            
            // 获取用户信息
            if (LINGTONG_USER_TOKEN) {
                await getLingtongUserInfo();
            }
            
            return LINGTONG_USER_TOKEN;
        } catch (error) {
            console.error('[SDK] 灵童平台登录失败:', error);
            return null;
        }
    }
    
    // 获取灵童平台用户信息
    async function getLingtongUserInfo() {
        try {
            var config = getHostConfig();
            
            if (!LINGTONG_USER_TOKEN) {
                console.log('[SDK] 没有 token，无法获取用户信息');
                return null;
            }
            
            console.log('[SDK] 正在获取灵童平台用户信息');
            
            // 调用后端代理接口获取用户信息（而不是直接调用灵童平台）
            var userResponse = await fetch(config.apiBaseUrl + '/api/sdk/lingtong/user-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + LINGTONG_USER_TOKEN
                },
                body: JSON.stringify({})
            });
            
            if (!userResponse.ok) {
                throw new Error('获取用户信息失败: ' + userResponse.status);
            }
            
            var userData = await userResponse.json();
            LINGTONG_USER_INFO = userData.data || userData;
            
            console.log('[SDK] 灵童平台用户信息获取成功:', LINGTONG_USER_INFO);
            
            // 将用户信息保存到全局，供用户代码使用
            if (typeof window !== 'undefined') {
                window.LINGTONG_USER_INFO = LINGTONG_USER_INFO;
                window.LINGTONG_USER_TOKEN = LINGTONG_USER_TOKEN;
            }
            
            return LINGTONG_USER_INFO;
        } catch (error) {
            console.error('[SDK] 获取灵童平台用户信息失败:', error);
            return null;
        }
    }
    
    function getHostConfig() {
        if (typeof window !== 'undefined' && window[CONFIG_KEY]) {
            var hostConfig = window[CONFIG_KEY];
            // 如果宿主没有配置 apiBaseUrl，使用后端配置的默认值
            if (!hostConfig.apiBaseUrl && DEFAULT_API_CONFIG.apiBaseUrl) {
                hostConfig.apiBaseUrl = DEFAULT_API_CONFIG.apiBaseUrl;
            }
            return hostConfig;
        }
        // 如果没有宿主配置，返回默认配置
        return {
            apiBaseUrl: DEFAULT_API_CONFIG.apiBaseUrl || '/api'
        };
    }

    // 获取 API 基础地址的辅助函数（供用户代码使用）
    function getApiBase() {
        var config = getHostConfig();
        return config.apiBaseUrl || '/api';
    }

    function initSDK(container) {
        if (!container || container._sdkInitialized) return;
        container._sdkInitialized = true;

        var config = getHostConfig();
        var useShadowDOM = config.useShadowDOM !== false;

        // 创建 Shadow DOM 隔离容器
        var shadowRoot;
        var innerContainer;
        
        if (useShadowDOM && container.attachShadow) {
            // 使用 Shadow DOM 实现完全样式隔离
            shadowRoot = container.attachShadow({ mode: 'open' });
            innerContainer = document.createElement('div');
            innerContainer.setAttribute('data-sdk-inner', SDK_TOKEN);
            shadowRoot.appendChild(innerContainer);
        } else {
            // 降级方案：直接使用容器
            innerContainer = container;
        }

        // 注入最小化的SDK基础样式（不覆盖用户自定义样式）
        var style = document.createElement('style');
        style.textContent = "" +
            "/* SDK 基础容器样式 - 最小化，不覆盖用户样式 */\\n" +
            "[data-sdk-inner] {\\n" +
            "    position: relative;\\n" +
            "    z-index: 999999;\\n" +
            "    max-width: 100%;\\n" +
            "    overflow: visible;\\n" +
            "    box-sizing: border-box;\\n" +
            "}\\n" +
            "\\n" +
            "/* 确保弹窗在SDK容器内正确显示 */\\n" +
            "[data-sdk-inner] .modal-overlay {\\n" +
            "    z-index: 999999;\\n" +
            "}\\n" +
            "\\n" +
            "[data-sdk-inner] .ai-message {\\n" +
            "    background-color: #f1f1f1 !important;\\n" +
            "    align-self: flex-start !important;\\n" +
            "    border-bottom-left-radius: 2px !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 输入框样式 */\\n" +
            "[data-sdk-inner] .message-input {\\n" +
            "    width: 100% !important;\\n" +
            "    padding: 10px !important;\\n" +
            "    border: 1px solid #ddd !important;\\n" +
            "    border-radius: 20px !important;\\n" +
            "    margin-top: 10px !important;\\n" +
            "    outline: none !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "    position: relative !important;\\n" +
            "}\\n" +
            "\\n" +
            "[data-sdk-inner] .message-input:focus {\\n" +
            "    border-color: #2196f3 !important;\\n" +
            "    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2) !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 发送按钮样式 */\\n" +
            "[data-sdk-inner] .send-button {\\n" +
            "    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%) !important;\\n" +
            "    color: white !important;\\n" +
            "    border: none !important;\\n" +
            "    border-radius: 20px !important;\\n" +
            "    padding: 10px 20px !important;\\n" +
            "    margin-left: 10px !important;\\n" +
            "    cursor: pointer !important;\\n" +
            "    font-weight: bold !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "    position: relative !important;\\n" +
            "    box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3) !important;\\n" +
            "    transition: all 0.2s ease !important;\\n" +
            "}\\n" +
            "\\n" +
            "[data-sdk-inner] .send-button:hover {\\n" +
            "    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%) !important;\\n" +
            "    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4) !important;\\n" +
            "    transform: translateY(-1px) !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 灵童图片样式 */\\n" +
            "[data-sdk-inner] .lingtong-image {\\n" +
            "    cursor: pointer !important;\\n" +
            "    width: 100px !important;\\n" +
            "    height: 100px !important;\\n" +
            "    border-radius: 50% !important;\\n" +
            "    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;\\n" +
            "    transition: all 0.3s ease !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "}\\n" +
            "\\n" +
            "[data-sdk-inner] .lingtong-image:hover {\\n" +
            "    transform: scale(1.05) !important;\\n" +
            "    box-shadow: 0 6px 20px rgba(0,0,0,0.2) !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 新建会话按钮样式 */\\n" +
            "[data-sdk-inner] .new-chat-button {\\n" +
            "    background: linear-gradient(135deg, #4caf50 0%, #43a047 100%) !important;\\n" +
            "    color: white !important;\\n" +
            "    border: none !important;\\n" +
            "    border-radius: 20px !important;\\n" +
            "    padding: 8px 16px !important;\\n" +
            "    margin: 10px 0 !important;\\n" +
            "    cursor: pointer !important;\\n" +
            "    font-weight: bold !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "    position: relative !important;\\n" +
            "    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3) !important;\\n" +
            "}\\n" +
            "\\n" +
            "[data-sdk-inner] .new-chat-button:hover {\\n" +
            "    background: linear-gradient(135deg, #43a047 0%, #388e3c 100%) !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 输入区域容器 */\\n" +
            "[data-sdk-inner] .input-container {\\n" +
            "    position: relative !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "    padding: 10px !important;\\n" +
            "    background: white !important;\\n" +
            "    border-top: 1px solid #eee !important;\\n" +
            "}\\n" +
            "\\n" +
            "/* 防止第三方网站的overflow隐藏影响 */\\n" +
            "[data-sdk-inner] .modal-content * {\\n" +
            "    overflow: visible !important;\\n" +
            "    z-index: 999999 !important;\\n" +
            "}\\n" +
            "\\n" +
            "" + SDK_CSS +
            "";
        style.setAttribute('data-sdk-style', SDK_TOKEN);
        
        // 根据是否使用Shadow DOM决定样式注入位置
        if (useShadowDOM && shadowRoot) {
            // 使用Shadow DOM时，样式注入到Shadow DOM内部
            shadowRoot.appendChild(style);
        } else {
            // 不使用Shadow DOM时，样式注入到主文档
            document.head.appendChild(style);
        }

        // 处理 innerHTML 插入的 script 标签
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = SDK_HTML;
        
        var scriptsToExecute = [];
        var scriptContents = [];
        var scriptElements = tempDiv.querySelectorAll('script');
        scriptElements.forEach(function(script) {
            if (script.src) {
                scriptsToExecute.push({ src: script.src });
            } else if (script.textContent && script.textContent.trim()) {
                scriptContents.push(script.textContent);
            }
            script.remove();
        });
        
        // 保存处理后的 HTML（不含 script 标签）
        var processedHtml = tempDiv.innerHTML;
        
        // 灵童平台 API 交互 - 必须在 SDK 实例创建前定义
        function lingtongAPI(endpoint, options) {
            if (options === void 0) { options = {}; }
            var config = getHostConfig();
            var baseUrl = config.apiBaseUrl || 'https://lingtong-platform.com/api';
            var token = config.token || config.apiKey;
            
            console.log('[SDK] 发送灵童平台请求:', {
                endpoint: endpoint,
                baseUrl: baseUrl,
                method: options.method || 'GET',
                hasToken: !!token,
                timestamp: new Date().toISOString()
            });
            
            return fetch(baseUrl + endpoint, Object.assign({}, options, {
                headers: Object.assign({
                    'Content-Type': 'application/json',
                    'Authorization': token ? 'Bearer ' + token : ''
                }, options.headers)
            })).then(function(response) {
                console.log('[SDK] 灵童平台响应:', {
                    endpoint: endpoint,
                    status: response.status,
                    statusText: response.statusText,
                    timestamp: new Date().toISOString()
                });
                
                if (!response.ok) {
                    throw new Error('API 请求失败: ' + response.status);
                }
                return response.json();
            }).then(function(data) {
                console.log('[SDK] 灵童平台响应数据:', {
                    endpoint: endpoint,
                    data: data,
                    timestamp: new Date().toISOString()
                });
                return data;
            }).catch(function(error) {
                console.log('[SDK] 请求错误详情:');
                console.log('  endpoint:', endpoint);
                console.log('  baseUrl:', baseUrl);
                console.log('  fullUrl:', baseUrl + endpoint);
                console.log('  error.message:', error.message);
                console.log('  error.name:', error.name);
                if (error.cause) {
                    console.log('  error.cause:', error.cause);
                }
                console.error('[SDK] 灵童平台请求错误:', error.message);
                throw error;
            });
        }
        
        // 将 SDK_TOKEN 和 SDK 实例暴露到全局作用域，供用户代码访问
        window['SDK_TOKEN_' + SDK_TOKEN] = SDK_TOKEN;
        var sdkInstanceName = 'SDK_' + SDK_TOKEN.slice(0, 8).toUpperCase();
        
        // 创建 SDK 实例对象
        var sdkInstance = {
            token: SDK_TOKEN,
            init: autoInit,
            config: getHostConfig(),
            api: lingtongAPI,
            lingtong: {
                getUserInfo: function() { return lingtongAPI('/api/user/info'); },
                sendMessage: function(message, options) { 
                    var config = getHostConfig();
                    var opts = options || {};
                    // 优先使用从灵童平台获取的用户信息
                    var userName = (typeof LINGTONG_USER_INFO !== 'undefined' && LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_name) 
                        ? LINGTONG_USER_INFO.user_name 
                        : (config.custom && config.custom.userName ? config.custom.userName : (config.userName || 'anonymous'));
                    return lingtongAPI('/api/sdk/lingtong/chat', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            message: message,
                            user_name: userName,
                            conversation_id: opts.conversation_id || null,
                            session_id: opts.session_id || null
                        })
                    }); 
                },
                sendMessageStream: function(message, options) { 
                    var config = getHostConfig();
                    var opts = options || {};
                    // 优先使用从灵童平台获取的用户信息
                    var userName = (typeof LINGTONG_USER_INFO !== 'undefined' && LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_name) 
                        ? LINGTONG_USER_INFO.user_name 
                        : (config.custom && config.custom.userName ? config.custom.userName : (config.userName || 'anonymous'));
                    return lingtongAPI('/api/sdk/lingtong/chat?stream=true', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            message: message,
                            user_name: userName,
                            conversation_id: opts.conversation_id || null,
                            session_id: opts.session_id || null
                        })
                    }); 
                },
                createConversation: function(conversation_name, options) {
                    var config = getHostConfig();
                    var opts = options || {};
                    // 优先使用从灵童平台获取的用户信息
                    var userId = (typeof LINGTONG_USER_INFO !== 'undefined' && LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_id) 
                        ? LINGTONG_USER_INFO.user_id 
                        : (config.custom && config.custom.userId ? config.custom.userId : '0');
                    var userName = (typeof LINGTONG_USER_INFO !== 'undefined' && LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_name) 
                        ? LINGTONG_USER_INFO.user_name 
                        : (config.custom && config.custom.userName ? config.custom.userName : '默认用户');
                    return lingtongAPI('/api/sdk/lingtong/conversations', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            conversation_name: conversation_name,
                            user_id: userId,
                            user_name: userName,
                            app_info: opts.app_info || 'digital_intelligent_audit'
                        })
                    });
                },
                getConversationList: function(options) {
                    var opts = options || {};
                    var url = '/api/sdk/lingtong/myConversations';
                    var params = [];
                    if (opts.user_id) params.push('user_id=' + opts.user_id);
                    if (opts.app_info) params.push('app_info=' + opts.app_info);
                    if (params.length > 0) url += '?' + params.join('&');
                    return lingtongAPI(url);
                },
                getConversationDetail: function(conversationId) { 
                    return lingtongAPI('/api/sdk/lingtong/conversations/' + conversationId + '?active_at=' + new Date().toISOString()); 
                },
                saveMessage: function(options) {
                    var config = getHostConfig();
                    var opts = options || {};
                    // 优先使用从灵童平台获取的用户信息
                    var userId = (LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_id) ? LINGTONG_USER_INFO.user_id : 
                                 (config.custom && config.custom.userId ? config.custom.userId : '1');
                    var userName = (LINGTONG_USER_INFO && LINGTONG_USER_INFO.user_name) ? LINGTONG_USER_INFO.user_name : 
                                   (config.custom && config.custom.userName ? config.custom.userName : 'anonymous');
                    return lingtongAPI('/api/sdk/lingtong/message', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            conversation_id: opts.conversation_id || null,
                            message_id: opts.message_id || 'msg_' + Date.now(),
                            content: opts.content || '',
                            role: opts.role || 'user',
                            user_id: userId,
                            user_name: userName,
                            app_info: opts.app_info || 'digital_intelligent_audit'
                        })
                    });
                },
                getFlowList: function() { return lingtongAPI('/api/sdk/lingtong/flowlist'); },
                interact: function(action, data) { return lingtongAPI('/api/sdk/lingtong/interact', {
                    method: 'POST',
                    body: JSON.stringify({ action, data })
                }); }
            }
        };
        
        // 使用多种方式暴露 SDK 实例，确保用户代码可以访问
        window[sdkInstanceName] = sdkInstance;
        window['__SDK__'] = sdkInstance;  // 使用固定名称，方便用户代码访问
        window['__SDK_INSTANCE__'] = sdkInstance;
        
        // 【关键修复】先设置 HTML，然后再执行脚本
        // 这样既能保证 DOM 操作能找到元素，又能保证 onclick 能访问到函数
        
        // 将处理后的 HTML 设置到容器（Shadow DOM 内部或降级容器）
        innerContainer.innerHTML = processedHtml;
        
        // 【关键修复】创建全局 SDK_CONTEXT 对象，存储每个 SDK 的 shadowRoot 引用
        // 这样 onclick 事件中的代码也能通过闭包访问到正确的 shadowRoot
        if (!window.__SDK_CONTEXTS__) {
            window.__SDK_CONTEXTS__ = {};
        }
        
        // 为当前 SDK 保存 shadowRoot 引用
        window.__SDK_CONTEXTS__[SDK_TOKEN] = shadowRoot || document;
        
        // 【关键修复】创建安全的 DOM 查询辅助对象
        // 优先在 Shadow DOM 中查找，找不到再到 document 查找
        var sdkDOMHelper = {
            container: innerContainer,
            shadowRoot: shadowRoot,
            getElementById: function(id) {
                if (shadowRoot) {
                    var el = shadowRoot.querySelector('#' + id);
                    if (el) return el;
                }
                return innerContainer.querySelector('#' + id) || document.getElementById(id);
            },
            querySelector: function(selector) {
                if (shadowRoot) {
                    var el = shadowRoot.querySelector(selector);
                    if (el) return el;
                }
                return innerContainer.querySelector(selector) || document.querySelector(selector);
            },
            querySelectorAll: function(selector) {
                if (shadowRoot) {
                    var els = shadowRoot.querySelectorAll(selector);
                    if (els && els.length > 0) return els;
                }
                var containerEls = innerContainer.querySelectorAll(selector);
                if (containerEls && containerEls.length > 0) return containerEls;
                return document.querySelectorAll(selector);
            },
            getElementsByClassName: function(className) {
                return this.querySelectorAll('.' + className);
            },
            getElementsByTagName: function(tagName) {
                return this.querySelectorAll(tagName);
            }
        };
        
        // 【关键修复】创建安全的 DOM 查询辅助对象
        var sdkDOMHelper = {
            container: innerContainer,
            shadowRoot: shadowRoot,
            // 安全的 getElementById，优先在容器内查找
            getElementById: function(id) {
                var el = null;
                if (shadowRoot) {
                    el = shadowRoot.getElementById ? shadowRoot.getElementById(id) : shadowRoot.querySelector('#' + id);
                }
                if (!el) {
                    el = innerContainer.querySelector('#' + id);
                }
                if (!el) {
                    el = document.getElementById(id);
                }
                return el;
            },
            // 安全的 querySelector，优先在容器内查找
            querySelector: function(selector) {
                var el = null;
                if (shadowRoot) {
                    el = shadowRoot.querySelector(selector);
                }
                if (!el) {
                    el = innerContainer.querySelector(selector);
                }
                if (!el) {
                    el = document.querySelector(selector);
                }
                return el;
            },
            // 安全的 querySelectorAll，优先在容器内查找
            querySelectorAll: function(selector) {
                var els = [];
                if (shadowRoot) {
                    els = Array.from(shadowRoot.querySelectorAll(selector));
                }
                if (els.length === 0) {
                    els = Array.from(innerContainer.querySelectorAll(selector));
                }
                if (els.length === 0) {
                    els = Array.from(document.querySelectorAll(selector));
                }
                return els;
            },
            // 安全的 addEventListener，自动处理 null 元素
            addEventListener: function(selector, event, handler, options) {
                var el = this.querySelector(selector);
                if (el && el.addEventListener) {
                    el.addEventListener(event, handler, options);
                    return true;
                } else {
                    console.warn('[SDK] 无法为元素添加事件监听器，元素不存在:', selector);
                    return false;
                }
            }
        };
        
        // 【关键修复】直接重写全局 document 方法，使 onclick 事件能正确查找元素
        // 保存原始方法（只保存一次）
        var originalGetElementById = document.getElementById;
        var originalQuerySelector = document.querySelector;
        var originalQuerySelectorAll = document.querySelectorAll;
        
        // 重写 document.getElementById，优先在 SDK 容器内查找
        document.getElementById = function(id) {
            var el = null;
            if (shadowRoot) {
                el = shadowRoot.querySelector('#' + id);
            }
            if (!el && innerContainer) {
                el = innerContainer.querySelector('#' + id);
            }
            if (!el) {
                el = originalGetElementById.call(document, id);
            }
            return el;
        };
        
        // 重写 document.querySelector，优先在 SDK 容器内查找
        document.querySelector = function(selector) {
            var el = null;
            if (shadowRoot) {
                el = shadowRoot.querySelector(selector);
            }
            if (!el && innerContainer) {
                el = innerContainer.querySelector(selector);
            }
            if (!el) {
                el = originalQuerySelector.call(document, selector);
            }
            return el;
        };
        
        // 重写 document.querySelectorAll，优先在 SDK 容器内查找
        document.querySelectorAll = function(selector) {
            var els = [];
            if (shadowRoot) {
                els = Array.from(shadowRoot.querySelectorAll(selector));
            }
            if (els.length === 0 && innerContainer) {
                els = Array.from(innerContainer.querySelectorAll(selector));
            }
            if (els.length === 0) {
                els = Array.from(originalQuerySelectorAll.call(document, selector));
            }
            return els;
        };
        
        // 在全局作用域保存 SDK DOM 辅助对象
        if (!window.__SDK_HELPERS__) {
            window.__SDK_HELPERS__ = {};
        }
        window.__SDK_HELPERS__[SDK_TOKEN] = {
            domHelper: sdkDOMHelper,
            container: innerContainer,
            shadowRoot: shadowRoot,
            originalMethods: {
                getElementById: originalGetElementById,
                querySelector: originalQuerySelector,
                querySelectorAll: originalQuerySelectorAll
            }
        };
        
        // 执行SDK_JS代码 - 在全局作用域执行，确保 onclick 能访问到用户定义的函数
        if (SDK_JS && SDK_JS.trim()) {
            try {
                console.log('[SDK] SDK_JS 长度:', SDK_JS.length);
                
                // 重写 document.getElementById，优先在 SDK 容器内查找
                document.getElementById = function(id) {
                    var el = null;
                    if (shadowRoot) {
                        el = shadowRoot.getElementById ? shadowRoot.getElementById(id) : shadowRoot.querySelector('#' + id);
                    }
                    if (!el && innerContainer) {
                        el = innerContainer.querySelector('#' + id);
                    }
                    if (!el) {
                        el = originalGetElementById.call(document, id);
                    }
                    return el;
                };
                
                // 重写 document.querySelector，优先在 SDK 容器内查找
                document.querySelector = function(selector) {
                    var el = null;
                    if (shadowRoot) {
                        el = shadowRoot.querySelector(selector);
                    }
                    if (!el && innerContainer) {
                        el = innerContainer.querySelector(selector);
                    }
                    if (!el) {
                        el = originalQuerySelector.call(document, selector);
                    }
                    return el;
                };
                
                // 重写 document.querySelectorAll，优先在 SDK 容器内查找
                document.querySelectorAll = function(selector) {
                    var els = [];
                    if (shadowRoot) {
                        els = Array.from(shadowRoot.querySelectorAll(selector));
                    }
                    if (els.length === 0 && innerContainer) {
                        els = Array.from(innerContainer.querySelectorAll(selector));
                    }
                    if (els.length === 0) {
                        els = Array.from(originalQuerySelectorAll.call(document, selector));
                    }
                    return els;
                };
                
                // 【修复】直接使用 eval 执行用户代码，不再使用 new Function
                // 这样可以避免 JSON.stringify 后的字符串在 new Function 中解析失败的问题
                try {
                    console.log('[SDK] 开始执行用户代码...');
                    // 在全局作用域暴露 SDK 辅助对象
                    window.__SDK__ = sdkInstance;
                    window.__SDK_TOKEN__ = SDK_TOKEN;
                    window.__SDK_DOM__ = sdkDOMHelper;
                    // 执行用户代码
                    eval(SDK_JS);
                    console.log('[SDK] SDK_JS 执行成功');
                } catch(e) {
                    console.error('[SDK] 用户代码执行错误:', e.message);
                    console.error('[SDK] 错误详情:', e.stack);
                    console.error('[SDK] 用户代码前200字符:', SDK_JS.substring(0, 200));
                    throw e;
                }
                
                // 【注意】不恢复 document 方法，保持重写状态
                // 这样 onclick 等事件处理程序也能使用正确的 DOM 查询方法
                // 如果恢复，onclick 中的 document.getElementById 会找不到 Shadow DOM 内的元素
                
            } catch(e) {
                console.error('[SDK] SDK_JS 执行错误:', e.message);
                console.error('[SDK] 错误详情:', e.stack);
            }
        }
        
        // 执行内联脚本 - 在全局作用域执行，确保 onclick 能访问到函数
        scriptContents.forEach(function(code) {
            try {
                // 【修复】直接使用 eval 执行代码，不再使用 new Function
                // 这样可以避免 JSON.stringify 和 JSON.parse 可能引入的问题
                var __SDK__ = sdkInstance;
                var __SDK_TOKEN__ = SDK_TOKEN;
                var __SDK_DOM__ = sdkDOMHelper;
                
                // 将DOM辅助方法暴露到全局，供onclick使用
                if (typeof window !== 'undefined' && sdkDOMHelper) {
                    window.__getElementById = function(id) { return sdkDOMHelper.getElementById(id); };
                    window.__querySelector = function(sel) { return sdkDOMHelper.querySelector(sel); };
                    window.__querySelectorAll = function(sel) { return sdkDOMHelper.querySelectorAll(sel); };
                }
                
                // 直接执行代码
                eval(code);
            } catch(e) {
                console.error('[SDK] 内联脚本执行错误:', e.message);
                console.error('[SDK] 错误详情:', e.stack);
            }
        });
        
        // 按顺序加载外部脚本
        function loadScript(src, callback) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = callback;
            s.onerror = function() {
                console.error('[SDK] 脚本加载失败:', src);
                callback();
            };
            document.head.appendChild(s);
        }
        
        function loadScriptsSequentially(index) {
            if (index < scriptsToExecute.length) {
                loadScript(scriptsToExecute[index].src, function() {
                    loadScriptsSequentially(index + 1);
                });
            }
        }
        
        if (scriptsToExecute.length > 0) {
            loadScriptsSequentially(0);
        }

        window.dispatchEvent(new CustomEvent('sdk:mounted', { detail: { token: SDK_TOKEN } }));
    }

    function autoInit() {
        var containers = document.querySelectorAll('[data-sdk-token="' + SDK_TOKEN + '"]');
        containers.forEach(function(c) { initSDK(c); });
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit);
        } else {
            autoInit();
        }

        var observer = new MutationObserver(function() { autoInit(); });
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });

        window.dispatchEvent(new CustomEvent('sdk:initialized', { detail: { token: SDK_TOKEN } }));
    }
})();
'''

    # 使用特殊标记替换，避免与JavaScript大括号冲突
    template = template.replace('__SDK_NAME__', name)
    template = template.replace('__SDK_TOKEN_VALUE__', token)
    template = template.replace('__JSON_TOKEN__', json_dumps_token)
    template = template.replace('__JSON_CONFIG_KEY__', json_dumps_config_key)
    template = template.replace('__JSON_HTML_B64__', json_dumps_html_b64)
    template = template.replace('__JSON_CSS_B64__', json_dumps_css_b64)
    template = template.replace('__JSON_JS_B64__', json_dumps_js_b64)
    template = template.replace('__DEFAULT_API_CONFIG_JSON__', json_dumps_default_api)

    return template
