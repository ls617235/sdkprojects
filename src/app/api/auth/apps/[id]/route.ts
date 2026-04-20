import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// GET: 获取应用详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 直接调用后端 Python API 获取应用详情
    const apiResponse = await apiClient.get(`/api/auth/apps/${id}`);

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
    console.error('获取应用详情错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新应用
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, scene, config, status } = body;

    // 直接调用后端 Python API 更新应用
    const apiResponse = await apiClient.put(`/api/auth/apps/${id}`, undefined, {
      name,
      description,
      scene,
      config,
      status,
    });

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '更新失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '应用已更新',
    });
  } catch (error) {
    console.error('更新应用错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除应用
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 直接调用后端 Python API 删除应用
    const apiResponse = await apiClient.delete(`/api/auth/apps/${id}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '删除失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '应用已删除',
    });
  } catch (error) {
    console.error('删除应用错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
