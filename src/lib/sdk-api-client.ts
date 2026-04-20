/**
 * SDK API 客户端
 * 用于 SDK 内部与后端 API 交互
 */

export interface SDKConfig {
  token: string;
  configKey: string;
  apiBaseUrl?: string;
  apiKey?: string;
  custom?: {
    userId?: string;
    userName?: string;
    environment?: string;
    [key: string]: any;
  };
  useShadowDOM?: boolean;
}

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * SDK API 客户端类
 */
export class SDKAPIClient {
  private config: SDKConfig;
  private baseURL: string;

  constructor(config: SDKConfig) {
    this.config = config;
    // 使用 SDK 平台的 URL 作为 API 基础 URL
    this.baseURL = config.apiBaseUrl || window.location.origin;
  }

  /**
   * 构建完整的 API URL
   */
  private buildURL(endpoint: string): string {
    // 移除 endpoint 开头的斜杠
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseURL}/${cleanEndpoint}`;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };

    // 添加 API Key（如果配置了）
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      headers['X-API-Key'] = this.config.apiKey;
    }

    // 添加自定义信息
    if (this.config.custom) {
      headers['X-SDK-User-ID'] = this.config.custom.userId || '';
      headers['X-SDK-User-Name'] = encodeURIComponent(this.config.custom.userName || '');
      headers['X-SDK-Environment'] = this.config.custom.environment || 'production';
    }

    return headers;
  }

  /**
   * 发送 HTTP 请求
   */
  private async request<T = any>(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000
    } = options;

    const url = this.buildURL(endpoint);
    const requestOptions: RequestInit = {
      method,
      headers: this.buildHeaders(headers),
    };

    // 添加请求体（仅非 GET 请求）
    if (method !== 'GET' && body !== undefined) {
      requestOptions.body = JSON.stringify(body);
    }

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // 解析响应
      const data = await response.json().catch(() => null);

      // 检查响应状态
      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
          message: data?.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // 处理错误
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: '请求超时'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: '未知错误'
      };
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = any>(endpoint: string, body: any, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(endpoint: string, body: any, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * 获取 SDK 配置
   */
  getConfig(): SDKConfig {
    return this.config;
  }

  /**
   * 更新 API 基础 URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }
}

/**
 * 创建 SDK API 客户端实例
 */
export function createSDKAPIClient(config: SDKConfig): SDKAPIClient {
  return new SDKAPIClient(config);
}

/**
 * 快捷方法：获取 SDK 实例的 API 客户端
 */
export function getSDKAPI(token: string): SDKAPIClient | null {
  const configKey = `SDK_CONFIG_${token.slice(0, 8).toUpperCase()}`;
  const config = (window as any)[configKey];

  if (!config) {
    console.error(`[SDK API] 找不到配置: ${configKey}`);
    return null;
  }

  return new SDKAPIClient({
    token,
    configKey,
    ...config
  });
}
