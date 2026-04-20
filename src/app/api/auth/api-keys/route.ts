import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// GET: 获取用户的 API Key 列表
export async function GET(request: NextRequest) {
  try {
    // 直接调用后端 Python API 获取 API Key 列表
    const apiResponse = await apiClient.get('/api/auth/api-keys');

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '查询失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data;

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('获取 API Key 列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST: 创建新的 API Key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, permissions = ['read', 'write'], rate_limit = 1000, expires_days } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'API Key 名称不能为空' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 创建 API Key
    const apiResponse = await apiClient.post('/api/auth/api-keys', undefined, {
      name,
      permissions,
      rate_limit,
      expires_days: expires_days || undefined,
    });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '创建失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('创建 API Key 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}
