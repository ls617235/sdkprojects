import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// POST: 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码为必填项' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少 6 位' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 进行注册
    const apiResponse = await apiClient.post('/api/auth/register', undefined, { email, password, name });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '注册失败' },
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
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '注册失败' },
      { status: 500 }
    );
  }
}
