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
  ChevronDown, ChevronUp, CheckCircle2, Code2, 
  FolderOpen, AlertCircle, Sparkles, Plus, X,
  Code2Icon, Palette, Braces, Image
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



interface MultiFileCreatorProps {
  onSuccess?: (data: { 
    id: string; 
    name: string; 
    share_token: string; 
    embed_code?: string;
  }) => void;
}

export function MultiFileCreator({ onSuccess }: MultiFileCreatorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // 图片资源
  const [images, setImages] = useState<ImageResource[]>([]);



  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const items = e.dataTransfer.files;
    Array.from(items).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx'].includes(ext || '')) {
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

  // 文件选择（支持代码文件和图片）
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    
    const codeFiles: File[] = [];
    const imageFiles: File[] = [];
    
    // 分类文件
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
    
    // 处理图片文件
    const newImages: ImageResource[] = [];
    for (const file of imageFiles) {
      try {
        // 限制图片大小 (5MB)
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
      toast.success(`已添加 ${newImages.length} 张图片资源`);
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

  // 更新文件
  const updateFile = (path: string, content: string) => {
    setFiles(prev => prev.map(f => f.path === path ? { ...f, content } : f));
  };

  // 删除文件
  const removeFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
    if (expandedFile === path) setExpandedFile(null);
  };

  // 添加新文件
  const addNewFile = (type: 'html' | 'css' | 'js') => {
    const extMap = { html: '.html', css: '.css', js: '.js' };
    const templateMap = {
      html: '<div class="sdk-container">\n  <!-- 你的内容 -->\n</div>',
      css: '/* 你的样式 */\n.sdk-container {\n  \n}',
      js: '// 你的逻辑\n(function(container, sdk) {\n  \n})(arguments[0], arguments[1]);'
    };
    
    const existingCount = files.filter(f => f.type === type).length;
    const fileName = type === 'html' ? 'index' : 
                     type === 'css' ? 'styles' : 'script';
    const path = `${fileName}${existingCount > 0 ? existingCount + 1 : ''}${extMap[type]}`;
    
    setFiles(prev => [...prev, { path, content: templateMap[type], type }]);
    setExpandedFile(path);
  };

  // 清空
  const handleClear = () => {
    setFiles([]);
    setName('');
    setDescription('');
    setExpandedFile(null);
    setImages([]);
  };
  
  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入 SDK 名称');
      return;
    }

    const htmlFile = files.find(f => f.type === 'html');
    if (!htmlFile) {
      toast.error('至少需要一个 HTML 文件');
      return;
    }

    setLoading(true);
    try {
      // 合并所有文件
      let html = files.filter(f => f.type === 'html').map(f => f.content).join('\n');
      let css = files.filter(f => f.type === 'css').map(f => f.content).join('\n');
      const js = files.filter(f => f.type === 'js').map(f => f.content).join('\n');
      
      // 处理图片引用：将代码中的图片路径替换为 base64
      if (images.length > 0) {
        html = replaceImageRefsInHtml(html, images);
        css = replaceImageRefsInCss(css, images);
      }

      const response = await fetch('/api/sdk/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          html,
          css,
          js,
          type: 'pure',
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
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setLoading(false);
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          多文件上传
        </CardTitle>
        <CardDescription>
          上传多个 HTML、CSS、JS 文件，自动合并生成 SDK
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

        {/* 上传区域 */}
        <>
            {/* 上传按钮组 */}
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <Button variant="default" className="w-full" asChild>
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
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    选择文件
                  </span>
                </Button>
                <input 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept=".html,.htm,.css,.js"
                  onChange={handleFileSelect} 
                />
              </label>
            </div>
            
            {/* 拖拽区域 */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">拖拽文件到此处</p>
              <p className="text-xs text-muted-foreground mt-1">支持 .html, .css, .js 文件</p>
            </div>
            
            {/* 支持的文件类型 */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">.html</Badge>
              <Badge variant="secondary" className="text-xs">.css</Badge>
              <Badge variant="secondary" className="text-xs">.js</Badge>
            </div>
        </>

        {/* 文件列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              文件列表 ({files.length} 个)
            </Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => addNewFile('html')}>
                <Plus className="w-4 h-4 mr-1" />
                HTML
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addNewFile('css')}>
                <Plus className="w-4 h-4 mr-1" />
                CSS
              </Button>
              <Button variant="ghost" size="sm" onClick={() => addNewFile('js')}>
                <Plus className="w-4 h-4 mr-1" />
                JS
              </Button>
              {files.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 文件类型统计 */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Object.entries(files.reduce((acc, f) => {
                acc[f.type] = (acc[f.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  .{type}: {count}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {files.length === 0 ? (
              <div className="text-center text-muted-foreground py-6 border rounded-lg">
                <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>暂无文件</p>
                <p className="text-xs">上传或新建文件开始</p>
              </div>
            ) : (
              files.map((file) => (
                <div key={file.path} className="border rounded-lg overflow-hidden">
                  <div 
                    className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer hover:bg-muted/70"
                    onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(file.type)}
                      <span className="text-sm font-mono truncate">{file.path}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(file.content.length / 1024).toFixed(1)}KB
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); removeFile(file.path); }}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                      {expandedFile === file.path ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  {expandedFile === file.path && (
                    <div className="p-2 border-t">
                      <Textarea
                        value={file.content}
                        onChange={(e) => updateFile(file.path, e.target.value)}
                        className="font-mono text-xs min-h-[200px]"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 图片资源 */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                图片资源 ({images.length} 张)
              </Label>
              <Button variant="ghost" size="sm" onClick={() => setImages([])}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group border rounded-lg overflow-hidden">
                  <img 
                    src={img.dataUrl} 
                    alt={img.filename}
                    className="w-full h-20 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="p-1 text-xs truncate bg-muted">
                    {img.filename}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              图片将转换为 base64 嵌入 SDK，代码中使用文件名或路径引用即可
            </p>
          </div>
        )}

        {/* 说明 */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>说明：</strong>
            <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
              <li>多个同类文件会自动合并（HTML、CSS、JS 分别合并）</li>
              <li>HTML 文件至少需要一个</li>
              <li>CSS 类名建议添加 <code className="bg-muted px-1 rounded">sdk-</code> 前缀避免冲突</li>
              <li>上传文件夹时，图片会自动转换为 base64 嵌入</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 提交按钮 */}
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !name || !files.some(f => f.type === 'html')} 
          className="w-full"
        >
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
