'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff, Clock, 
  Shield, Zap, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, APIKey, APIKeyCreateResult } from '@/lib/api';

interface APIKeyManagerProps {
  onKeyCreated?: (key: APIKeyCreateResult) => void;
}

export function APIKeyManager({ onKeyCreated }: APIKeyManagerProps) {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<APIKeyCreateResult | null>(null);

  // 创建表单
  const [keyName, setKeyName] = useState('');
  const [keyPermissions, setKeyPermissions] = useState<string[]>(['read', 'write']);
  const [keyRateLimit, setKeyRateLimit] = useState(1000);
  const [keyExpiresDays, setKeyExpiresDays] = useState(0); // 0 表示永不过期
  const [creating, setCreating] = useState(false);

  // 加载 API Key 列表
  const loadKeys = async () => {
    setLoading(true);
    try {
      const result = await apiClient.listAPIKeys();
      if (result.success && result.data) {
        setKeys(result.data);
      } else {
        toast.error(result.error || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // 创建 API Key
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!keyName) {
      toast.error('请输入 Key 名称');
      return;
    }

    setCreating(true);
    try {
      const result = await apiClient.createAPIKey({
        name: keyName,
        permissions: keyPermissions,
        rate_limit: keyRateLimit,
        expires_days: keyExpiresDays || undefined,
      });

      if (result.success && result.data) {
        toast.success('API Key 创建成功');
        setNewKeyResult(result.data);
        onKeyCreated?.(result.data);
        loadKeys();

        // 重置表单
        setKeyName('');
        setKeyPermissions(['read', 'write']);
        setKeyRateLimit(1000);
        setKeyExpiresDays(0);
      } else {
        toast.error(result.error || '创建失败');
      }
    } finally {
      setCreating(false);
    }
  };

  // 删除 API Key
  const handleDelete = async (keyId: string) => {
    if (!confirm('确定要删除这个 API Key 吗？删除后无法恢复。')) return;

    try {
      const result = await apiClient.deleteAPIKey(keyId);
      if (result.success) {
        toast.success('API Key 已删除');
        loadKeys();
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 复制 Key
  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('已复制到剪贴板');
  };

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '从未';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Key 管理
            </CardTitle>
            <CardDescription>
              管理 API Key 以访问 SDK 接口
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建 Key
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无 API Key</p>
            <p className="text-sm mt-1">创建 API Key 以访问 SDK 接口</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{key.name}</span>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                      {key.key_prefix}...
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {key.permissions.join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {key.rate_limit}/分钟
                    </span>
                    {key.expires_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        过期: {formatDate(key.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    最后使用: {formatDate(key.last_used_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(key.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 创建 API Key 对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setNewKeyResult(null);
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>创建 API Key</DialogTitle>
              <DialogDescription>
                创建新的 API Key 用于访问 SDK 接口
              </DialogDescription>
            </DialogHeader>

            {newKeyResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800 dark:text-green-200">
                        API Key 创建成功
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        请立即复制并妥善保存，系统不会再次显示完整 Key
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-muted rounded font-mono text-sm break-all">
                      {newKeyResult.key}
                    </code>
                    <Button
                      variant="outline"
                      onClick={() => copyKey(newKeyResult.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => {
                    setCreateDialogOpen(false);
                    setNewKeyResult(null);
                  }}>
                    完成
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key 名称</Label>
                  <Input
                    id="key-name"
                    placeholder="例如：生产环境、开发环境"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>权限</Label>
                  <div className="flex gap-2">
                    {['read', 'write'].map((perm) => (
                      <Badge
                        key={perm}
                        variant={keyPermissions.includes(perm) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          if (keyPermissions.includes(perm)) {
                            setKeyPermissions(keyPermissions.filter(p => p !== perm));
                          } else {
                            setKeyPermissions([...keyPermissions, perm]);
                          }
                        }}
                      >
                        {perm === 'read' ? '读取' : '写入'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate-limit">速率限制（请求/分钟）</Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    min={10}
                    max={10000}
                    value={keyRateLimit}
                    onChange={(e) => setKeyRateLimit(parseInt(e.target.value) || 1000)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires-days">有效期（天，0 表示永不过期）</Label>
                  <Input
                    id="expires-days"
                    type="number"
                    min={0}
                    max={365}
                    value={keyExpiresDays}
                    onChange={(e) => setKeyExpiresDays(parseInt(e.target.value) || 0)}
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
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
