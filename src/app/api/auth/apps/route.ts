import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// GET: 获取用户的应用列表
export async function GET(request: NextRequest) {
  try {
    // 直接调用后端 Python API 获取应用列表
    const apiResponse = await apiClient.get('/api/auth/apps');

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
    console.error('获取应用列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// POST: 创建新应用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, scene, config } = body;

    if (!name) {
      return NextResponse.json(
        { error: '应用名称不能为空' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 创建应用
    const apiResponse = await apiClient.post('/api/auth/apps', undefined, {
      name,
      description,
      scene,
      config,
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
    console.error('创建应用错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}
