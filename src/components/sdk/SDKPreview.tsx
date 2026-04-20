'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Eye, Code, Copy, Check, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { getEmbedScriptUrl, getSDKPlatformUrl } from '@/lib/sdk-url';
import { getApiBaseUrl } from '@/lib/api';

interface SDKPreviewProps {
  data: {
    id: string;
    name: string;
    share_token: string;
    embed_code?: string;
    html?: string;
    css?: string;
    js?: string;
  };
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'preview' | 'code';

// 简单的代码语法高亮 - 使用占位符避免嵌套替换
const highlightCode = (code: string) => {
  // 使用占位符，避免嵌套替换
  const placeholders = new Map();
  let counter = 0;

  const addPlaceholder = (html: string) => {
    const key = `__PH${counter++}__`;
    placeholders.set(key, html);
    return key;
  };

  // 1. 先转义 HTML，然后使用占位符替换需要高亮的部分
  let processed = code;

  // 注释
  processed = processed.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (match) => addPlaceholder(`<span class="text-gray-400">${match}</span>`));

  // HTML 标签（脚本、样式等）
  processed = processed.replace(/(&lt;\/?(?:script|style|div|template|span|meta|link|head|body|html|iframe|button|input|select|option|label|form|p|h[1-6]|ul|ol|li|a|img|table|tr|td|th))/g, (match) => addPlaceholder(`<span class="text-blue-600">${match}</span>`));
  processed = processed.replace(/(\/?(?:script|style|div|template|span|meta|link|head|body|html|iframe|button|input|select|option|label|form|p|h[1-6]|ul|ol|li|a|img|table|tr|td|th)&gt;)/g, (match) => addPlaceholder(`<span class="text-blue-600">${match}</span>`));

  // 属性名（排除已经被替换的）
  processed = processed.replace(/\s(id|class|src|href|type|data-[a-z-]+|ref|:data-sdk-token|:style|:ref|v-bind|v-on|@|@click|@load|@error)=/g, (match) => addPlaceholder(`<span class="text-orange-600">${match}</span>`));

  // Vue 特有关键字
  processed = processed.replace(/\b(defineProps|defineEmits|ref|onMounted|onUnmounted|reactive|computed|watch|toRefs)\b/g, (match) => addPlaceholder(`<span class="text-purple-600 font-medium">${match}</span>`));

  // JavaScript 关键字
  processed = processed.replace(/\b(const|let|var|function|return|new|if|else|async|await|import|export|from|default|props|emit|containerRef|token|configKey|scriptEl|null|onLoad|onError|this)\b/g, (match) => addPlaceholder(`<span class="text-purple-600 font-medium">${match}</span>`));

  // 字符串（双引号和单引号）
  processed = processed.replace(/"([^"]*)"/g, (match, content) => addPlaceholder(`<span class="text-green-600">"${content}"</span>`));
  processed = processed.replace(/'([^']*)'/g, (match, content) => addPlaceholder(`<span class="text-green-600">'${content}'</span>`));

  // 数字
  processed = processed.replace(/\b(\d+)\b/g, (match) => addPlaceholder(`<span class="text-amber-600">${match}</span>`));

  // 2. 替换占位符为实际的 HTML
  placeholders.forEach((html, key) => {
    processed = processed.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), html);
  });

  return processed;
};

const formatCodeForDisplay = (code: string) => {
  return highlightCode(code
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  );
};

// 代码显示组件
function CodeDisplay({
  envType,
  generateEmbedCode,
  formatCodeForDisplay,
  copied,
  handleCopy
}: {
  envType: 'html' | 'react' | 'vue';
  generateEmbedCode: (type: 'html' | 'react' | 'vue') => string;
  formatCodeForDisplay: (code: string) => string;
  copied: string | null;
  handleCopy: () => void;
}) {
  const getFileName = () => {
    switch (envType) {
      case 'html': return 'embed.html';
      case 'react': return 'SDKComponent.tsx';
      case 'vue': return 'SDKComponent.vue';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 bg-gray-100">
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400 ml-2">{getFileName()}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-300 hover:text-white h-7"
              onClick={handleCopy}
            >
              {copied === envType ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="p-4 overflow-auto max-h-[calc(85vh-240px)]">
            <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap leading-relaxed">
              <code
                dangerouslySetInnerHTML={{
                  __html: formatCodeForDisplay(generateEmbedCode(envType))
                }}
              />
            </pre>
          </div>
        </div>
      </div>
      <div className="p-4 border-t bg-gray-50 shrink-0">
        <Button onClick={handleCopy}>
          {copied === envType ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied === envType ? '已复制' : '复制代码'}
        </Button>
      </div>
    </div>
  );
}

export function SDKPreview({ data, open, onClose }: SDKPreviewProps) {
  const [envType, setEnvType] = useState<'html' | 'react' | 'vue'>('html');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [copied, setCopied] = useState<string | null>(null);

  const token = data.share_token || '';
  const name = data.name || 'SDK';
  const configKey = token ? `SDK_CONFIG_${token.slice(0, 8).toUpperCase()}` : 'SDK_CONFIG_DEFAULT';

  // 生成嵌入代码
  const generateEmbedCode = (type: 'html' | 'react' | 'vue') => {
    const embedScriptUrl = getEmbedScriptUrl(token);
    const apiBaseUrl = getSDKPlatformUrl(); // 使用 SDK 平台的 URL 作为 API 基础 URL

    switch (type) {
      case 'react':
        return `import { useEffect, useRef } from 'react';

export function ${name.replace(/[^a-zA-Z0-9]/g, '')}SDK({ config = {}, width = '100%', height = '400px', onLoad, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // SDK 配置
    window.${configKey} = {
      ...config,
      container: containerRef.current,
      // API 配置（可选）
      apiBaseUrl: config.apiBaseUrl || '${apiBaseUrl}',
      apiKey: config.apiKey || '',
      // 自定义配置
      custom: {
        userId: config.userId || '',
        userName: config.userName || '',
        environment: config.environment || 'production',
        ...config.custom
      }
    };

    const script = document.createElement('script');
    script.src = '${embedScriptUrl}';
    script.async = true;
    script.onload = () => onLoad?.();
    script.onerror = (err) => onError?.(err);
    document.head.appendChild(script);

    return () => script.remove();
  }, [config]);

  return <div ref={containerRef} data-sdk-token="${token}" style={{ width, minHeight: height }} />;
}`;

      case 'vue':
        return `<template>
  <div ref="containerRef" :data-sdk-token="token" :style="{ width, minHeight: height }" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  config: { type: Object, default: () => ({}) },
  width: { type: String, default: '100%' },
  height: { type: String, default: '400px' }
});

const emit = defineEmits(['load', 'error']);
const containerRef = ref(null);
const token = '${token}';
const configKey = '${configKey}';
let scriptEl = null;

onMounted(() => {
  // SDK 配置
  window[configKey] = {
    ...props.config,
    container: containerRef.value,
    // API 配置（可选）
    apiBaseUrl: props.config.apiBaseUrl || '${apiBaseUrl}',
    apiKey: props.config.apiKey || '',
    // 自定义配置
    custom: {
      userId: props.config.userId || '',
      userName: props.config.userName || '',
      environment: props.config.environment || 'production',
      ...props.config.custom
    }
  };

  scriptEl = document.createElement('script');
  scriptEl.src = '${embedScriptUrl}';
  scriptEl.async = true;
  scriptEl.onload = () => emit('load');
  scriptEl.onerror = (err) => emit('error', err);
  document.head.appendChild(scriptEl);
});

onUnmounted(() => scriptEl?.remove());
</script>`;

      default:
        return `<!-- ${name} SDK 嵌入代码 -->
<!-- 配置 SDK -->
<script>
window.${configKey} = {
  // API 配置（可选）
  apiBaseUrl: '${apiBaseUrl}',
  apiKey: '',

  // 自定义配置
  custom: {
    userId: '',
    userName: '',
    environment: 'production'
  },

  // 其他配置
  useShadowDOM: true
};
<\/script>

<!-- SDK 容器 -->
<div data-sdk-token="${token}" style="width:100%;min-height:400px;"></div>

<!-- 加载 SDK 脚本 -->
<script src="${embedScriptUrl}" async><\/script>`;
    }
  };

  // 复制代码
  const handleCopy = async () => {
    const code = generateEmbedCode(envType);
    await navigator.clipboard.writeText(code);
    setCopied(envType);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(null), 2000);
  };

  // 在新窗口打开预览
  const openInNewWindow = () => {
    if (!token) {
      toast.error('SDK token 不可用，无法预览');
      return;
    }
    window.open(`/sdk/${token}/preview`, '_blank', 'width=1200,height=800');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">{name} - SDK 预览</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openInNewWindow}>
              <ExternalLink className="w-4 h-4 mr-2" />
              新窗口打开
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2"
            >
              ×
            </button>
          </div>
        </div>

        {/* 视图切换 */}
        <div className="flex items-center justify-between px-6 py-2 bg-gray-50 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="w-4 h-4 mr-1" />
              效果预览
            </Button>
            <Button
              variant={viewMode === 'code' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('code')}
            >
              <Code className="w-4 h-4 mr-1" />
              嵌入代码
            </Button>
          </div>

          {viewMode === 'code' && (
            <Tabs value={envType} onValueChange={(v) => setEnvType(v as typeof envType)}>
              <TabsList className="h-8">
                <TabsTrigger value="html" className="text-xs px-3">HTML</TabsTrigger>
                <TabsTrigger value="react" className="text-xs px-3">React</TabsTrigger>
                <TabsTrigger value="vue" className="text-xs px-3">Vue</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 relative min-h-0">
          {viewMode === 'preview' ? (
            <iframe
              key={`preview-${token}-${Date.now()}`}
              src={token ? `/api/sdk/${token}/preview?t=${Date.now()}` : 'about:blank'}
              className="absolute inset-0 w-full h-full border-0"
              title="SDK Preview"
              allow="clipboard-write"
            />
          ) : (
            <Tabs value={envType} onValueChange={(v) => setEnvType(v as typeof envType)} className="h-full">
              <TabsContent value="html" className="mt-0 h-full">
                <CodeDisplay envType="html" generateEmbedCode={generateEmbedCode} formatCodeForDisplay={formatCodeForDisplay} copied={copied} handleCopy={handleCopy} />
              </TabsContent>
              <TabsContent value="react" className="mt-0 h-full">
                <CodeDisplay envType="react" generateEmbedCode={generateEmbedCode} formatCodeForDisplay={formatCodeForDisplay} copied={copied} handleCopy={handleCopy} />
              </TabsContent>
              <TabsContent value="vue" className="mt-0 h-full">
                <CodeDisplay envType="vue" generateEmbedCode={generateEmbedCode} formatCodeForDisplay={formatCodeForDisplay} copied={copied} handleCopy={handleCopy} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
