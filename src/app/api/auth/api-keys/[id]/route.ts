import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// DELETE: 删除 API Key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 直接调用后端 Python API 删除 API Key
    const apiResponse = await apiClient.delete(`/api/auth/api-keys/${id}`);

    if (!apiResponse.success) {
      return NextResponse.json(
        { error: apiResponse.error || '删除失败' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API Key 已删除',
    });
  } catch (error) {
    console.error('删除 API Key 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
