// API 配置
export const API_CONFIG = {
  // 后端 API 基础地址
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000',
  
  // API 端点
  ENDPOINTS: {
    // SDK 相关
    SDK: '/api/sdk',
    SDK_LIST: '/api/sdk',
    SDK_INFO: '/api/sdk/{token}/info',
    SDK_EMBED: '/api/sdk/{token}/embed',
    SDK_DOWNLOAD: '/api/sdk/{token}/download',
    
    // 认证相关
    AUTH_REGISTER: '/api/auth/register',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_APPS: '/api/auth/apps',
    AUTH_API_KEYS: '/api/auth/api-keys',
  },
  
  // 构建完整的 API URL
  getUrl(endpoint: string, params?: Record<string, string | number>): string {
    let url = `${this.BASE_URL}${endpoint}`;
    
    // 替换路径参数
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, String(value));
      });
    }
    
    return url;
  },
};

// 导出默认配置
export default API_CONFIG;