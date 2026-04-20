import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// POST: 用户登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 进行登录
    const apiResponse = await apiClient.post('/api/auth/login', undefined, { email, password });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '登录失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data;

    // 返回用户信息和 token
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
