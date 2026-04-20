/**
 * API 配置
 * 支持前后端分离架构
 */

// 获取 API 基础 URL
export function getApiBaseUrl(): string {
  // 优先使用环境变量配置的后端地址
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 服务端渲染时使用内部地址
  if (typeof window === 'undefined') {
    // Docker 内部网络
    return process.env.API_INTERNAL_URL || 'http://backend:8000';
  }
  
  // 客户端使用相对路径（通过 Nginx 代理）
  return '';
}

// API 请求封装
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// SDK API
export const sdkApi = {
  // 获取 SDK 列表
  list: () => apiRequest<{ success: boolean; data: any[] }>('/api/sdk'),
  
  // 创建 SDK
  create: (data: any) => apiRequest<{ success: boolean; data: any }>('/api/sdk', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // 获取 SDK 详情
  get: (token: string) => apiRequest<{ success: boolean; data: any }>(`/api/sdk/${token}`),
  
  // 更新 SDK
  update: (token: string, data: any) => apiRequest<{ success: boolean; message: string }>(`/api/sdk/${token}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // 删除 SDK
  delete: (token: string) => apiRequest<{ success: boolean; message: string }>(`/api/sdk/${token}`, {
    method: 'DELETE',
  }),
  
  // 获取嵌入代码 URL
  getEmbedUrl: (token: string) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api/sdk/${token}/embed`;
  },
  
  // 获取下载 URL
  getDownloadUrl: (token: string) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api/sdk/${token}/download`;
  },
};
