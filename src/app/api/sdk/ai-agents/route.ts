import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api-client';

// 获取AI助手列表
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key') || '';
    const apiResponse = await apiClient.get('/api/sdk/ai-agents');
    
    if (!apiResponse.success) {
      return NextResponse.json({ success: false, detail: apiResponse.error || '获取失败' }, { status: 400 });
    }
    
    return NextResponse.json(apiResponse.data);
  } catch (error) {
    console.error('获取AI助手列表失败:', error);
    return NextResponse.json({ success: false, detail: '获取失败' }, { status: 500 });
  }
}

// 创建AI助手
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, greeting, description, sdk_id, theme_color, position, bottom, side_margin } = body;
    
    if (!name) {
      return NextResponse.json({ success: false, detail: '名称不能为空' }, { status: 400 });
    }
    if (!sdk_id) {
      return NextResponse.json({ success: false, detail: '请选择关联的SDK' }, { status: 400 });
    }
    
    const apiResponse = await apiClient.post('/api/sdk/ai-agents', undefined, {
      sdk_id,
      name,
      greeting: greeting || '你好！有什么可以帮您的吗？',
      description,
      config: {
        theme_color: theme_color || '#4F46E5',
        position: position || 'right',
        bottom: bottom || 20,
        side_margin: side_margin || 20,
      },
    });
    
    if (!apiResponse.success) {
      return NextResponse.json({ success: false, detail: apiResponse.error || '创建失败' }, { status: 400 });
    }
    
    return NextResponse.json(apiResponse.data);
  } catch (error) {
    console.error('创建AI助手失败:', error);
    return NextResponse.json({ success: false, detail: '创建失败' }, { status: 500 });
  }
}
