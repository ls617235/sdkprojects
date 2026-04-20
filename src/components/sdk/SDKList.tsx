'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, Search, Eye, Copy, Check, Loader2, 
  ExternalLink, Clock, Code, Braces, FileCode, Trash2, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { SDKPreview } from './SDKPreview';

interface SDKItem {
  id: string;
  name: string;
  description?: string;
  share_token: string;
  config?: {
    type?: string;
    model?: string;
    originalFramework?: string;
  };
  is_public: boolean;
  view_count?: number;
  created_at: string;
}

interface SDKListProps {
  onSelect?: (sdk: SDKItem) => void;
}

export function SDKList({ onSelect }: SDKListProps) {
  const [sdks, setSdks] = useState<SDKItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSDK, setSelectedSDK] = useState<SDKItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [embedType, setEmbedType] = useState<'html' | 'react' | 'vue'>('html');
  
  // 删除相关状态
  const [deleteSDK, setDeleteSDK] = useState<SDKItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 预览相关状态
  const [previewSDK, setPreviewSDK] = useState<SDKItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // 加载 SDK 列表
  const loadSDKs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);

      const res = await fetch(`/api/sdk-list?${params}`);
      const data = await res.json();
      if (data.success) {
        setSdks(data.data.list);
        setTotal(data.data.pagination.total);
      }
    } catch (error) {
      toast.error('加载 SDK 列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSDKs();
  }, [page]);

  // 搜索
  const handleSearch = () => {
    setPage(1);
    loadSDKs();
  };

  // 打开删除确认对话框
  const handleDeleteClick = (sdk: SDKItem) => {
    setDeleteSDK(sdk);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async (e?: React.MouseEvent) => {
    // 阻止对话框自动关闭
    e?.preventDefault();
    
    if (!deleteSDK) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/sdk-list?id=${deleteSDK.share_token}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || '删除成功');
        setDeleteDialogOpen(false);
        setDeleteSDK(null);
        // 重新加载列表
        loadSDKs();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 查看详情
  const handleView = (sdk: SDKItem) => {
    setSelectedSDK(sdk);
    setDetailOpen(true);
  };

  // 复制嵌入代码
  const handleCopy = (type: string) => {
    if (!selectedSDK) return;
    const code = generateEmbedCode(selectedSDK.share_token, selectedSDK.name, embedType);
    navigator.clipboard.writeText(code);
    setCopied(type);
    toast.success('已复制嵌入代码');
    setTimeout(() => setCopied(null), 2000);
  };

  // 生成嵌入代码（支持多种方式）
  const generateEmbedCode = (token: string, name: string, type: 'html' | 'react' | 'vue' = 'html') => {
    const configKey = `SDK_CONFIG_${token.slice(0, 8).toUpperCase()}`;
    const sdkName = name.replace(/[^a-zA-Z0-9]/g, '');
    
    switch (type) {
      case 'react':
        return `import { useEffect, useRef } from 'react';

// ${name} SDK React 组件
export function ${sdkName}SDK({ 
  config = {},
  width = '100%',
  height = '400px',
  onLoad,
  onError 
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 SDK 脚本
    const script = document.createElement('script');
    script.src = '/api/sdk/${token}/embed';
    script.async = true;
    
    // 设置配置
    window.${configKey} = {
      ...config,
      container: containerRef.current,
    };

    script.onload = () => {
      console.log('[${name} SDK] 加载成功');
      onLoad?.();
    };

    script.onerror = (err) => {
      console.error('[${name} SDK] 加载失败:', err);
      onError?.(err);
    };

    document.head.appendChild(script);

    return () => {
      // 清理脚本
      script.remove();
    };
  }, [config]);

  return (
    <div 
      ref={containerRef}
      data-sdk-token="${token}"
      style={{ width, minHeight: height }}
    />
  );
}

// 使用示例
// <${sdkName}SDK 
//   config={{ custom: { userId: '123' } }}
//   height="500px"
// />`;

      case 'vue':
        return `<!-- ${name} SDK Vue 组件 -->
<template>
  <div 
    ref="containerRef"
    :data-sdk-token="token"
    :style="{ width, minHeight: height }"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  },
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '400px'
  }
});

const emit = defineEmits(['load', 'error']);

const containerRef = ref(null);
const token = '${token}';
const configKey = '${configKey}';
let scriptEl = null;

onMounted(() => {
  loadSDK();
});

onUnmounted(() => {
  // 清理脚本
  if (scriptEl) {
    scriptEl.remove();
  }
});

watch(() => props.config, () => {
  // 更新配置
  window[configKey] = {
    ...props.config,
    container: containerRef.value
  };
}, { deep: true });

function loadSDK() {
  // 设置配置
  window[configKey] = {
    ...props.config,
    container: containerRef.value
  };

  // 加载脚本
  scriptEl = document.createElement('script');
  scriptEl.src = '/api/sdk/${token}/embed';
  scriptEl.async = true;

  scriptEl.onload = () => {
    console.log('[${name} SDK] 加载成功');
    emit('load');
  };

  scriptEl.onerror = (err) => {
    console.error('[${name} SDK] 加载失败:', err);
    emit('error', err);
  };

  document.head.appendChild(scriptEl);
}
</script>

<!-- 使用示例
<${sdkName}SDK 
  :config="{ custom: { userId: '123' } }"
  height="500px"
  @load="onSDKLoad"
  @error="onSDKError"
/>
-->`;

      default: // HTML
        return `<!-- ${name} SDK 嵌入代码 -->
<!-- 方式一：使用 data 属性配置（推荐，兼容性最好） -->
<div 
  data-sdk-token="${token}"
  data-sdk-config='{"custom": {"userId": "12345"}}'
  style="width: 100%; min-height: 400px;"
></div>
<script src="/api/sdk/${token}/embed" async></script>

<!-- 方式二：使用全局配置 -->
<script>
// 在加载 SDK 脚本前设置配置
window.${configKey} = {
  assetsBaseUrl: '',      // 资源基础 URL
  apiBaseUrl: '',         // API 基础 URL
  custom: {               // 自定义配置
    userId: '12345',
    userName: '张三'
  }
};
</script>
<script src="/api/sdk/${token}/embed" async></script>
<div data-sdk-token="${token}" style="width: 100%; min-height: 400px;"></div>

<!-- 方式三：动态加载 -->
<script>
(function() {
  var token = '${token}';
  var config = { custom: { userId: '12345' } };
  
  // 设置配置
  window['${configKey}'] = config;
  
  // 动态加载脚本
  var script = document.createElement('script');
  script.src = '/api/sdk/' + token + '/embed';
  script.async = true;
  document.head.appendChild(script);
  
  // 创建容器
  document.write('<div data-sdk-token="' + token + '" style="width:100%;min-height:400px;"></div>');
})();
</script>`;
    }
  };

  return (
    <>
      <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Package className="w-5 h-5 text-blue-500" />
                SDK 列表
              </CardTitle>
              <CardDescription className="text-gray-600">
                已创建的 SDK，点击查看嵌入代码
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索 SDK..."
                className="w-full md:w-64 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button variant="outline" onClick={handleSearch} className="rounded-lg transition-all hover:shadow-sm">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : sdks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">暂无 SDK</p>
              <p className="text-sm mt-2">创建您的第一个 SDK 开始使用</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow className="hover:bg-white">
                      <TableHead className="font-medium text-gray-700">名称</TableHead>
                      <TableHead className="font-medium text-gray-700">类型</TableHead>
                      <TableHead className="font-medium text-gray-700">模型</TableHead>
                      <TableHead className="font-medium text-gray-700">状态</TableHead>
                      <TableHead className="font-medium text-gray-700">创建时间</TableHead>
                      <TableHead className="font-medium text-gray-700 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sdks.map((sdk) => (
                      <TableRow key={sdk.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-gray-900 py-4">{sdk.name}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="rounded-full bg-white border-gray-200 text-gray-700">
                            {sdk.config?.type || 'standard'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          {sdk.config?.model && (
                            <Badge variant="secondary" className="rounded-full bg-gray-100 border-gray-200 text-gray-700">
                              {sdk.config.model}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          {sdk.is_public ? (
                            <Badge className="rounded-full bg-green-50 text-green-700 border border-green-100">
                              公开
                            </Badge>
                          ) : (
                            <Badge className="rounded-full bg-gray-50 text-gray-700 border border-gray-100">
                              私有
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(sdk.created_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setPreviewSDK(sdk);
                                setPreviewOpen(true);
                              }}
                              title="预览 SDK"
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full h-9 w-9"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleView(sdk)}
                              title="查看详情"
                              className="hover:bg-gray-100 rounded-full h-9 w-9"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              asChild
                              title="查看 SDK 文件"
                              className="hover:bg-gray-100 rounded-full h-9 w-9"
                            >
                              <a href={`/api/sdk/${sdk.share_token}/embed`} target="_blank">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteClick(sdk)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full h-9 w-9"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 分页 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 gap-4">
                <div className="text-sm text-gray-600 font-medium">
                  共 {total} 个 SDK
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-lg px-4 py-2 transition-all hover:shadow-sm disabled:opacity-50"
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sdks.length < 10}
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg px-4 py-2 transition-all hover:shadow-sm disabled:opacity-50"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border-gray-100 shadow-xl">
          <DialogHeader className="flex-shrink-0 bg-gray-50 border-b border-gray-100 p-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Code className="w-5 h-5 text-blue-500" />
              {selectedSDK?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedSDK?.description}
            </DialogDescription>
          </DialogHeader>

          {selectedSDK && (
            <div className="flex-1 overflow-auto space-y-6 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div>
                  <span className="text-gray-500 font-medium">Token:</span>
                  <code className="ml-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-mono text-gray-700">
                    {selectedSDK.share_token.slice(0, 16)}...
                  </code>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">类型:</span>
                  <Badge variant="outline" className="ml-2 rounded-full bg-white border-gray-200 text-gray-700">
                    {selectedSDK.config?.type || 'standard'}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-4">嵌入代码</h4>
                <Tabs value={embedType} onValueChange={(v) => setEmbedType(v as typeof embedType)}>
                  <TabsList className="grid w-full grid-cols-3 mb-4 rounded-lg border border-gray-200">
                    <TabsTrigger value="html" className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                      <Code className="w-4 h-4" />
                      HTML
                    </TabsTrigger>
                    <TabsTrigger value="react" className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                      <Braces className="w-4 h-4" />
                      React
                    </TabsTrigger>
                    <TabsTrigger value="vue" className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
                      <FileCode className="w-4 h-4" />
                      Vue
                    </TabsTrigger>
                  </TabsList>

                  {['html', 'react', 'vue'].map((type) => (
                    <TabsContent key={type} value={type} className="relative mt-0">
                      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-xs text-gray-400 ml-2 font-medium">
                              {type === 'html' ? 'index.html' : type === 'react' ? 'SDKComponent.tsx' : 'SDKComponent.vue'}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-300 hover:text-white h-8 w-8 rounded-full"
                            onClick={() => handleCopy(type)}
                          >
                            {copied === type ? 
                              <Check className="w-4 h-4 text-green-400" /> : 
                              <Copy className="w-4 h-4" />
                            }
                          </Button>
                        </div>
                        <pre className="p-5 text-sm font-mono text-gray-100 overflow-auto max-h-[400px] whitespace-pre-wrap">
                          {generateEmbedCode(selectedSDK.share_token, selectedSDK.name, type as typeof embedType)}
                        </pre>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  asChild
                  className="rounded-lg transition-all hover:shadow-sm"
                >
                  <a href={`/api/sdk/${selectedSDK.share_token}/embed`} target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    查看 SDK 文件
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-gray-100 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-gray-900">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              确定要删除 SDK <strong className="text-foreground">「{deleteSDK?.name}」</strong> 吗？
              <br />
              <span className="text-red-500 text-sm mt-2 block">此操作不可撤销，删除后将无法恢复。</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel disabled={deleting} className="rounded-lg px-4 py-2">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 rounded-lg px-4 py-2 transition-all hover:shadow-sm"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SDK 预览 */}
      {previewSDK && (
        <SDKPreview
          data={{
            id: previewSDK.id,
            name: previewSDK.name,
            share_token: previewSDK.share_token,
          }}
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewSDK(null);
          }}
        />
      )}
    </>
  );
}
