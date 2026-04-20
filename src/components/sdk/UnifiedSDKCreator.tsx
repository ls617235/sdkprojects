'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Upload, FileCode, Trash2, Loader2, 
  CheckCircle2, Code2, Play, Info, 
  Code2Icon, Palette, Braces, Image, X
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  isImageFile, 
  processImageFile, 
  ImageResource,
  replaceImageRefsInHtml,
  replaceImageRefsInCss,
} from '@/lib/image-utils';

interface ProjectFile {
  path: string;
  content: string;
  type: 'html' | 'css' | 'js' | 'other';
}



interface UnifiedSDKCreatorProps {
  onSuccess?: (data: { 
    id: string; 
    name: string; 
    share_token: string; 
    embed_code?: string;
  }) => void;
}

// 示例代码：纯 HTML + CSS + JS
const DEMO_FILES: { html: string; css: string; js: string } = {
  html: `<div class="sdk-counter-widget">
  <h2 class="sdk-title">计数器组件</h2>
  <div class="sdk-counter">
    <button class="sdk-btn sdk-btn-minus">-</button>
    <span class="sdk-count">0</span>
    <button class="sdk-btn sdk-btn-plus">+</button>
  </div>
  <p class="sdk-hint">点击按钮增减计数</p>
</div>`,
  
  css: `.sdk-counter-widget {
  font-family: system-ui, -apple-system, sans-serif;
  padding: 24px;
  max-width: 300px;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  text-align: center;
}

.sdk-title {
  color: white;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.sdk-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.15);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.sdk-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: white;
  color: #667eea;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sdk-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.sdk-btn:active {
  transform: scale(0.95);
}

.sdk-count {
  font-size: 32px;
  font-weight: bold;
  color: white;
  min-width: 60px;
}

.sdk-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  margin: 16px 0 0 0;
}`,
  
  js: `// SDK 初始化代码
// 可用变量: document(代理), mountPoint(容器), shadowRoot, sdk(工具), config(配置)

// 初始化计数
let count = 0;

// 获取配置
const initialCount = sdk?.get('initialCount', 0);
const step = sdk?.get('step', 1);

count = initialCount;

// 获取元素 - 使用 mountPoint 查找
const countEl = mountPoint.querySelector('.sdk-count');
const minusBtn = mountPoint.querySelector('.sdk-btn-minus');
const plusBtn = mountPoint.querySelector('.sdk-btn-plus');

// 更新显示
function updateDisplay() {
  countEl.textContent = count;
}

// 绑定事件
minusBtn.addEventListener('click', function() {
  count -= step;
  updateDisplay();
});

plusBtn.addEventListener('click', function() {
  count += step;
  updateDisplay();
});

// 初始化
updateDisplay();`
};

export function UnifiedSDKCreator({ onSuccess }: UnifiedSDKCreatorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(false);
  
  // 图片资源
  const [images, setImages] = useState<ImageResource[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);



  // 加载示例代码
  const loadDemo = () => {
    setHtml(DEMO_FILES.html);
    setCss(DEMO_FILES.css);
    setJs(DEMO_FILES.js);
    setName('计数器组件');
    setDescription('一个简单的计数器组件，支持增减计数');
    toast.success('已加载示例代码');
  };

  // 清空
  const handleClear = () => {
    setHtml('');
    setCss('');
    setJs('');
    setName('');
    setDescription('');
    setImages([]);
  };

  // 上传代码文件
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      if (ext === 'html' || ext === 'htm') {
        setHtml(content);
        if (!name) setName(file.name.replace(/\.(html|htm)$/, ''));
      } else if (ext === 'css') {
        setCss(content);
      } else if (ext === 'js' || ext === 'javascript') {
        setJs(content);
      } else {
        toast.error('仅支持 .html, .css, .js 文件');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [name]);

  // 上传图片
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImages: ImageResource[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!isImageFile(file.name)) {
          toast.error(`${file.name} 不是有效的图片文件`);
          continue;
        }

        // 限制图片大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} 超过 5MB 限制`);
          continue;
        }

        const imageResource = await processImageFile(file, '/images');
        newImages.push(imageResource);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        toast.success(`已添加 ${newImages.length} 张图片`);
      }
    } catch (error) {
      toast.error('图片处理失败');
      console.error(error);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }, []);

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交创建 SDK
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入 SDK 名称');
      return;
    }

    if (!html.trim()) {
      toast.error('请输入 HTML 代码');
      return;
    }

    setLoading(true);

    try {
      // 处理图片引用：将代码中的图片路径替换为 base64
      let processedHtml = html;
      let processedCss = css;
      
      if (images.length > 0) {
        processedHtml = replaceImageRefsInHtml(html, images);
        processedCss = replaceImageRefsInCss(css, images);
      }

      const response = await fetch('/api/sdk/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          html: processedHtml,
          css: processedCss,
          js,
          type: 'pure',
          images: images.map(img => ({
            filename: img.filename,
            path: img.path,
            mimeType: img.mimeType,
            base64: img.base64,
            dataUrl: img.dataUrl,
            size: img.size,
          })),
        }),
      });

      // 安全解析 JSON
      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        throw new Error(text.substring(0, 200) || '服务器响应格式错误');
      }

      if (!response.ok) throw new Error(data.error || '创建失败');

      toast.success('SDK 创建成功');
      onSuccess?.(data.data);
    } catch (error) {
      // 检查是否是网络错误或非JSON响应
      if (error instanceof SyntaxError) {
        toast.error('服务器响应格式错误，请稍后重试');
      } else {
        toast.error(error instanceof Error ? error.message : '创建失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="w-5 h-5" />
          创建 SDK
        </CardTitle>
        <CardDescription>
          上传或输入纯 HTML + CSS + JS 代码，生成可嵌入的 SDK
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">


        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>SDK 名称 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的组件"
            />
          </div>
          <div>
            <Label>描述</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="组件描述"
            />
          </div>
        </div>

        {/* 图片资源上传 */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              图片资源
            </Label>
            <label>
              <Button variant="outline" size="sm" asChild disabled={uploadingImage}>
                <span>
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1" />
                      上传图片
                    </>
                  )}
                </span>
              </Button>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleImageUpload} 
                disabled={uploadingImage}
              />
            </label>
          </div>
          
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无图片，上传的图片将转换为 base64 嵌入到 SDK 中
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {images.map((img, index) => (
                <div 
                  key={index}
                  className="relative group flex items-center gap-2 bg-muted rounded-lg p-2 pr-8"
                >
                  <img 
                    src={img.dataUrl} 
                    alt={img.filename}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="text-xs">
                    <p className="font-medium truncate max-w-[100px]">{img.filename}</p>
                    <p className="text-muted-foreground">
                      {(img.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {images.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              提示：代码中使用图片文件名（如 src="{images[0]?.filename}"）将自动替换为 base64
            </p>
          )}
        </div>

        {/* 代码编辑区 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
            <span className="text-sm font-medium">代码编辑</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadDemo}>
                <Play className="w-4 h-4 mr-1" />
                加载示例
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    上传
                  </span>
                </Button>
                <input type="file" className="hidden" accept=".html,.css,.js" onChange={handleFileUpload} />
              </label>
              <Button variant="outline" size="sm" onClick={handleClear}>
                清空
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="html" className="flex-1 flex items-center gap-1">
                <Code2Icon className="w-3 h-3" />
                HTML *
              </TabsTrigger>
              <TabsTrigger value="css" className="flex-1 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                CSS
              </TabsTrigger>
              <TabsTrigger value="js" className="flex-1 flex items-center gap-1">
                <Braces className="w-3 h-3" />
                JavaScript
              </TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="mt-0">
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="输入 HTML 代码..."
                className="font-mono text-xs min-h-[300px] rounded-none border-0 focus-visible:ring-0"
              />
            </TabsContent>

            <TabsContent value="css" className="mt-0">
              <Textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                placeholder="输入 CSS 样式..."
                className="font-mono text-xs min-h-[300px] rounded-none border-0 focus-visible:ring-0"
              />
            </TabsContent>

            <TabsContent value="js" className="mt-0">
              <Textarea
                value={js}
                onChange={(e) => setJs(e.target.value)}
                placeholder="输入 JavaScript 代码..."
                className="font-mono text-xs min-h-[300px] rounded-none border-0 focus-visible:ring-0"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* 说明 */}
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            <strong>说明：</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
              <li>HTML：组件的 HTML 结构，必填</li>
              <li>CSS：组件样式，所有类名建议添加 <code className="bg-muted px-1 rounded">sdk-</code> 前缀避免冲突</li>
              <li>JavaScript：组件逻辑，封装为 IIFE，接收 container 和 sdk 两个参数</li>
              <li>图片：上传的图片将转换为 base64 嵌入 SDK，无需外部依赖</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 提交按钮 */}
        <Button onClick={handleSubmit} disabled={loading || !name || !html} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              生成 SDK
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
