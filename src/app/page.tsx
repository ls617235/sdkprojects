'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code2, Sparkles, Zap, Play, CheckCircle2, Wand2, Package, 
  Settings, Copy, Check, FileCode, Globe, Layers, Rocket, Plus,
  ChevronDown, ChevronUp, ExternalLink, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { SDKCreator } from '@/components/sdk/SDKCreator';
import { SDKResult } from '@/components/sdk/SDKResult';

export default function HomePage() {
  const [sdkResult, setSdkResult] = useState<{
    id: string;
    name: string;
    share_token: string;
    embed_code?: string;
  } | null>(null);
  
  const [showCreator, setShowCreator] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleSDKCreated = (data: { 
    id: string; 
    name: string; 
    share_token: string; 
    embed_code?: string;
  }) => {
    setSdkResult(data);
    setShowCreator(false);
  };

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('已复制');
    setTimeout(() => setCopied(null), 2000);
  };

  // 获取当前域名
  const currentDomain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'your-domain.com';

  // 内嵌示例代码
  const embedExamples = {
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SDK 嵌入示例</title>
</head>
<body>

  <!-- 1. 设置 SDK 配置（可选） -->
  <script>
  window.SDK_CONFIG_YOUR_TOKEN = {
    // API 基础 URL（用于后端 API 调用）
    apiBaseUrl: '${currentDomain}/api',

    // API Key（用于 API 认证）
    apiKey: 'your-api-key-here',

    // 静态资源基础 URL（可选）
    assetsBaseUrl: '',

    // 是否使用 Shadow DOM 隔离样式（默认 true）
    useShadowDOM: true,

    // 自定义业务数据
    custom: {
      userId: '12345',
      userName: '张三',
      userEmail: 'zhang@example.com'
    }
  };
  </script>

  <!-- 2. 加载 SDK 脚本 -->
  <script src="${currentDomain}/api/sdk/YOUR_TOKEN/embed"></script>

  <!-- 3. 添加 SDK 容器 -->
  <div id="sdk-container" data-sdk-token="YOUR_TOKEN" style="width: 100%; min-height: 400px;"></div>

</body>
</html>`,

    vue: `<template>
  <div class="sdk-container">
    <!-- SDK 容器 -->
    <div
      :data-sdk-token="sdkToken"
      style="width: 100%; min-height: 400px;"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

const sdkToken = 'YOUR_TOKEN'; // 替换为你的 SDK Token

onMounted(() => {
  // 设置 SDK 配置
  (window as any).SDK_CONFIG_YOUR_TOKEN = {
    // API 基础 URL（用于后端 API 调用）
    apiBaseUrl: '${currentDomain}/api',

    // API Key（用于 API 认证）
    apiKey: 'your-api-key-here',

    // 自定义业务数据
    custom: {
      userId: '12345',
      userName: '张三'
    }
  };

  // 动态加载 SDK 脚本
  const script = document.createElement('script');
  script.src = '${currentDomain}/api/sdk/YOUR_TOKEN/embed';
  script.async = true;
  document.body.appendChild(script);
});

onUnmounted(() => {
  // 清理（可选）
  const script = document.querySelector('script[src*="YOUR_TOKEN"]');
  if (script) script.remove();
});
</script>`,

    react: `'use client';

import { useEffect } from 'react';

export default function MyPage() {
  const sdkToken = 'YOUR_TOKEN'; // 替换为你的 SDK Token

  useEffect(() => {
    // 设置 SDK 配置
    (window as any).SDK_CONFIG_YOUR_TOKEN = {
      // API 基础 URL（用于后端 API 调用）
      apiBaseUrl: '${currentDomain}/api',

      // API Key（用于 API 认证）
      apiKey: 'your-api-key-here',

      // 自定义业务数据
      custom: {
        userId: '12345',
        userName: '张三'
      }
    };

    // 动态加载 SDK 脚本
    const script = document.createElement('script');
    script.src = '${currentDomain}/api/sdk/YOUR_TOKEN/embed';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // 清理
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [sdkToken]);

  return (
    <div className="sdk-container">
      {/* SDK 容器 */}
      <div
        data-sdk-token={sdkToken}
        style={{ width: '100%', minHeight: '400px' }}
      />
    </div>
  );
}`
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">SDK Share</h1>
                <p className="text-sm text-muted-foreground">组件分享平台</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-3">
              <Link href="/ai-assistant">
                <Button variant="outline" size="sm" className="border-purple-200 text-purple-600 hover:bg-purple-50 transition-all">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  AI 助手
                </Button>
              </Link>

              <Link href="/sdk-list">
                <Button variant="outline" size="sm" className="transition-all">
                  <Package className="w-4 h-4 mr-1" />
                  SDK 列表
                </Button>
              </Link>
              <Link href="/models">
                <Button variant="outline" size="sm" className="transition-all">
                  <Settings className="w-4 h-4 mr-1" />
                  模型配置
                </Button>
              </Link>
            </nav>
            <Button variant="default" size="sm" className="md:hidden" onClick={() => setShowCreator(!showCreator)}>
              {showCreator ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent animate-gradient">
            一键生成，随处嵌入
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
            将 HTML/CSS/JS 组件转换为独立的 JS SDK，轻松嵌入到任何网页，无需框架依赖
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="px-8 py-6 text-base" onClick={() => setShowCreator(!showCreator)}>
              {showCreator ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  收起创建器
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  创建 SDK
                </>
              )}
            </Button>
            <Link href="#embed-guide">
              <Button variant="outline" size="lg" className="px-8 py-6 text-base">
                <FileCode className="w-4 h-4 mr-2" />
                查看嵌入指南
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* SDK Creator */}
      {showCreator && !sdkResult && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold mb-2">创建 SDK</h3>
              <p className="text-muted-foreground">上传或编写代码，一键生成可嵌入的 JS SDK</p>
            </div>
            <SDKCreator onSuccess={handleSDKCreated} />
          </div>
        </section>
      )}

      {/* SDK Result */}
      {sdkResult && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <div className="mb-6 text-center">
                <h3 className="text-2xl font-bold mb-2">SDK 创建成功</h3>
                <p className="text-muted-foreground">您的 SDK 已生成，以下是嵌入代码和使用指南</p>
              </div>
              <SDKResult data={sdkResult} />
            </div>
            <Button 
              variant="outline" 
              onClick={() => { setSdkResult(null); setShowCreator(true); }}
              className="w-full py-6 text-base transition-all hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建新 SDK
            </Button>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6 transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-semibold">代码转换</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  将 HTML/CSS/JS 组件转换为独立的 JS SDK，无需框架依赖
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl font-semibold">样式隔离</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  支持 Shadow DOM 隔离样式，避免与宿主页面 CSS 冲突
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-xl font-semibold">跨平台嵌入</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  支持 HTML、Vue、React 等任意前端框架，一行代码即可嵌入
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">使用流程</h3>
          <div className="relative">
            {/* 连接线 */}
            <div className="absolute left-6 top-16 bottom-16 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-green-500 hidden md:block" />
            
            <div className="space-y-10">
              {/* Step 1 */}
              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xl shrink-0 relative z-10 shadow-lg">
                  1
                </div>
                <div className="flex-1">
                  <Card className="p-6 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Wand2 className="w-6 h-6 text-purple-500" />
                        准备代码
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        准备你的组件代码，支持两种方式：
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-muted rounded-lg p-4">
                          <h5 className="font-medium mb-2">原生代码</h5>
                          <p className="text-sm text-muted-foreground">
                            直接编写 HTML + CSS + JS，或上传已有文件
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <h5 className="font-medium mb-2">项目上传</h5>
                          <p className="text-sm text-muted-foreground">
                            上传完整的项目文件夹，自动处理依赖关系
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-xl shrink-0 relative z-10 shadow-lg">
                  2
                </div>
                <div className="flex-1">
                  <Card className="p-6 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Play className="w-6 h-6 text-blue-500" />
                        生成 SDK
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        点击"生成 SDK"按钮，系统会自动：
                      </p>
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">打包代码为独立 JS 文件</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">生成唯一访问 Token</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">创建嵌入代码片段</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="flex gap-6 items-start">
                <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xl shrink-0 relative z-10 shadow-lg">
                  3
                </div>
                <div className="flex-1">
                  <Card className="p-6 transition-all hover:shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Globe className="w-6 h-6 text-green-500" />
                        嵌入到网页
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        复制嵌入代码，粘贴到你的网页中即可使用。支持任意前端框架！
                      </p>
                      <div className="bg-muted rounded-lg p-4">
                        <h5 className="font-medium mb-2">支持的框架</h5>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">HTML</Badge>
                          <Badge variant="outline">Vue</Badge>
                          <Badge variant="outline">React</Badge>
                          <Badge variant="outline">Angular</Badge>
                          <Badge variant="outline">Next.js</Badge>
                          <Badge variant="outline">Nuxt.js</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Embed Guide */}
      <section id="embed-guide" className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">嵌入指南</h3>
          
          <Tabs defaultValue="html" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white p-1 rounded-xl shadow-sm">
              <TabsTrigger value="html" className="flex items-center gap-2 py-3 rounded-lg">
                <Globe className="w-4 h-4" />
                HTML
              </TabsTrigger>
              <TabsTrigger value="vue" className="flex items-center gap-2 py-3 rounded-lg">
                <Layers className="w-4 h-4" />
                Vue
              </TabsTrigger>
              <TabsTrigger value="react" className="flex items-center gap-2 py-3 rounded-lg">
                <Code2 className="w-4 h-4" />
                React
              </TabsTrigger>
            </TabsList>

            <TabsContent value="html">
              <Card className="rounded-2xl overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/50 pb-6">
                  <CardTitle className="text-xl">嵌入到 HTML 页面</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    最简单的嵌入方式，适用于静态网页或服务端渲染页面
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="relative bg-muted rounded-xl p-5">
                    <pre className="text-xs font-mono overflow-x-auto">
                      {embedExamples.html}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-lg shadow-sm"
                      onClick={() => handleCopy(embedExamples.html, 'html')}
                    >
                      {copied === 'html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Alert className="rounded-xl">
                    <Zap className="w-4 h-4" />
                    <AlertTitle>快速开始</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <div>1. 将 <code className="bg-muted px-1 rounded">YOUR_TOKEN</code> 替换为你的 SDK Token（创建 SDK 后获得）</div>
                      <div>2. 可选：设置 <code className="bg-muted px-1 rounded">apiKey</code> 以启用后端 API 功能</div>
                      <div>3. 在 <code className="bg-muted px-1 rounded">custom</code> 中传入你的业务数据</div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vue">
              <Card className="rounded-2xl overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/50 pb-6">
                  <CardTitle className="text-xl">嵌入到 Vue 项目</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    适用于 Vue 3 项目（Composition API）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="relative bg-muted rounded-xl p-5">
                    <pre className="text-xs font-mono overflow-x-auto">
                      {embedExamples.vue}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-lg shadow-sm"
                      onClick={() => handleCopy(embedExamples.vue, 'vue')}
                    >
                      {copied === 'vue' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Alert className="rounded-xl">
                    <Zap className="w-4 h-4" />
                    <AlertTitle>注意事项</AlertTitle>
                    <AlertDescription>
                      在 <code className="bg-muted px-1 rounded">onUnmounted</code> 中清理脚本，避免内存泄漏。
                      如需响应式配置，可使用 <code className="bg-muted px-1 rounded">ref</code> 和 <code className="bg-muted px-1 rounded">watch</code>。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="react">
              <Card className="rounded-2xl overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/50 pb-6">
                  <CardTitle className="text-xl">嵌入到 React 项目</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    适用于 React 18+ 项目（Next.js App Router）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="relative bg-muted rounded-xl p-5">
                    <pre className="text-xs font-mono overflow-x-auto">
                      {embedExamples.react}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-lg shadow-sm"
                      onClick={() => handleCopy(embedExamples.react, 'react')}
                    >
                      {copied === 'react' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  <Alert className="rounded-xl">
                    <Zap className="w-4 h-4" />
                    <AlertTitle>注意事项</AlertTitle>
                    <AlertDescription>
                      使用 <code className="bg-muted px-1 rounded">'use client'</code> 指令确保代码在客户端执行。
                      在 <code className="bg-muted px-1 rounded">useEffect</code> 的清理函数中移除脚本。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* SDK Config */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">SDK 配置</h3>
          
          <Card className="rounded-2xl overflow-hidden shadow-lg">
            <CardHeader className="bg-muted/50 pb-6">
              <CardTitle className="text-xl">配置项说明</CardTitle>
              <CardDescription className="text-muted-foreground">
                通过配置对象向 SDK 传递自定义数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
              <div className="bg-muted rounded-xl p-5">
                <h4 className="font-medium mb-3 text-muted-foreground">配置对象结构</h4>
                <pre className="text-xs font-mono overflow-x-auto">
{`// 注意：将 YOUR_TOKEN 替换为你的实际 SDK Token
window.SDK_CONFIG_YOUR_TOKEN = {
  // API 基础 URL（用于后端 API 调用）
  apiBaseUrl: '${currentDomain}/api',

  // API Key（用于 API 认证，在设置页面获取）
  apiKey: 'your-api-key-here',

  // 静态资源基础 URL（可选，用于自定义 CDN）
  assetsBaseUrl: '',

  // 认证 Token（可选，用于用户身份验证）
  token: 'your-jwt-token',

  // 是否使用 Shadow DOM 隔离样式（默认 true）
  useShadowDOM: true,

  // 自定义业务数据（在 SDK 中通过 sdk.get('userId') 获取）
  custom: {
    userId: '12345',
    userName: '张三',
    userEmail: 'zhang@example.com',
    // ...更多自定义字段
  }
};`}
                </pre>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted rounded-xl p-5">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    在 JS 中获取配置
                  </h5>
                  <pre className="text-xs font-mono bg-background rounded-lg p-4 overflow-x-auto">
{`(function(container, sdk) {
  // 获取配置数据
  const userId = sdk?.get('userId');
  const userName = sdk?.get('userName', '访客');
  const apiBaseUrl = sdk?.get('apiBaseUrl');
  const apiKey = sdk?.get('apiKey');

  console.log('用户ID:', userId);
  console.log('API地址:', apiBaseUrl);

  // 使用配置...
})();`}
                  </pre>
                </div>
                <div className="bg-muted rounded-xl p-5">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    调用后端 API
                  </h5>
                  <pre className="text-xs font-mono bg-background rounded-lg p-4 overflow-x-auto">
{`(async function(container, sdk) {
  // 获取 API 配置
  const apiBaseUrl = sdk?.get('apiBaseUrl');
  const apiKey = sdk?.get('apiKey');

  if (!apiKey) {
    console.error('未配置 API Key，请在设置中获取');
    return;
  }

  // 调用后端 API
  const response = await fetch(\`\${apiBaseUrl}/your-api-endpoint\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      userId: sdk?.get('userId'),
      action: 'custom-action'
    })
  });

  const data = await response.json();
  console.log('API 响应:', data);
})();`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Download & Local Usage */}
      <section id="download-guide" className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">下载 SDK & 本地使用</h3>
          
          <Tabs defaultValue="download" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white p-1 rounded-xl shadow-sm">
              <TabsTrigger value="download" className="flex items-center gap-2 py-3 rounded-lg">
                <FileCode className="w-4 h-4" />
                如何下载
              </TabsTrigger>
              <TabsTrigger value="local" className="flex items-center gap-2 py-3 rounded-lg">
                <Globe className="w-4 h-4" />
                本地使用
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download">
              <Card className="rounded-2xl overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/50 pb-6">
                  <CardTitle className="text-xl">下载 SDK 文件</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    将 SDK 文件下载到本地，离线使用或部署到自己的服务器
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {/* 方式一 */}
                  <div className="bg-muted rounded-xl p-5">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">方式一</Badge>
                      直接下载
                    </h5>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>进入 <Link href="/sdk-list" className="text-primary underline hover:underline-offset-4 transition-all">SDK 列表</Link> 页面</li>
                      <li>找到目标 SDK，点击"下载"按钮</li>
                      <li>保存 <code className="bg-background px-1 rounded">sdk-xxx.js</code> 文件到本地</li>
                    </ol>
                  </div>
                  
                  {/* 方式二 */}
                  <div className="bg-muted rounded-xl p-5">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">方式二</Badge>
                      通过 API 下载
                    </h5>
                    <div className="relative mt-2">
                      <pre className="bg-background rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`# 下载 SDK 文件
curl -o sdk.js ${currentDomain}/api/sdk/YOUR_TOKEN/embed

# 或使用 wget
wget -O sdk.js ${currentDomain}/api/sdk/YOUR_TOKEN/embed`}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-lg shadow-sm"
                        onClick={() => handleCopy(`curl -o sdk.js ${currentDomain}/api/sdk/YOUR_TOKEN/embed`, 'download-curl')}
                      >
                        {copied === 'download-curl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* 方式三 */}
                  <div className="bg-muted rounded-xl p-5">
                    <h5 className="font-medium mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">方式三</Badge>
                      浏览器直接访问
                    </h5>
                    <p className="text-sm text-muted-foreground mb-3">
                      直接在浏览器中打开以下地址，然后保存页面：
                    </p>
                    <code className="block bg-background rounded-lg p-3 text-xs">
                      {currentDomain}/api/sdk/YOUR_TOKEN/embed
                    </code>
                  </div>
                  
                  <Alert className="rounded-xl">
                    <Zap className="w-4 h-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                      下载的 SDK 文件是完全自包含的，包括 HTML、CSS、JS 和图片资源（base64），
                      无需任何外部依赖即可运行。
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="local">
              <Card className="rounded-2xl overflow-hidden shadow-lg">
                <CardHeader className="bg-muted/50 pb-6">
                  <CardTitle className="text-xl">本地使用 SDK</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    将下载的 SDK 文件放到项目中，本地引用使用
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 p-6">
                  {/* 目录结构 */}
                  <div>
                    <h5 className="font-medium mb-3">1. 项目目录结构</h5>
                    <pre className="bg-muted rounded-xl p-5 text-xs font-mono">
{`your-project/
├── index.html
├── static/
│   └── js/
│       └── sdk-xxx.js  ← 下载的 SDK 文件
└── ...`}
                    </pre>
                  </div>
                  
                  {/* HTML 引用 */}
                  <div>
                    <h5 className="font-medium mb-3">2. 在 HTML 中引用本地 SDK</h5>
                    <div className="relative">
                      <pre className="bg-muted rounded-xl p-5 text-xs font-mono overflow-x-auto">
{`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的页面</title>
</head>
<body>
  <!-- 1. 设置 SDK 配置（可选） -->
  <script>
    window.SDK_CONFIG_YOUR_TOKEN = {
      // API 基础 URL（用于后端 API 调用）
      apiBaseUrl: '${currentDomain}/api',

      // API Key（用于 API 认证，在设置页面获取）
      apiKey: 'your-api-key-here',

      // 自定义业务数据
      custom: {
        userId: '12345',
        userName: '本地用户'
      }
    };
  </script>

  <!-- 2. 加载本地 SDK 文件 -->
  <script src="./static/js/sdk-xxx.js"></script>

  <!-- 3. SDK 容器 -->
  <div data-sdk-token="YOUR_TOKEN" style="width: 100%; min-height: 400px;"></div>
</body>
</html>`}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-lg shadow-sm"
                        onClick={() => handleCopy(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>我的页面</title>
</head>
<body>
  <!-- 1. 设置 SDK 配置（可选） -->
  <script>
    window.SDK_CONFIG_YOUR_TOKEN = {
      // API 基础 URL（用于后端 API 调用）
      apiBaseUrl: '${currentDomain}/api',

      // API Key（用于 API 认证，在设置页面获取）
      apiKey: 'your-api-key-here',

      // 自定义业务数据
      custom: {
        userId: '12345',
        userName: '本地用户'
      }
    };
  </script>
  
  <!-- 2. 加载本地 SDK 文件 -->
  <script src="./static/js/sdk-xxx.js"></script>
  
  <!-- 3. SDK 容器 -->
  <div data-sdk-token="YOUR_TOKEN" style="width: 100%; min-height: 400px;"></div>
</body>
</html>`, 'local-html')}
                      >
                        {copied === 'local-html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {/* 本地服务器 */}
                  <div>
                    <h5 className="font-medium mb-3">3. 启动本地服务器预览</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-muted rounded-xl p-5">
                        <h6 className="font-medium mb-3">Python</h6>
                        <pre className="text-xs font-mono bg-background rounded-lg p-4">
{`# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080`}
                        </pre>
                      </div>
                      <div className="bg-muted rounded-xl p-5">
                        <h6 className="font-medium mb-3">Node.js</h6>
                        <pre className="text-xs font-mono bg-background rounded-lg p-4">
{`# 安装 serve
npm install -g serve

# 启动服务
serve -p 8080`}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  {/* 本地引用 - React */}
                  <div>
                    <h5 className="font-medium mb-3">4. 在 React 项目中引用本地 SDK</h5>
                    <pre className="bg-muted rounded-xl p-5 text-xs font-mono overflow-x-auto">
{`// MyComponent.jsx
import React, { useEffect } from 'react';

export default function MyComponent() {
  const sdkToken = 'YOUR_TOKEN';

  useEffect(() => {
    // 设置 SDK 配置
    window.SDK_CONFIG_YOUR_TOKEN = {
      apiBaseUrl: '${currentDomain}/api',
      apiKey: 'your-api-key-here',
      custom: {
        userId: '12345',
        userName: '本地用户'
      }
    };

    // 动态加载本地 SDK 文件
    const script = document.createElement('script');
    script.src = './static/js/sdk-xxx.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // 清理
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div data-sdk-token={sdkToken} style={{ width: '100%', minHeight: '400px' }} />
  );
}`}
                    </pre>
                  </div>
                  
                  {/* 本地引用 - Vue */}
                  <div>
                    <h5 className="font-medium mb-3">5. 在 Vue 项目中引用本地 SDK</h5>
                    <pre className="bg-muted rounded-xl p-5 text-xs font-mono overflow-x-auto">
{`<template>
  <div data-sdk-token="YOUR_TOKEN" style="width: 100%; min-height: 400px;"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';

onMounted(() => {
  // 设置 SDK 配置
  window.SDK_CONFIG_YOUR_TOKEN = {
    apiBaseUrl: '${currentDomain}/api',
    apiKey: 'your-api-key-here',
    custom: {
      userId: '12345',
      userName: '本地用户'
    }
  };

  // 动态加载本地 SDK 文件
  const script = document.createElement('script');
  script.src = './static/js/sdk-xxx.js';
  script.async = true;
  document.body.appendChild(script);
});

onUnmounted(() => {
  // 清理
  const script = document.querySelector('script[src*="sdk-xxx.js"]');
  if (script) script.remove();
});
</script>`}
                    </pre>
                  </div>
                  
                  {/* 部署到服务器 */}
                  <div>
                    <h5 className="font-medium mb-3">6. 部署到自己的服务器</h5>
                    <pre className="bg-muted rounded-xl p-5 text-xs font-mono overflow-x-auto">
{`# 上传到服务器
scp -r ./static/js/sdk-xxx.js user@your-server:/var/www/html/static/js/

# Nginx 配置示例
server {
    listen 80;
    server_name your-domain.com;
    
    location /static/js/ {
        alias /var/www/html/static/js/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}`}
                    </pre>
                  </div>
                  
                  <Alert className="rounded-xl">
                    <Zap className="w-4 h-4" />
                    <AlertTitle>优势</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 space-y-2">
                        <li>完全离线使用，无需联网</li>
                        <li>部署到自己的服务器，数据更安全</li>
                        <li>可自定义 CDN 加速</li>
                        <li>支持内网环境使用</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl md:text-3xl font-bold text-center mb-12">快速入口</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <Link href="/ai-assistant">
              <Card className="hover:border-purple-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full p-6">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">AI 助手</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    创建智能对话SDK
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/sdk-list">
              <Card className="hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full p-6">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">SDK 列表</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    查看已创建的 SDK
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/models">
              <Card className="hover:border-green-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full p-6">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <Settings className="w-6 h-6 text-green-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold">模型配置</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    AI 模型设置
                  </p>
                </CardContent>
              </Card>
            </Link>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">SDK Share</h2>
                <p className="text-sm text-muted-foreground">组件分享平台</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">首页</Link>
              <Link href="/sdk-list" className="text-sm text-muted-foreground hover:text-primary transition-colors">SDK 列表</Link>
              <Link href="/ai-assistant" className="text-sm text-muted-foreground hover:text-primary transition-colors">AI 助手</Link>
              <Link href="/models" className="text-sm text-muted-foreground hover:text-primary transition-colors">模型配置</Link>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              <p>© 2026 SDK Share. 保留所有权利。</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
