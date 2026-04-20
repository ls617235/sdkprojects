'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, Settings, Wand2, FileCode, Code2
} from 'lucide-react';
import { SDKList } from '@/components/sdk/SDKList';

export default function SDKListPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 transition-all hover:scale-105">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SDK 列表</h1>
                <p className="text-sm text-gray-500">在线分享内嵌代码</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="default" size="sm" className="transition-all hover:shadow-md">
                <Code2 className="w-4 h-4 mr-1.5" />
                SDK 创建
              </Button>
            </Link>

            <Link href="/models">
              <Button variant="outline" size="sm" className="transition-all hover:shadow-sm">
                <Settings className="w-4 h-4 mr-1.5" />
                模型配置
              </Button>
            </Link>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* 功能介绍 */}
          <Card className="mb-6 rounded-2xl shadow-sm border-gray-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <FileCode className="w-5 h-5 text-blue-500" />
                SDK 分享平台
              </CardTitle>
              <CardDescription className="text-gray-600">
                查看已创建的 SDK，获取嵌入代码，一键分享到任何网页
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">浏览 SDK</h4>
                    <p className="text-sm text-gray-600">
                      查看所有已创建的 SDK
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">获取代码</h4>
                    <p className="text-sm text-gray-600">
                      复制嵌入代码到剪贴板
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">嵌入网页</h4>
                    <p className="text-sm text-gray-600">
                      粘贴到任意 HTML 页面
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SDK 列表 */}
          <SDKList />
        </div>
      </div>
    </main>
  );
}
