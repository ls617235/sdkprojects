import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// POST: 创建新的 SDK（支持多页面）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, pages, config, is_public = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: '缺少必要字段：name' },
        { status: 400 }
      );
    }

    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        { error: '至少需要提供一个页面' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 创建 SDK
    const apiResponse = await apiClient.post('/api/sdk', undefined, {
      name,
      description,
      status: is_public ? 'public' : 'private',
      pages: pages.map((page: any, index: number) => ({
        page_id: page.page_id || `page_${index + 1}`,
        name: page.name || `页面 ${index + 1}`,
        code: page.code || '',
        is_default: index === 0 || page.is_default || false,
      })),
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
    console.error('创建 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// GET: 获取 SDK 列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 直接调用后端 Python API 获取 SDK 列表
    const apiResponse = await apiClient.get('/api/sdk', undefined, {
      limit,
      offset,
    });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '查询失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取 SDK 列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}