/**
 * API 客户端
 * 用于前端与后端 API 交互，包括认证和 API Key 管理
 */

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
}

export interface APIKeyCreateResult {
  id: string;
  name: string;
  key: string;
  key_prefix: string;
  permissions: string[];
  rate_limit: number;
  expires_at?: string;
}

export interface APIKeyCreateRequest {
  name: string;
  permissions: string[];
  rate_limit: number;
  expires_days?: number;
}

export interface App {
  id: string;
  name: string;
  type: string;
  description?: string;
  scene?: string;
  sdk_count?: number;
  created_at: string;
}

export interface AuthData {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export type AuthResponse = APIResponse<AuthData>;

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * API 客户端类
 */
export class APIClient {
  private baseURL: string;

  constructor() {
    // 使用当前域名作为 API 基础 URL
    this.baseURL = window.location.origin;
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
   * 发送 HTTP 请求
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = this.buildURL(endpoint);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // 解析响应
      const data = await response.json().catch(() => null);

      // 检查响应状态
      if (!response.ok) {
        return {
          success: false,
          error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
          message: data?.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      // 处理错误
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: '未知错误',
      };
    }
  }

  /**
   * 获取 API Key 列表
   */
  async listAPIKeys(): Promise<APIResponse<APIKey[]>> {
    return this.request<APIKey[]>('api/auth/api-keys');
  }

  /**
   * 创建 API Key
   */
  async createAPIKey(data: APIKeyCreateRequest): Promise<APIResponse<APIKeyCreateResult>> {
    return this.request<APIKeyCreateResult>('api/auth/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 删除 API Key
   */
  async deleteAPIKey(keyId: string): Promise<APIResponse<void>> {
    return this.request<void>(`api/auth/api-keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthData>('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * 用户注册
   */
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.request<AuthData>('api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  /**
   * 获取应用列表
   */
  async listApps(): Promise<APIResponse<App[]>> {
    return this.request<App[]>('api/auth/apps');
  }

  /**
   * 创建应用
   */
  async createApp(data: { name: string; type: string; description?: string; scene?: string }): Promise<APIResponse<any>> {
    return this.request<any>('api/auth/apps', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 更新应用
   */
  async updateApp(appId: string, data: { name?: string; type?: string; description?: string }): Promise<APIResponse<any>> {
    return this.request<any>(`api/auth/apps/${appId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * 删除应用
   */
  async deleteApp(appId: string): Promise<APIResponse<void>> {
    return this.request<void>(`api/auth/apps/${appId}`, {
      method: 'DELETE',
    });
  }
}

/**
 * API 客户端实例
 */
export const apiClient = new APIClient();
