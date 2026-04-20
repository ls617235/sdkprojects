'use client';

import { useState } from 'react';
import { X, Copy, Check, Download, Code, Braces, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getEmbedScriptUrl, getSDKPlatformUrl, getEmbedCodeBaseUrl } from '@/lib/sdk-url';

interface SDKResultProps {
  data: {
    id: string;
    name: string;
    share_token: string;
    framework?: string;
    embed_code?: string;
    detected_deps?: string[];
    warnings?: string[];
  
  };
  onClose?: () => void;
}

export function SDKResult({ data, onClose }: SDKResultProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [embedType, setEmbedType] = useState<'html' | 'react' | 'vue2' | 'vue3'>('html');

  const embedCode = data.embed_code || '';
  const displayToken = data.share_token 
    ? data.share_token.slice(0, 8) + '****' + data.share_token.slice(-4) 
    : '未生成';
  const sdkType = 'original';

  const handleCopy = async (type: string) => {
    const code = generateEmbedCode(embedType);
    await navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = async () => {
    // 下载 JS SDK 文件
    if (!data.share_token) {
      toast.error('SDK token 不可用，无法下载');
      return;
    }
    try {
      const response = await fetch(`/api/sdk/${data.share_token}/embed`);
      const jsCode = await response.text();
      const blob = new Blob([jsCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/[^a-zA-Z0-9]/g, '-')}-sdk.js`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('已下载 SDK 文件');
    } catch (error) {
      toast.error('下载失败');
    }
  };

  // 生成嵌入代码（支持多种方式）
  const generateEmbedCode = (type: 'html' | 'react' | 'vue2' | 'vue3' = 'html') => {
    const token = data.share_token || '';
    const name = data.name || 'SDK';
    const configKey = token ? `SDK_CONFIG_${token.slice(0, 8).toUpperCase()}` : 'SDK_CONFIG_DEFAULT';
    const sdkName = name.replace(/[^a-zA-Z0-9]/g, '');
    // 使用 getEmbedCodeBaseUrl 确保生成完整的 URL（优先使用环境变量配置的地址）
    const baseUrl = getEmbedCodeBaseUrl();
    const embedScriptUrl = `${baseUrl}/api/sdk/${token}/embed`;
    const apiBaseUrl = baseUrl;

    switch (type) {
      case 'react':
        return `import { useEffect, useRef } from 'react';

export function ${sdkName}SDK({ config = {}, width = '100%', height = '400px', onLoad, onError }) {
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

      case 'vue2':
        return `<template>
  <div ref="containerRef" :data-sdk-token="token" :style="{ width, minHeight: height }" />
</template>

<script>
export default {
  name: '${sdkName}SDK',
  props: {
    config: { type: Object, default: () => ({}) },
    width: { type: String, default: '100%' },
    height: { type: String, default: '400px' }
  },
  data() {
    return {
      token: '${token}',
      configKey: '${configKey}',
      scriptEl: null
    };
  },
  mounted() {
    // SDK 配置
    window[this.configKey] = {
      ...this.config,
      container: this.$refs.containerRef,
      // API 配置（可选）
      apiBaseUrl: this.config.apiBaseUrl || '${apiBaseUrl}',
      apiKey: this.config.apiKey || '',
      // 自定义配置
      custom: {
        userId: this.config.userId || '',
        userName: this.config.userName || '',
        environment: this.config.environment || 'production',
        ...this.config.custom
      }
    };

    this.scriptEl = document.createElement('script');
    this.scriptEl.src = '${embedScriptUrl}';
    this.scriptEl.async = true;
    this.scriptEl.onload = () => this.$emit('load');
    this.scriptEl.onerror = (err) => this.$emit('error', err);
    document.head.appendChild(this.scriptEl);
  },
  beforeDestroy() {
    if (this.scriptEl) {
      this.scriptEl.remove();
    }
  }
};

<\/script>`;

      case 'vue3':
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

<\/script>`;

      default: // HTML
        // 如果有原始嵌入代码，直接返回
        if (embedCode) {
          return embedCode;
        }
        // 简洁的直接可用代码
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

    // HTML 标签
    processed = processed.replace(/(&lt;\/?(?:script|style|div|template|span|meta|link|head|body|html|iframe|button|input|select|option|label|form|p|h[1-6]|ul|ol|li|a|img|table|tr|td|th))/g, (match) => addPlaceholder(`<span class="text-blue-600">${match}</span>`));
    processed = processed.replace(/(\/?(?:script|style|div|template|span|meta|link|head|body|html|iframe|button|input|select|option|label|form|p|h[1-6]|ul|ol|li|a|img|table|tr|td|th)&gt;)/g, (match) => addPlaceholder(`<span class="text-blue-600">${match}</span>`));

    // 属性名
    processed = processed.replace(/\s(id|class|src|href|type|data-[a-z-]+|ref|:data-sdk-token|:style|:ref|v-bind|v-on|@|@click|@load|@error)=/g, (match) => addPlaceholder(`<span class="text-orange-600">${match}</span>`));

    // Vue 特有关键字
    processed = processed.replace(/\b(defineProps|defineEmits|ref|onMounted|onUnmounted|reactive|computed|watch|toRefs)\b/g, (match) => addPlaceholder(`<span class="text-purple-600 font-medium">${match}</span>`));

    // JavaScript 关键字
    processed = processed.replace(/\b(const|let|var|function|return|new|if|else|async|await|import|export|from|default|props|emit|containerRef|token|configKey|scriptEl|null|onLoad|onError|this)\b/g, (match) => addPlaceholder(`<span class="text-purple-600 font-medium">${match}</span>`));

    // 字符串
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

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">{data.name}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 说明区域 */}
      <div className="px-5 py-4 space-y-3 border-b border-gray-100 bg-gray-50/50">
        <p className="text-sm text-gray-600 leading-relaxed">
          该SDK为原始HTML/CSS/JS代码，已通过打包处理生成可直接嵌入的代码。
        </p>

        {/* Token 和类型 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Token:</span>
            <code className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono text-xs">
              {displayToken}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">类型:</span>
            <Badge 
              variant="outline" 
              className="font-normal border-gray-300 text-gray-700 bg-gray-50"
            >
              original
            </Badge>
          </div>
        </div>

        {/* 检测到的依赖 */}
        {data.detected_deps && data.detected_deps.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">依赖:</span>
            <div className="flex flex-wrap gap-1">
              {data.detected_deps.slice(0, 5).map((dep) => (
                <Badge key={dep} variant="secondary" className="text-xs font-normal">
                  {dep}
                </Badge>
              ))}
              {data.detected_deps.length > 5 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  +{data.detected_deps.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 警告信息 */}
        {data.warnings && data.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-1">注意事项</p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              {data.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 嵌入代码展示区 */}
      <div className="p-5">
        <Tabs value={embedType} onValueChange={(v) => setEmbedType(v as typeof embedType)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="html" className="flex items-center gap-1">
              <Code className="w-3 h-3" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="react" className="flex items-center gap-1">
              <Braces className="w-3 h-3" />
              React
            </TabsTrigger>
            <TabsTrigger value="vue2" className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              Vue 2
            </TabsTrigger>
            <TabsTrigger value="vue3" className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              Vue 3
            </TabsTrigger>
          </TabsList>

          {['html', 'react', 'vue2', 'vue3'].map((type) => (
            <TabsContent key={type} value={type}>
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-gray-400 ml-2">
                      {type === 'html' ? 'embed.html' : type === 'react' ? 'SDKComponent.tsx' : type === 'vue2' ? 'SDKComponentVue2.vue' : 'SDKComponentVue3.vue'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-300 hover:text-white h-7"
                    onClick={() => handleCopy(type)}
                  >
                    {copied === type ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="p-4 overflow-auto max-h-[400px]">
                  <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap leading-relaxed">
                    <code 
                      dangerouslySetInnerHTML={{ 
                        __html: formatCodeForDisplay(generateEmbedCode(type as typeof embedType)) 
                      }} 
                    />
                  </pre>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 mt-4">
          <Button 
            onClick={handleDownload}
            variant="default"
            size="sm"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            下载 SDK
          </Button>
          <Button 
            onClick={() => handleCopy(embedType)}
            variant="outline"
            size="sm"
          >
            {copied === embedType ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            复制代码
          </Button>
        </div>
      </div>
    </div>
  );
}
