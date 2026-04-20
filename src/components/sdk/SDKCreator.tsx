'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ChevronDown, ChevronUp, CheckCircle2, Code2, 
  FolderOpen, AlertCircle, Play, Plus, X,
  Code2Icon, Palette, Braces, Image, Edit3, FolderUp
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



interface SDKCreatorProps {
  onSuccess?: (data: { 
    id: string; 
    name: string; 
    share_token: string; 
    embed_code?: string;
  }) => void;
}

// 示例代码
const DEMO_FILES: { html: string; css: string; js: string } = {
  html: `<div class="sdk-float-btn" id="sdk-float-btn">
  <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20chinese%20child%20character%20cartoon%20style%20colorful%20illustration&image_size=square" alt="灵童" width="60" height="60" />
</div>
<div class="sdk-modal" id="sdk-modal">
  <div class="sdk-modal-content">
    <h2>欢迎使用灵童 SDK</h2>
    <p>这是一个灵童图片 + 弹窗的示例</p>
    <button class="sdk-close-btn" id="sdk-close-btn">关闭</button>
  </div>
</div>`,
  
  css: `.sdk-float-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 9999;
  overflow: hidden;
}
.sdk-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
.sdk-float-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sdk-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
.sdk-modal-content {
  background: white;
  padding: 32px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
.sdk-modal-content h2 {
  margin: 0 0 16px;
  color: #1a1a1a;
  font-size: 24px;
}
.sdk-modal-content p {
  margin: 0 0 24px;
  color: #666;
  font-size: 16px;
}
.sdk-close-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}
.sdk-close-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}`,
  
  js: `// SDK 初始化代码
// 可用变量: document, shadowRoot, sdk(工具), config(配置)

var floatBtn = document.querySelector('#sdk-float-btn');
var modal = document.querySelector('#sdk-modal');
var closeBtn = document.querySelector('#sdk-close-btn');

if (floatBtn && modal && closeBtn) {
  floatBtn.addEventListener('click', function() {
    modal.style.display = 'flex';
  });
  
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
}`
};

export function SDKCreator({ onSuccess }: SDKCreatorProps) {
  // 模式：manual = 手动编辑, upload = 文件上传
  const [mode, setMode] = useState<'manual' | 'upload'>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // 手动模式
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  
  // 上传模式
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  

  
  // 图片资源
  const [images, setImages] = useState<ImageResource[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [loading, setLoading] = useState(false);



  // 加载示例
  const loadDemo = () => {
    setHtml(DEMO_FILES.html);
    setCss(DEMO_FILES.css);
    setJs(DEMO_FILES.js);
    setName('悬浮按钮示例');
    setDescription('悬浮按钮 + 弹窗组件');
    setFiles([
      { path: 'index.html', content: DEMO_FILES.html, type: 'html' },
      { path: 'styles.css', content: DEMO_FILES.css, type: 'css' },
      { path: 'script.js', content: DEMO_FILES.js, type: 'js' },
    ]);
    toast.success('已加载示例代码');
  };

  // 清空
  const handleClear = () => {
    setHtml('');
    setCss('');
    setJs('');
    setName('');
    setDescription('');
    setFiles([]);
    setImages([]);
    setExpandedFile(null);
  };

  // 手动模式文件上传
  const handleManualFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  // 上传模式 - 拖拽
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const items = e.dataTransfer.files;
    Array.from(items).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['html', 'htm', 'css', 'js', 'jsx'].includes(ext || '')) {
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const type = ext === 'html' || ext === 'htm' ? 'html' : 
                     ext === 'css' ? 'css' : 'js';
        
        setFiles(prev => {
          if (prev.some(f => f.path === file.name)) {
            return prev.map(f => f.path === file.name ? { ...f, content, type } : f);
          }
          return [...prev, { path: file.name, content, type }];
        });
      };
      reader.readAsText(file);
    });
    
    toast.success('文件上传完成');
  }, []);

  // 上传模式 - 文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const codeFiles: File[] = [];
    const imageFiles: File[] = [];
    
    Array.from(selectedFiles).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['html', 'htm', 'css', 'js', 'jsx'].includes(ext || '')) {
        codeFiles.push(file);
      } else if (isImageFile(file.name)) {
        imageFiles.push(file);
      }
    });
    
    // 处理代码文件
    for (const file of codeFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const reader = new FileReader();
      
      await new Promise<void>((resolve) => {
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const type = ext === 'html' || ext === 'htm' ? 'html' : 
                       ext === 'css' ? 'css' : 'js';
          const path = (file as any).webkitRelativePath || file.name;
          
          setFiles(prev => {
            if (prev.some(f => f.path === path)) {
              return prev.map(f => f.path === path ? { ...f, content, type } : f);
            }
            return [...prev, { path, content, type }];
          });
          resolve();
        };
        reader.readAsText(file);
      });
    }
    
    // 处理图片
    const newImages: ImageResource[] = [];
    for (const file of imageFiles) {
      try {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} 超过 5MB 限制`);
          continue;
        }
        const path = (file as any).webkitRelativePath || file.name;
        const imageResource = await processImageFile(file, path);
        newImages.push(imageResource);
      } catch (error) {
        console.error(`处理图片失败: ${file.name}`, error);
      }
    }
    
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      toast.success(`已添加 ${newImages.length} 张图片`);
    }
    
    if (codeFiles.length > 0) {
      toast.success(`已添加 ${codeFiles.length} 个代码文件`);
    }
    
    e.target.value = '';
  };

  // 文件夹选择
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const folderName = (selectedFiles[0] as any).webkitRelativePath?.split('/')[0] || '项目';
    setName(folderName);
    
    await handleFileSelect(e);
  };

  // 上传模式 - 文件操作
  const updateFile = (path: string, content: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content } : f));
  };

  const removeFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
    if (expandedFile === path) setExpandedFile(null);
  };

  const addNewFile = (type: 'html' | 'css' | 'js') => {
    const extMap = { html: '.html', css: '.css', js: '.js' };
    const templateMap = {
      html: '<div class="sdk-container">\n  <!-- 你的内容 -->\n</div>',
      css: '/* 你的样式 */\n.sdk-container {\n  \n}',
      js: '// 你的逻辑\n(function(container, sdk) {\n  \n})();'
    };
    
    const existingCount = files.filter(f => f.type === type).length;
    const fileName = type === 'html' ? 'index' : 
                     type === 'css' ? 'styles' : 'script';
    const path = `${fileName}${existingCount > 0 ? existingCount + 1 : ''}${extMap[type]}`;
    
    setFiles(prev => [...prev, { path, content: templateMap[type], type }]);
    setExpandedFile(path);
  };

  // 图片上传（手动模式）
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
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }, []);

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交
  const handleSubmit = async () => {
    console.log('开始生成 SDK...');
    if (!name.trim()) {
      toast.error('请输入 SDK 名称');
      return;
    }

    let finalHtml = '';
    let finalCss = '';
    let finalJs = '';

    if (mode === 'manual') {
      finalHtml = html;
      finalCss = css;
      finalJs = js;
    } else {
      finalHtml = files.filter(f => f.type === 'html').map(f => f.content).join('\n');
      finalCss = files.filter(f => f.type === 'css').map(f => f.content).join('\n');
      finalJs = files.filter(f => f.type === 'js').map(f => f.content).join('\n');
    }

    if (!finalHtml.trim()) {
      toast.error('请输入 HTML 代码');
      return;
    }

    console.log('准备提交数据:', {
      name,
      description,
      hasHtml: !!finalHtml,
      hasCss: !!finalCss,
      hasJs: !!finalJs,
      hasImages: images.length > 0
    });

    setLoading(true);
    try {
      // 处理图片引用
      if (images.length > 0) {
        finalHtml = replaceImageRefsInHtml(finalHtml, images);
        finalCss = replaceImageRefsInCss(finalCss, images);
        console.log('图片引用处理完成');
      }

      console.log('开始请求 /api/sdk/project');
      const response = await fetch('/api/sdk/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          html: finalHtml,
          css: finalCss,
          js: finalJs,
          type: 'pure',
        }),
      });

      console.log('请求完成，状态码:', response.status);
      
      // 安全解析 JSON
      let data;
      try {
        data = await response.json();
      } catch (e) {
        const text = await response.text();
        throw new Error(text.substring(0, 200) || '服务器响应格式错误');
      }
      
      console.log('响应数据:', data);
      if (!response.ok) throw new Error(data.error || '创建失败');

      console.log('SDK 创建成功:', data.data);
      toast.success('SDK 创建成功');
      onSuccess?.(data.data);
    } catch (error) {
      console.error('创建 SDK 失败:', error);
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setLoading(false);
      console.log('提交过程完成');
    }
  };

  // 获取文件图标
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'html': return <Code2Icon className="w-4 h-4 text-orange-500" />;
      case 'css': return <Palette className="w-4 h-4 text-blue-500" />;
      case 'js': return <Braces className="w-4 h-4 text-yellow-500" />;
      default: return <FileCode className="w-4 h-4" />;
    }
  };



  return (
    <Card className="w-full rounded-2xl shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Code2 className="w-5 h-5 text-primary" />
          创建 SDK
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          输入或上传 HTML + CSS + JS 代码，生成可嵌入的 SDK
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* 模式切换 */}
        <div>
          <Label className="mb-3 text-sm font-medium">创建方式</Label>
          <div className="flex gap-3">
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('manual')}
              className="transition-all hover:shadow-md"
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              手动编辑
            </Button>
            <Button
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('upload')}
              className="transition-all hover:shadow-md"
            >
              <FolderUp className="w-4 h-4 mr-1.5" />
              文件上传
            </Button>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2 text-sm font-medium">SDK 名称 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的组件"
              className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <Label className="mb-2 text-sm font-medium">描述</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="组件描述"
              className="rounded-lg border-gray-200 focus:border-primary focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* 图片资源 */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white transition-all hover:shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Label className="flex items-center gap-2 font-medium">
              <Image className="w-4 h-4 text-primary" />
              图片资源 ({images.length})
            </Label>
            <label>
              <Button variant="outline" size="sm" asChild disabled={uploadingImage} className="transition-all hover:shadow-sm">
                <span>
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1.5" />
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
            <p className="text-sm text-muted-foreground bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200">
              上传的图片将转换为 base64 嵌入 SDK
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {images.map((img, index) => (
                <div 
                  key={index}
                  className="relative group flex items-center gap-3 bg-gray-50 rounded-lg p-3 pr-10 shadow-sm transition-all hover:shadow-md"
                >
                  <img 
                    src={img.dataUrl} 
                    alt={img.filename}
                    className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="text-xs min-w-0">
                    <p className="font-medium truncate max-w-[120px]">{img.filename}</p>
                    <p className="text-muted-foreground">
                      {(img.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-md hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 手动编辑模式 */}
        {mode === 'manual' && (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <span className="text-sm font-medium">代码编辑</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadDemo} className="transition-all hover:shadow-sm">
                  <Play className="w-4 h-4 mr-1.5" />
                  示例
                </Button>
                <label>
                  <Button variant="outline" size="sm" asChild className="transition-all hover:shadow-sm">
                    <span>
                      <Upload className="w-4 h-4 mr-1.5" />
                      上传
                    </span>
                  </Button>
                  <input type="file" className="hidden" accept=".html,.css,.js" onChange={handleManualFileUpload} />
                </label>
                <Button variant="outline" size="sm" onClick={handleClear} className="transition-all hover:shadow-sm">
                  清空
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full rounded-none border-b border-gray-200">
                <TabsTrigger value="html" className="flex-1 flex items-center gap-1.5 py-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                  <Code2Icon className="w-3.5 h-3.5" />
                  HTML *
                </TabsTrigger>
                <TabsTrigger value="css" className="flex-1 flex items-center gap-1.5 py-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                  <Palette className="w-3.5 h-3.5" />
                  CSS
                </TabsTrigger>
                <TabsTrigger value="js" className="flex-1 flex items-center gap-1.5 py-3 data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                  <Braces className="w-3.5 h-3.5" />
                  JS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="mt-0">
                <Textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder="输入 HTML 代码..."
                  className="font-mono text-sm min-h-[350px] rounded-none border-0 focus-visible:ring-0 bg-white"
                />
              </TabsContent>

              <TabsContent value="css" className="mt-0">
                <Textarea
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
                  placeholder="输入 CSS 样式..."
                  className="font-mono text-sm min-h-[350px] rounded-none border-0 focus-visible:ring-0 bg-white"
                />
              </TabsContent>

              <TabsContent value="js" className="mt-0">
                <Textarea
                  value={js}
                  onChange={(e) => setJs(e.target.value)}
                  placeholder="输入 JavaScript 代码..."
                  className="font-mono text-sm min-h-[350px] rounded-none border-0 focus-visible:ring-0 bg-white"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* 文件上传模式 */}
        {mode === 'upload' && (
          <>
            {/* 上传按钮 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <Button variant="default" className="w-full transition-all hover:shadow-md" asChild>
                  <span>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    选择文件夹
                  </span>
                </Button>
                <input 
                  type="file" 
                  className="hidden" 
                  // @ts-ignore
                  webkitdirectory="" 
                  directory="" 
                  multiple 
                  onChange={handleFolderSelect} 
                />
              </label>
              
              <label className="block">
                <Button variant="outline" className="w-full transition-all hover:shadow-md" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </span>
                </Button>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept=".html,.htm,.css,.js,image/*"
                  onChange={handleFileSelect} 
                />
              </label>
            </div>

            {/* 拖拽区域 */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragOver ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">拖拽文件到此处</p>
              <p className="text-xs text-muted-foreground">支持 .html, .css, .js 和图片文件</p>
            </div>

            {/* 文件列表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="flex items-center gap-2 font-medium">
                  <FileCode className="w-4 h-4 text-primary" />
                  文件列表 ({files.length})
                </Label>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => addNewFile('html')} className="hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />HTML
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => addNewFile('css')} className="hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />CSS
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => addNewFile('js')} className="hover:bg-gray-100">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />JS
                  </Button>
                  {files.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClear} className="hover:bg-gray-100">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(files.reduce((acc, f) => {
                    acc[f.type] = (acc[f.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)).map(([type, count]) => (
                    <Badge key={type} variant="outline" className="text-xs bg-gray-50 border-gray-200">
                      .{type}: {count}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                {files.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 border border-gray-200 rounded-xl bg-gray-50">
                    <Code2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">暂无文件</p>
                    <p className="text-xs text-muted-foreground mt-1">上传或新建文件开始</p>
                  </div>
                ) : (
                  files.map((file) => (
                    <div key={file.path} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md">
                      <div 
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(file.type)}
                          <span className="text-sm font-mono truncate">{file.path}</span>
                          <Badge variant="outline" className="text-xs shrink-0 bg-white border-gray-200">
                            {(file.content.length / 1024).toFixed(1)}KB
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => { e.stopPropagation(); removeFile(file.path); }}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); setExpandedFile(expandedFile === file.path ? null : file.path); }}
                          >
                            {expandedFile === file.path ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedFile === file.path && (
                        <div className="p-3 border-t border-gray-200">
                          <Textarea
                            value={file.content}
                            onChange={(e) => updateFile(file.path, e.target.value)}
                            className="font-mono text-sm min-h-[200px] rounded-lg border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* 说明 */}
        <Alert className="rounded-xl border-gray-200 bg-blue-50">
          <AlertCircle className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-sm">
            <strong>说明：</strong>
            HTML 为必填项，CSS 和 JS 可选。JS 代码会自动注入 container 和 sdk 参数。
          </AlertDescription>
        </Alert>

        {/* 提交按钮 */}
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !name || (mode === 'manual' ? !html : !files.some(f => f.type === 'html'))} 
          className="w-full py-6 text-base font-medium rounded-xl transition-all hover:shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              生成 SDK
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
