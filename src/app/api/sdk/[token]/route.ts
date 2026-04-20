import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// GET: 通过 share_token 获取 SDK 详情（包含所有页面）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 直接调用后端 Python API 获取 SDK 详情
    const apiResponse = await apiClient.get(`/api/sdk/${token}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || 'SDK 不存在或已删除' },
        { status: 404 }
      );
    }

    const data = apiResponse.data;

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('获取 SDK 详情错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除 SDK（级联删除所有页面）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 直接调用后端 Python API 删除 SDK
    const apiResponse = await apiClient.delete(`/api/sdk/${token}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '删除失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'SDK 已删除',
    });
  } catch (error) {
    console.error('删除 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新 SDK 信息和页面
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { name, description, pages, config } = body;

    // 直接调用后端 Python API 更新 SDK
    const apiResponse = await apiClient.put(`/api/sdk/${token}`, undefined, {
      name,
      description,
      pages,
      config,
    });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '更新失败' },
        { status: 400 }
      );
    }

    const data = apiResponse.data;
    return NextResponse.json(data);
  } catch (error) {
    console.error('更新 SDK 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}
