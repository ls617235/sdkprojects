/**
 * SDK 运行时核心 - 分层架构实现
 * 
 * 架构原则：
 * 1. SDK层：只包含核心业务逻辑和UI组件，不涉及任何外部交互
 * 2. 内嵌代码层：负责所有与外部系统的交互
 * 
 * 关键特性：
 * - 事件驱动通信机制
 * - 统一的数据服务层
 * - 完整的生命周期管理
 * - 安全的跨域通信
 * - Shadow DOM 样式隔离
 */

// ============== 类型定义 ==============

export interface SDKConfig {
  /** 静态资源基础URL */
  assetsBaseUrl?: string;
  /** API基础URL */
  apiBaseUrl?: string;
  /** API Key */
  apiKey?: string;
  /** 认证Token */
  token?: string;
  /** 自定义配置 */
  custom?: Record<string, any>;
  /** 允许的消息来源域名列表（跨域安全） */
  allowedOrigins?: string[];
  /** 是否启用Shadow DOM隔离 */
  useShadowDOM?: boolean;
  /** 调试模式 */
  debug?: boolean;
}

export interface SDKEvent {
  type: string;
  payload?: any;
  timestamp: number;
  source: 'sdk' | 'host';
}

export interface SDKLifecycleHooks {
  onInit?: (config: SDKConfig) => void | Promise<void>;
  onMount?: (container: HTMLElement) => void | Promise<void>;
  onUpdate?: (newConfig: Partial<SDKConfig>) => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface DataServiceAPI {
  /** GET请求 */
  get: <T = any>(path: string, params?: Record<string, any>) => Promise<T>;
  /** POST请求 */
  post: <T = any>(path: string, data?: any) => Promise<T>;
  /** PUT请求 */
  put: <T = any>(path: string, data?: any) => Promise<T>;
  /** DELETE请求 */
  delete: <T = any>(path: string) => Promise<T>;
  /** 上传文件 */
  upload: <T = any>(path: string, file: File, options?: {
    fields?: Record<string, any>;
    headers?: Record<string, string>;
  }) => Promise<T>;
  /** 通用请求 */
  request: <T = any>(path: string, options: RequestInit) => Promise<T>;
}

export interface SDKAPI {
  /** 配置对象 */
  config: SDKConfig;
  /** 事件系统 */
  events: {
    emit: (type: string, payload?: any) => void;
    on: (type: string, handler: (event: SDKEvent) => void) => () => void;
    off: (type: string, handler?: (event: SDKEvent) => void) => void;
  };
  /** 数据服务 */
  data: DataServiceAPI;
  /** 资源URL */
  asset: (path: string) => string;
  /** API URL */
  apiUrl: (path: string) => string;
  /** 获取配置 */
  get: (key: string, defaultValue?: any) => any;
  /** 更新配置 */
  setConfig: (newConfig: Partial<SDKConfig>) => void;
  /** 模板替换 */
  template: (str: string) => string;
  /** 生命周期钩子 */
  lifecycle: SDKLifecycleHooks;
  /** 跨域通信 */
  postMessage: (type: string, data?: any) => void;
  /** Shadow DOM 根节点 */
  shadowRoot?: ShadowRoot;
}

// ============== SDK 运行时生成器 ==============

/**
 * 生成完整的 SDK 运行时代码
 * 包含分层架构的所有组件
 */
export function generateSDKRuntime(options: {
  sdkToken: string;
  config: SDKConfig;
}): string {
  const { sdkToken, config } = options;
  const configKey = `SDK_CONFIG_${sdkToken.slice(0, 8).toUpperCase()}`;
  
  return `
(function() {
  'use strict';
  
  // ============== SDK 核心运行时 ==============
  
  const SDK_TOKEN = '${sdkToken}';
  const CONFIG_KEY = '${configKey}';
  
  // 从宿主获取配置
  const HOST_CONFIG = window[CONFIG_KEY] || {};
  
  // 合并默认配置
  const DEFAULT_CONFIG = {
    assetsBaseUrl: '',
    apiBaseUrl: '',
    apiKey: '',
    token: '',
    custom: {},
    allowedOrigins: ['*'],
    useShadowDOM: true,
    debug: false,
  };
  
  // ============== 1. 事件系统 ==============
  // SDK 与内嵌代码层的通信桥梁
  
  class SDKEventEmitter {
    constructor() {
      this._handlers = new Map();
      this._history = [];
    }
    
    emit(type, payload) {
      const event = {
        type,
        payload,
        timestamp: Date.now(),
        source: 'sdk'
      };
      
      this._history.push(event);
      if (this._history.length > 100) this._history.shift();
      
      // 触发内部监听器
      const handlers = this._handlers.get(type) || [];
      handlers.forEach(h => {
        try { h(event); } catch (e) { console.error('[SDK] Event handler error:', e); }
      });
      
      // 触发外部自定义事件（供内嵌代码监听）
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sdk:' + type, { detail: event }));
      }
      
      if (HOST_CONFIG.debug) {
        console.log('[SDK] Event emitted:', type, payload);
      }
    }
    
    on(type, handler) {
      if (!this._handlers.has(type)) {
        this._handlers.set(type, []);
      }
      this._handlers.get(type).push(handler);
      
      // 返回取消订阅函数
      return () => this.off(type, handler);
    }
    
    off(type, handler) {
      if (!handler) {
        this._handlers.delete(type);
        return;
      }
      const handlers = this._handlers.get(type) || [];
      const idx = handlers.indexOf(handler);
      if (idx > -1) handlers.splice(idx, 1);
    }
    
    getHistory(type) {
      return this._history.filter(e => !type || e.type === type);
    }
  }
  
  // ============== 2. 数据服务层 ==============
  // 统一管理所有后端交互
  
  class SDKDataService {
    constructor(config, events) {
      this._config = config;
      this._events = events;
    }
    
    _getUrl(path) {
      const base = this._config.apiBaseUrl || '';
      return base + (path.startsWith('/') ? path : '/' + path);
    }
    
    _getHeaders(customHeaders = {}) {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (this._config.apiKey) {
        headers['X-API-Key'] = this._config.apiKey;
      }
      
      if (this._config.token) {
        headers['Authorization'] = 'Bearer ' + this._config.token;
      }
      
      return { ...headers, ...customHeaders };
    }
    
    async _request(path, options = {}) {
      const url = this._getUrl(path);
      const startTime = Date.now();
      
      try {
        this._events.emit('request:start', { url, method: options.method || 'GET' });
        
        const response = await fetch(url, {
          ...options,
          headers: this._getHeaders(options.headers),
        });
        
        if (!response.ok) {
          const error = new Error('Request failed: ' + response.status);
          error.status = response.status;
          error.response = response;
          throw error;
        }
        
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        this._events.emit('request:success', { url, duration, status: response.status });
        
        return data;
      } catch (error) {
        this._events.emit('request:error', { url, error: error.message });
        throw error;
      }
    }
    
    get(path, params = {}) {
      const query = new URLSearchParams(params).toString();
      const url = query ? path + '?' + query : path;
      return this._request(url, { method: 'GET' });
    }
    
    post(path, data = {}) {
      return this._request(path, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
    
    put(path, data = {}) {
      return this._request(path, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    }
    
    delete(path) {
      return this._request(path, { method: 'DELETE' });
    }
    
    async upload(path, file, options = {}) {
      const url = this._getUrl(path);
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.fields) {
        Object.entries(options.fields).forEach(([k, v]) => formData.append(k, v));
      }
      
      const headers = {};
      if (this._config.apiKey) headers['X-API-Key'] = this._config.apiKey;
      if (this._config.token) headers['Authorization'] = 'Bearer ' + this._config.token;
      
      this._events.emit('upload:start', { url, fileName: file.name, fileSize: file.size });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...headers, ...options.headers },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed: ' + response.status);
      
      const result = await response.json();
      this._events.emit('upload:success', { url, fileName: file.name });
      
      return result;
    }
    
    request(path, options) {
      return this._request(path, options);
    }
  }
  
  // ============== 3. 跨域通信管理 ==============
  // 安全的跨域消息传递
  
  class SDKCrossOriginMessenger {
    constructor(config, events, allowedOrigins) {
      this._config = config;
      this._events = events;
      this._allowedOrigins = allowedOrigins || ['*'];
      this._messageHandlers = new Map();
      
      this._setupListener();
    }
    
    _isOriginAllowed(origin) {
      if (this._allowedOrigins.includes('*')) return true;
      try {
        const originHost = new URL(origin).host;
        return this._allowedOrigins.some(allowed => {
          if (allowed === '*') return true;
          try {
            return new URL(allowed).host === originHost;
          } catch { return false; }
        });
      } catch { return false; }
    }
    
    _setupListener() {
      window.addEventListener('message', (event) => {
        // 安全校验
        if (!this._isOriginAllowed(event.origin)) {
          if (HOST_CONFIG.debug) {
            console.warn('[SDK] Blocked message from unallowed origin:', event.origin);
          }
          return;
        }
        
        // 验证消息格式
        if (!event.data || typeof event.data !== 'object') return;
        if (event.data._sdkToken !== SDK_TOKEN) return;
        
        const { type, payload } = event.data;
        
        this._events.emit('message:received', { type, payload, origin: event.origin });
        
        // 调用注册的处理器
        const handlers = this._messageHandlers.get(type) || [];
        handlers.forEach(h => {
          try { h(payload, event.origin); } catch (e) { console.error('[SDK] Message handler error:', e); }
        });
      });
    }
    
    postMessage(type, data, targetOrigin = '*') {
      const message = {
        _sdkToken: SDK_TOKEN,
        type,
        payload: data,
        timestamp: Date.now()
      };
      
      if (window.parent !== window) {
        window.parent.postMessage(message, targetOrigin);
      }
      
      if (window.opener) {
        window.opener.postMessage(message, targetOrigin);
      }
      
      // 通过 iframe 通信
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          iframe.contentWindow?.postMessage(message, targetOrigin);
        } catch (e) {}
      });
      
      this._events.emit('message:sent', { type, targetOrigin });
    }
    
    onMessage(type, handler) {
      if (!this._messageHandlers.has(type)) {
        this._messageHandlers.set(type, []);
      }
      this._messageHandlers.get(type).push(handler);
      
      return () => {
        const handlers = this._messageHandlers.get(type) || [];
        const idx = handlers.indexOf(handler);
        if (idx > -1) handlers.splice(idx, 1);
      };
    }
  }
  
  // ============== 4. 生命周期管理 ==============
  
  class SDKLifecycle {
    constructor(events) {
      this._events = events;
      this._hooks = {
        onInit: null,
        onMount: null,
        onUpdate: null,
        onDestroy: null,
        onError: null
      };
      this._state = 'idle';
    }
    
    register(hooks) {
      Object.assign(this._hooks, hooks);
    }
    
    async init(config) {
      if (this._state !== 'idle') return;
      this._state = 'initializing';
      
      try {
        this._events.emit('lifecycle:init', { config });
        if (this._hooks.onInit) {
          await this._hooks.onInit(config);
        }
        this._state = 'initialized';
        this._events.emit('lifecycle:initialized');
      } catch (error) {
        this._state = 'error';
        this._events.emit('lifecycle:error', { phase: 'init', error: error.message });
        if (this._hooks.onError) this._hooks.onError(error);
        throw error;
      }
    }
    
    async mount(container) {
      if (this._state === 'destroyed') {
        throw new Error('SDK has been destroyed');
      }
      
      this._state = 'mounting';
      
      try {
        this._events.emit('lifecycle:mount', { container });
        if (this._hooks.onMount) {
          await this._hooks.onMount(container);
        }
        this._state = 'mounted';
        this._events.emit('lifecycle:mounted');
      } catch (error) {
        this._state = 'error';
        this._events.emit('lifecycle:error', { phase: 'mount', error: error.message });
        if (this._hooks.onError) this._hooks.onError(error);
        throw error;
      }
    }
    
    async update(newConfig) {
      this._events.emit('lifecycle:update', { newConfig });
      if (this._hooks.onUpdate) {
        await this._hooks.onUpdate(newConfig);
      }
      this._events.emit('lifecycle:updated');
    }
    
    async destroy() {
      if (this._state === 'destroyed') return;
      
      this._state = 'destroying';
      
      try {
        this._events.emit('lifecycle:destroy');
        if (this._hooks.onDestroy) {
          await this._hooks.onDestroy();
        }
        this._state = 'destroyed';
        this._events.emit('lifecycle:destroyed');
      } catch (error) {
        this._events.emit('lifecycle:error', { phase: 'destroy', error: error.message });
        if (this._hooks.onError) this._hooks.onError(error);
      }
    }
    
    get state() {
      return this._state;
    }
  }
  
  // ============== 5. Shadow DOM 管理 ==============
  
  function createShadowContainer(container, styles = '') {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-sdk-shadow', SDK_TOKEN);
    container.appendChild(wrapper);
    
    let shadowRoot;
    let mountPoint;
    
    if (HOST_CONFIG.useShadowDOM !== false && wrapper.attachShadow) {
      // 使用 Shadow DOM
      shadowRoot = wrapper.attachShadow({ mode: 'open' });
      
      // 注入样式到 Shadow DOM
      if (styles) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        shadowRoot.appendChild(styleEl);
      }
      
      // 创建挂载点
      mountPoint = document.createElement('div');
      mountPoint.setAttribute('data-sdk-mount', 'true');
      mountPoint.style.cssText = 'width: 100%; height: 100%;';
      shadowRoot.appendChild(mountPoint);
    } else {
      // 降级到普通 DOM
      mountPoint = wrapper;
      if (styles) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
      }
    }
    
    return { shadowRoot, mountPoint };
  }
  
  // ============== 6. SDK 主对象 ==============
  
  function createSDK() {
    // 合并配置
    const config = { ...DEFAULT_CONFIG, ...HOST_CONFIG };
    
    // 创建事件系统
    const eventEmitter = new SDKEventEmitter();
    
    // 创建数据服务
    const dataService = new SDKDataService(config, eventEmitter);
    
    // 创建跨域通信
    const messenger = new SDKCrossOriginMessenger(
      config,
      eventEmitter,
      config.allowedOrigins
    );
    
    // 创建生命周期管理
    const lifecycle = new SDKLifecycle(eventEmitter);
    
    // SDK API 对象
    const sdk = {
      config,
      
      events: {
        emit: (type, payload) => eventEmitter.emit(type, payload),
        on: (type, handler) => eventEmitter.on(type, handler),
        off: (type, handler) => eventEmitter.off(type, handler),
      },
      
      data: dataService,
      
      asset: (path) => {
        const base = config.assetsBaseUrl || '';
        return base + (path.startsWith('/') ? path : '/' + path);
      },
      
      apiUrl: (path) => {
        const base = config.apiBaseUrl || '';
        return base + (path.startsWith('/') ? path : '/' + path);
      },
      
      get: (key, defaultValue) => {
        if (key.includes('.')) {
          const parts = key.split('.');
          let value = config;
          for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
          }
          return value ?? defaultValue;
        }
        return config[key] ?? config.custom?.[key] ?? defaultValue;
      },
      
      setConfig: (newConfig) => {
        if (newConfig.custom) {
          config.custom = { ...config.custom, ...newConfig.custom };
          delete newConfig.custom;
        }
        Object.assign(config, newConfig);
        lifecycle.update(newConfig);
      },
      
      template: (str) => {
        return str
          .replace(/\\{\\{assets_base_url\\}\\}/g, config.assetsBaseUrl || '')
          .replace(/\\{\\{api_base_url\\}\\}/g, config.apiBaseUrl || '')
          .replace(/\\{\\{api_key\\}\\}/g, config.apiKey || '')
          .replace(/\\{\\{token\\}\\}/g, config.token || '')
          .replace(/\\{\\{custom\\.([^}]+)\\}\\}/g, (_, key) => config.custom?.[key] || '');
      },
      
      lifecycle: lifecycle,
      
      postMessage: (type, data) => messenger.postMessage(type, data),
      
      onMessage: (type, handler) => messenger.onMessage(type, handler),
      
      shadowRoot: null,
      
      // 向后兼容的 API
      api: (path, options) => dataService.request(path, options),
      get: dataService.get,
      post: dataService.post,
      upload: dataService.upload,
    };
    
    return sdk;
  }
  
  // 创建全局 SDK 实例
  const __SDK__ = createSDK();
  
  // 导出 SDK
  window['__SDK__'] = __SDK__;
  window['SDK_' + SDK_TOKEN.slice(0, 8)] = __SDK__;
  
  // 向后兼容：保留旧版 API
  window.__SDK__ = __SDK__;
  
})();
`;
}

/**
 * 生成内嵌代码层的模板
 * 内嵌代码层负责所有与外部系统的交互
 */
export function generateEmbedLayer(options: {
  sdkToken: string;
  framework: 'react' | 'vue';
  componentName: string;
  styles?: string;
}): string {
  const { sdkToken, framework, componentName, styles = '' } = options;
  
  return `
// ============== 内嵌代码层 ==============
// 负责所有与外部系统的交互

(function() {
  'use strict';
  
  const SDK_TOKEN = '${sdkToken}';
  const __SDK__ = window['SDK_${sdkToken.slice(0, 8)}'];
  
  if (!__SDK__) {
    console.error('[SDK] SDK runtime not found');
    return;
  }
  
  // ===== 生命周期钩子注册 =====
  __SDK__.lifecycle.register({
    async onInit(config) {
      console.log('[SDK] Initializing with config:', config);
      
      // 触发自定义事件供宿主监听
      window.dispatchEvent(new CustomEvent('sdk:initialized', { 
        detail: { config, token: SDK_TOKEN } 
      }));
    },
    
    async onMount(container) {
      console.log('[SDK] Mounting to container');
      
      // 创建 Shadow DOM 或普通容器
      const useShadow = __SDK__.config.useShadowDOM !== false;
      let mountPoint;
      
      if (useShadow && container.attachShadow) {
        __SDK__.shadowRoot = container.attachShadow({ mode: 'open' });
        
        // 注入样式
        ${styles ? `
        const styleEl = document.createElement('style');
        styleEl.textContent = ${JSON.stringify(styles)};
        __SDK__.shadowRoot.appendChild(styleEl);` : ''}
        
        // 创建挂载点
        mountPoint = document.createElement('div');
        mountPoint.style.cssText = 'width: 100%; height: 100%;';
        __SDK__.shadowRoot.appendChild(mountPoint);
      } else {
        mountPoint = container;
      }
      
      // 挂载组件
      await renderComponent(mountPoint);
    },
    
    async onUpdate(newConfig) {
      console.log('[SDK] Config updated:', newConfig);
      
      // 通知组件重新渲染
      window.dispatchEvent(new CustomEvent('sdk:config-updated', { 
        detail: { config: __SDK__.config } 
      }));
    },
    
    async onDestroy() {
      console.log('[SDK] Destroying');
      
      // 清理 Shadow DOM
      if (__SDK__.shadowRoot) {
        __SDK__.shadowRoot.innerHTML = '';
      }
      
      window.dispatchEvent(new CustomEvent('sdk:destroyed', { 
        detail: { token: SDK_TOKEN } 
      }));
    },
    
    onError(error) {
      console.error('[SDK] Error:', error);
      
      window.dispatchEvent(new CustomEvent('sdk:error', { 
        detail: { error: error.message } 
      }));
    }
  });
  
  // ===== 组件渲染函数 =====
  async function renderComponent(container) {
    ${framework === 'vue' ? `
    // Vue 渲染
    if (typeof Vue !== 'undefined' && typeof ${componentName} !== 'undefined') {
      const app = Vue.createApp(${componentName});
      app.provide('sdk', __SDK__);
      app.config.globalProperties.$sdk = __SDK__;
      app.mount(container);
      __SDK__._vueApp = app;
    }
    ` : `
    // React 渲染
    if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
      if (typeof render === 'function') {
        render(container, __SDK__);
      } else if (typeof ${componentName} !== 'undefined') {
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(${componentName}, { sdk: __SDK__ }));
        __SDK__._reactRoot = root;
      }
    }
    `}
  }
  
  // ===== 初始化 SDK =====
  async function init() {
    await __SDK__.lifecycle.init(__SDK__.config);
    
    const containers = document.querySelectorAll('[data-sdk-token="' + SDK_TOKEN + '"]');
    containers.forEach(async (container) => {
      if (container._sdkInitialized) return;
      container._sdkInitialized = true;
      
      try {
        await __SDK__.lifecycle.mount(container);
      } catch (error) {
        console.error('[SDK] Mount failed:', error);
        container.innerHTML = '<div style="color:red;padding:20px;">SDK 加载失败: ' + error.message + '</div>';
      }
    });
  }
  
  // ===== 监听 DOM 变化 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  const observer = new MutationObserver(() => init());
  observer.observe(document.body, { childList: true, subtree: true });
  
  // ===== 监听页面卸载 =====
  window.addEventListener('beforeunload', () => {
    __SDK__.lifecycle.destroy();
  });
  
  // ===== 宿主通信接口 =====
  window['updateSDKConfig_${sdkToken.slice(0, 8)}'] = function(newConfig) {
    __SDK__.setConfig(newConfig);
  };
  
  window['destroySDK_${sdkToken.slice(0, 8)}'] = function() {
    __SDK__.lifecycle.destroy();
  };
  
})();
`;
}

/**
 * 生成完整的 SDK Wrapper（包含运行时 + 组件代码 + 内嵌代码层）
 */
export function generateEnhancedSDKWrapper(options: {
  sdkToken: string;
  componentName: string;
  componentCode: string;
  externalDeps: string[];
  framework?: 'react' | 'vue';
  styles?: string;
}): string {
  const { 
    sdkToken, 
    componentName, 
    componentCode, 
    externalDeps, 
    framework = 'react',
    styles = ''
  } = options;
  
  // 运行时代码
  const runtimeCode = generateSDKRuntime({
    sdkToken,
    config: {}
  });
  
  // 内嵌代码层
  const embedLayerCode = generateEmbedLayer({
    sdkToken,
    framework,
    componentName,
    styles
  });
  
  return `(function() {
'use strict';

// ========================================
// SDK 分层架构 - 自动生成
// ========================================
// 1. SDK 运行时层：事件系统、数据服务、生命周期、跨域通信
// 2. 组件代码层：业务逻辑和 UI
// 3. 内嵌代码层：与宿主系统的交互
// ========================================

${runtimeCode}

// ===== 组件代码 =====
${componentCode}
// ===== 组件代码结束 =====

${embedLayerCode}

})();
`;
}
