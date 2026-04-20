import API_CONFIG from './config';

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API 客户端类
class ApiClient {
  /**
   * 发送 GET 请求
   */
  async get<T>(endpoint: string, params?: Record<string, string | number>, queryParams?: Record<string, string | number>, responseType: 'json' | 'text' = 'json'): Promise<ApiResponse<T>> {
    try {
      let url = API_CONFIG.getUrl(endpoint, params);
      
      // 添加查询参数
      if (queryParams) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // 安全解析错误响应
        let errorMessage = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.error || errorMessage;
          } else {
            // 非 JSON 响应，尝试获取文本
            const text = await response.text();
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: 请求失败`;
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      let data;
      if (responseType === 'text') {
        data = await response.text();
      } else {
        data = await response.json();
      }
      
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error('API GET 请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }
  
  /**
   * 发送 POST 请求
   */
  async post<T>(endpoint: string, params?: Record<string, string>, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = API_CONFIG.getUrl(endpoint, params);
      
      // 调试日志
      console.log('[API POST]', {
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        bodyLength: JSON.stringify(data).length,
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // 调试日志
      console.log('[API POST Response]', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });
      
      if (!response.ok) {
        // 安全解析错误响应
        let errorMessage = `HTTP ${response.status}`;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.error || errorMessage;
          } else {
            // 非 JSON 响应，尝试获取文本
            const text = await response.text();
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: 请求失败`;
        }
        
        console.error('[API POST Error]', errorMessage);
        
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      const responseData = await response.json();
      console.log('[API POST Success]', { hasData: !!responseData });
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('[API POST Exception]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }
  
  /**
   * 发送 PUT 请求
   */
  async put<T>(endpoint: string, params?: Record<string, string>, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = API_CONFIG.getUrl(endpoint, params);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || errorData.error || '请求失败',
        };
      }
      
      const responseData = await response.json();
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('API PUT 请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }
  
  /**
   * 发送 DELETE 请求
   */
  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    try {
      const url = API_CONFIG.getUrl(endpoint, params);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.detail || errorData.error || '请求失败',
        };
      }
      
      const responseData = await response.json();
      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('API DELETE 请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '请求失败',
      };
    }
  }
}

// 导出单例实例
export const apiClient = new ApiClient();

export default apiClient;