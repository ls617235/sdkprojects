import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

interface Props {
  params: Promise<{ token: string }>;
}

// 获取 SDK 基本信息
export async function GET(
  request: NextRequest,
  { params }: Props
) {
  try {
    const { token } = await params;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token 不能为空' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 获取 SDK 信息
    const apiResponse = await apiClient.get(`/api/sdk/${token}/info`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || 'SDK 不存在或已被删除' },
        { status: 404 }
      );
    }

    const sdk = apiResponse.data as { name?: string; config?: Record<string, unknown> };

    // 从 config 中提取框架信息
    const config = sdk.config || {};
    
    return NextResponse.json({
      id: token, // 使用 token 作为 id
      name: sdk.name || '',
      share_token: token, // 使用 token 作为 share_token
      framework: config.framework || 'html',
      type: config.type || 'original',
      created_at: new Date().toISOString(), // 提供默认的创建时间
    });
  } catch (error) {
    console.error('获取 SDK 信息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
