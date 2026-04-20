import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

/**
 * GET /api/sdk-list
 * 获取 SDK 列表
 * ?page=1&limit=20&search=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 直接调用后端 Python API 获取 SDK 列表
    const apiResponse = await apiClient.get('/api/sdk', undefined, { limit, offset });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '获取失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data as { total?: number; data?: any[] };

    // 从后端 API 获取总数
    const total = data.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        list: data.data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('获取 SDK 列表失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sdk-list?id=xxx
 * 删除 SDK
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少 SDK ID' },
        { status: 400 }
      );
    }

    // 直接调用后端 Python API 删除 SDK
    const apiResponse = await apiClient.delete(`/api/sdk/${id}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '删除失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `SDK "${id}" 已删除`,
    });
  } catch (error) {
    console.error('删除 SDK 失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
