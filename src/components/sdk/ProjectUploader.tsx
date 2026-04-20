'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, FileCode, FileText, FileType, X, Plus, Loader2, 
  ChevronDown, ChevronUp, Trash2, AlertCircle, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'css' | 'txt' | 'other';
}

interface ProjectUploaderProps {
  onSuccess?: (data: { id: string; name: string; share_token: string }) => void;
}

// 文件类型图标
const fileIcons: Record<string, React.ReactNode> = {
  tsx: <FileCode className="w-4 h-4 text-blue-500" />,
  ts: <FileCode className="w-4 h-4 text-blue-400" />,
  css: <FileType className="w-4 h-4 text-pink-500" />,
  txt: <FileText className="w-4 h-4 text-gray-500" />,
  md: <FileText className="w-4 h-4 text-gray-500" />,
  other: <FileText className="w-4 h-4 text-gray-400" />,
};

export function ProjectUploader({ onSuccess }: ProjectUploaderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [entryFile, setEntryFile] = useState('App.tsx');
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取文件类型
  const getFileType = (filename: string): ProjectFile['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'tsx') return 'tsx';
    if (ext === 'ts') return 'ts';
    if (ext === 'css') return 'css';
    if (ext === 'txt' || ext === 'md') return 'txt';
    return 'other';
  };

  // 处理文件上传
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    const newFiles: ProjectFile[] = [];

    Array.from(uploadedFiles).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const path = file.webkitRelativePath || file.name;
        
        setFiles(prev => {
          // 避免重复添加
          if (prev.some(f => f.path === path)) return prev;
          return [...prev, { path, content, type: getFileType(path) }];
        });
      };
      reader.readAsText(file);
    });

    // 清空 input
    e.target.value = '';
  }, []);

  // 添加单个文件（手动输入）
  const addManualFile = () => {
    const newFile: ProjectFile = {
      path: `NewFile.tsx`,
      content: `import React from 'react';\n\nexport default function Component() {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n}\n`,
      type: 'tsx',
    };
    setFiles(prev => [...prev, newFile]);
  };

  // 更新文件内容
  const updateFile = (path: string, field: 'path' | 'content', value: string) => {
    setFiles(prev => prev.map(f => 
      f.path === path ? { 
        ...f, 
        [field]: value,
        type: field === 'path' ? getFileType(value) : f.type 
      } : f
    ));
  };

  // 删除文件
  const removeFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path));
  };

  // 提交创建 SDK
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('请输入 SDK 名称');
      return;
    }

    if (files.length === 0) {
      toast.error('请至少添加一个文件');
      return;
    }

    // 检查入口文件是否存在
    const entryExists = files.some(f => 
      f.path === entryFile || 
      f.path.endsWith(entryFile)
    );
    if (!entryExists) {
      toast.error(`入口文件 ${entryFile} 不存在`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/sdk/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          files: files.map(f => ({ path: f.path, content: f.content })),
          entry: entryFile,
          externalDeps: ['react', 'react-dom'],
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

      if (!response.ok) {
        throw new Error(data.error || '创建失败');
      }

      toast.success('SDK 创建成功！');
      onSuccess?.(data.data);

      // 重置表单
      setName('');
      setDescription('');
      setFiles([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          上传 React 项目
        </CardTitle>
        <CardDescription>
          上传包含 TS/TSX/CSS/TXT 文件的 React 项目，自动打包成可嵌入的 JS SDK
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sdk-name">SDK 名称 *</Label>
            <Input
              id="sdk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="我的 React 组件"
            />
          </div>
          <div>
            <Label htmlFor="entry-file">入口文件</Label>
            <Input
              id="entry-file"
              value={entryFile}
              onChange={(e) => setEntryFile(e.target.value)}
              placeholder="App.tsx"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sdk-desc">描述</Label>
          <Textarea
            id="sdk-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="组件功能描述..."
            rows={2}
          />
        </div>

        {/* 文件上传区域 */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <Label>项目文件 ({files.length} 个)</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addManualFile}>
                <Plus className="w-4 h-4 mr-1" />
                添加文件
              </Button>
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-1" />
                    上传文件夹
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  // @ts-ignore - webkitdirectory 非标准但广泛支持
                  webkitdirectory=""
                  multiple
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {/* 文件列表 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {files.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>上传文件或点击"添加文件"开始</p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.path}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* 文件头部 */}
                  <div 
                    className="flex items-center justify-between p-2 bg-muted/50 cursor-pointer"
                    onClick={() => setExpandedFile(expandedFile === file.path ? null : file.path)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {fileIcons[file.type]}
                      <input
                        type="text"
                        value={file.path}
                        onChange={(e) => updateFile(file.path, 'path', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-none text-sm font-mono flex-1 outline-none"
                      />
                      <Badge variant="outline" className="text-xs">
                        {(file.content.length / 1024).toFixed(1)}KB
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {file.path === entryFile && (
                        <Badge className="text-xs bg-green-500">入口</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.path);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      {expandedFile === file.path ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* 文件内容编辑器 */}
                  {expandedFile === file.path && (
                    <div className="p-2 border-t">
                      <Textarea
                        value={file.content}
                        onChange={(e) => updateFile(file.path, 'content', e.target.value)}
                        className="font-mono text-sm min-h-[200px]"
                        placeholder="文件内容..."
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">注意事项：</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>入口文件需导出 React 组件（默认 App.tsx）</li>
              <li>React 和 ReactDOM 会自动外部化，由宿主系统提供</li>
              <li>CSS 文件会自动注入到页面</li>
              <li>TXT/MD 文件会转为常量导出</li>
            </ul>
          </div>
        </div>

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !name || files.length === 0}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              打包中...
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
