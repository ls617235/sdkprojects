'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SDKPreviewPage() {
  const params = useParams();
  const token = (params?.token as string) || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // 安全处理 token
  const safeToken = token && token !== 'preview' ? token : '';

  useEffect(() => {
    // 无效 token 处理
    if (!safeToken) {
      setError('无效的 SDK Token');
      setLoading(false);
      return;
    }

    // 构建预览 URL（使用后端提供的预览端点）
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/sdk/${safeToken}/preview`;
    setPreviewUrl(url);
    setLoading(false);
  }, [safeToken]);

  // 加载状态
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p style={{ color: '#64748b', fontSize: '14px' }}>加载 SDK 预览...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: '16px', marginBottom: '8px' }}>{error}</p>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>请检查 SDK 是否存在或已删除</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      backgroundColor: '#f8fafc'
    }}>
      {/* 使用 iframe 加载后端提供的预览页面 */}
      <iframe
        src={previewUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          margin: 0,
          padding: 0
        }}
        title="SDK Preview"
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
