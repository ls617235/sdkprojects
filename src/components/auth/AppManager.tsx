'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  AppWindow, Plus, Trash2, Loader2, FolderOpen, ExternalLink,
  Layers, Settings, MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, App } from '@/lib/api';

interface AppManagerProps {
  onAppSelect?: (app: App) => void;
  selectedAppId?: string;
}

// 预设场景
const SCENES = [
  { value: 'website', label: '网站', icon: '🌐' },
  { value: 'mobile', label: '移动应用', icon: '📱' },
  { value: 'miniprogram', label: '小程序', icon: '💬' },
  { value: 'admin', label: '管理后台', icon: '⚙️' },
  { value: 'other', label: '其他', icon: '📦' },
];

export function AppManager({ onAppSelect, selectedAppId }: AppManagerProps) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 创建表单
  const [appName, setAppName] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appScene, setAppScene] = useState('other');
  const [creating, setCreating] = useState(false);

  // 加载应用列表
  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await apiClient.listApps();
      if (result.success && result.data) {
        setApps(result.data);
      } else {
        toast.error(result.error || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, []);

  // 创建应用
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appName) {
      toast.error('请输入应用名称');
      return;
    }

    setCreating(true);
    try {
      const result = await apiClient.createApp({
        name: appName,
        type: appScene,
        description: appDescription || undefined,
        scene: appScene,
      });

      if (result.success && result.data) {
        toast.success('应用创建成功');
        loadApps();
        onAppSelect?.(result.data);
        setCreateDialogOpen(false);

        // 重置表单
        setAppName('');
        setAppDescription('');
        setAppScene('other');
      } else {
        toast.error(result.error || '创建失败');
      }
    } finally {
      setCreating(false);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  // 获取场景信息
  const getSceneInfo = (scene?: string) => {
    return SCENES.find(s => s.value === scene) || SCENES[SCENES.length - 1];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="h-5 w-5" />
              应用管理
            </CardTitle>
            <CardDescription>
              管理您的应用场景，每个应用可包含多个 SDK
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建应用
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AppWindow className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无应用</p>
            <p className="text-sm mt-1">创建应用以管理您的 SDK</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {apps.map((app) => {
              const sceneInfo = getSceneInfo(app.scene);
              const isSelected = app.id === selectedAppId;

              return (
                <div
                  key={app.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => onAppSelect?.(app)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{sceneInfo.icon}</span>
                      <div>
                        <h3 className="font-medium">{app.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {sceneInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {app.sdk_count || 0} SDK
                      </Badge>
                    </div>
                  </div>
                  {app.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>创建于 {formatDate(app.created_at)}</span>
                    {isSelected && (
                      <Badge className="text-xs">当前选中</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 创建应用对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>创建新应用</DialogTitle>
              <DialogDescription>
                创建应用以管理和组织您的 SDK
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-name">应用名称 *</Label>
                <Input
                  id="app-name"
                  placeholder="例如：官网、小程序、管理后台"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>应用场景</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SCENES.map((scene) => (
                    <div
                      key={scene.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        appScene === scene.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setAppScene(scene.value)}
                    >
                      <span className="text-lg mr-2">{scene.icon}</span>
                      <span className="text-sm">{scene.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app-description">描述（可选）</Label>
                <Textarea
                  id="app-description"
                  placeholder="应用简介"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
