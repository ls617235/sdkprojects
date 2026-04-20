import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// OPTIONS: 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// GET: 返回已打包的 JS SDK 代码
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 直接调用后端 Python API 获取 SDK 嵌入代码
    const apiResponse = await apiClient.get(`/api/sdk/${token}/embed`, undefined, undefined, 'text');

    // 后端返回的是纯文本 JavaScript 代码
    const sdkCode = apiResponse.data as string;

    // 检查是否为有效的 JavaScript（不是 HTML 错误页面或 JSON 错误）
    if (!sdkCode || sdkCode.startsWith('<') || sdkCode.startsWith('{')) {
      // 如果返回的是 HTML（错误页面）或 JSON（错误响应），返回一个占位的 JavaScript 错误处理代码
      const errorMsg = sdkCode && sdkCode.startsWith('{') 
        ? (() => { 
            try { 
              const json = JSON.parse(sdkCode); 
              return json.detail || json.error || 'SDK not found'; 
            } catch { 
              return apiResponse.error || 'Unknown error'; 
            } 
          })()
        : apiResponse.error || 'SDK not found';
      
      const errorCode = `
        console.error('[SDK Error] Failed to load SDK: ${errorMsg.replace(/'/g, "\\'")}');
        window.dispatchEvent(new CustomEvent('sdk:error', { detail: { token: '${token}', error: '${errorMsg.replace(/'/g, "\\'")}' } }));
      `;
      return new NextResponse(errorCode, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new NextResponse(sdkCode, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': process.env.COZE_PROJECT_ENV === 'PROD'
          ? 'public, max-age=3600'
          : 'no-store, no-cache, must-revalidate',
        // 允许跨域访问
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('获取 SDK 代码错误:', error);
    const errorCode = `
      console.error('[SDK Error] Failed to load SDK: ${(error instanceof Error ? error.message : 'Unknown error').replace(/'/g, "\\'")}');
      window.dispatchEvent(new CustomEvent('sdk:error', { detail: { error: '${(error instanceof Error ? error.message : 'Unknown error').replace(/'/g, "\\'")}' } }));
    `;
    return new NextResponse(errorCode, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
