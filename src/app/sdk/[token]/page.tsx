'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SDKInfo {
  id: string;
  name: string;
  share_token: string;
  framework: string;
  type: string;
  created_at: string;
}

export default function SDKPage() {
  const params = useParams();
  const token = params.token as string;
  const [sdk, setSdk] = useState<SDKInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchSDK = async () => {
      try {
        const response = await fetch(`/api/sdk/${token}/info`);
        if (!response.ok) {
          throw new Error('SDK 不存在或已被删除');
        }
        const data = await response.json();
        setSdk(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取 SDK 失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSDK();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !sdk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">SDK 不存在</h1>
          <p className="text-gray-600 mb-6">{error || '该 SDK 可能已被删除'}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-800">SDK 分享平台</span>
          </Link>
          <Link
            href="/sdk-list"
            className="px-4 py-2 text-gray-600 hover:text-indigo-600 transition-colors"
          >
            SDK 列表
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-3xl">📦</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{sdk.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                  {sdk.framework?.toUpperCase() || 'HTML'}
                </span>
                <span>•</span>
                <span>{new Date(sdk.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Share Token</h2>
            <div className="bg-gray-100 rounded-lg p-4 font-mono text-sm break-all">
              {sdk.share_token || '未生成'}
            </div>
          </div>

          {/* Embed Instructions */}
          {sdk.share_token && (
          <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">快速嵌入</h3>
            <p className="text-gray-600 mb-4">
              将以下代码添加到您的网页中即可嵌入此 SDK：
            </p>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
{`<script>
  window.SDK_CONFIG_${sdk.share_token.slice(0, 8).toUpperCase()} = {
    assetsBaseUrl: '/assets',
    apiBaseUrl: '/api'
  };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/sdk/${sdk.share_token}/embed"></script>
<div data-sdk-token="${sdk.share_token}"></div>`}
            </pre>
            <div className="mt-4 flex gap-3">
              <a
                href={`/sdk/${sdk.share_token}/preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                预览效果
              </a>
              <Link
                href="/sdk-list"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                返回列表
              </Link>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
