'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, Plus, Copy, Check, Sparkles, Code2, 
  Settings, Eye, Loader2, Trash2, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface AIAgent {
  id: string;
  name: string;
  avatar?: string;
  greeting?: string;
  description?: string;
  sdk_id?: string;
  sdk_name?: string;
  share_token?: string;
  is_active: boolean;
  config?: any;
  created_at: string;
}

interface SDK {
  id: string;
  name: string;
  share_token: string;
  description?: string;
}

export default function AIAssistantPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [sdks, setSDKs] = useState<SDK[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    greeting: '你好！有什么可以帮您的吗？',
    description: '',
    sdk_id: '',
    theme_color: '#4F46E5',
    position: 'right',
    bottom: 20,
    side_margin: 20,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载SDK列表
      const sdkRes = await fetch('/api/sdk');
      const sdkData = await sdkRes.json();
      if (sdkData.success) {
        setSDKs(sdkData.data || []);
      }
      
      // 加载AI助手列表
      const agentRes = await fetch('/api/sdk/ai-agents');
      const agentData = await agentRes.json();
      if (agentData.success) {
        setAgents(agentData.data || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('请输入助手名称');
      return;
    }
    if (!formData.sdk_id) {
      toast.error('请选择关联的SDK');
      return;
    }
    
    try {
      setCreating(true);
      const res = await fetch('/api/sdk/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('AI助手创建成功');
        setShowCreate(false);
        resetForm();
        loadData();
      } else {
        toast.error(data.detail || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      greeting: '你好！有什么可以帮您的吗？',
      description: '',
      sdk_id: '',
      theme_color: '#4F46E5',
      position: 'right',
      bottom: 20,
      side_margin: 20,
    });
  };

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('已复制');
    setTimeout(() => setCopied(null), 2000);
  };

  const generateEmbedCode = (agent: AIAgent) => {
    const domain = typeof window !== 'undefined' ? window.location.origin : '';
    const config = agent.config || {};
    
    const configCode = `<script>
window.AI_SDK_CONFIG = {
  agentId: '${agent.id}',
  name: '${agent.name}',
  userName: '', // 第三方透传用户名
  apiBaseUrl: '${domain}/api/ai',
  themeColor: '${config.theme_color || '#4F46E5'}',
  position: '${config.position || 'right'}',
  bottom: ${config.bottom || 20},
  sideMargin: ${config.side_margin || 20}
};
</script>`;

    const sdkScript = `<script src="${domain}/api/sdk/ai-agents/${agent.id}/embed"></script>`;

    return { configCode, sdkScript };
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI 助手 SDK</h1>
                <p className="text-sm text-muted-foreground">零开发嵌入智能助手</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <Code2 className="w-4 h-4 mr-1" />
                SDK 创建
              </Button>
            </Link>
            <Link href="/sdk-list">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                SDK 列表
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* 功能介绍 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                零开发，秒嵌入
              </CardTitle>
              <CardDescription>
                第三方业务系统只需粘贴 JSSDK 代码 + 透传用户名，即可拥有智能对话助手
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">零开发</div>
                  <div className="text-sm text-muted-foreground mt-1">只需粘贴代码</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">透传用户名</div>
                  <div className="text-sm text-muted-foreground mt-1">第三方零逻辑处理</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">预览功能</div>
                  <div className="text-sm text-muted-foreground mt-1">自动初始化渲染</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">托管服务</div>
                  <div className="text-sm text-muted-foreground mt-1">配置/Token/权限全托管</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 创建按钮 */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">AI 助手列表</h2>
            <Button onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? <><Eye className="w-4 h-4 mr-2" />收起</> : <><Plus className="w-4 h-4 mr-2" />创建 AI 助手</>}
            </Button>
          </div>

          {/* 创建表单 */}
          {showCreate && (
            <Card>
              <CardHeader>
                <CardTitle>创建 AI 助手</CardTitle>
                <CardDescription>配置助手信息，系统将自动生成嵌入代码</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">助手名称 *</Label>
                    <Input
                      id="name"
                      placeholder="例如：智能客服"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sdk">关联 SDK *</Label>
                    <select
                      id="sdk"
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={formData.sdk_id}
                      onChange={(e) => setFormData({ ...formData, sdk_id: e.target.value })}
                    >
                      <option value="">选择 SDK...</option>
                      {sdks.map((sdk) => (
                        <option key={sdk.id} value={sdk.id}>
                          {sdk.name} ({sdk.share_token.slice(0, 8)}...)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting">欢迎语</Label>
                  <Input
                    id="greeting"
                    placeholder="助手打招呼的语句"
                    value={formData.greeting}
                    onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    placeholder="助手的功能描述"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme_color">主题色</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">位置</Label>
                    <select
                      id="position"
                      className="w-full h-10 px-3 border rounded-md bg-background"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    >
                      <option value="right">右下角</option>
                      <option value="left">左下角</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bottom">底部距离</Label>
                    <Input
                      type="number"
                      id="bottom"
                      value={formData.bottom}
                      onChange={(e) => setFormData({ ...formData, bottom: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreate} disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    创建
                  </Button>
                  <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 助手列表 */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">还没有 AI 助手</p>
                <p className="text-sm text-muted-foreground mt-2">先创建一个 SDK，再创建 AI 助手</p>
                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个 AI 助手
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {agents.map((agent) => {
                const { configCode, sdkScript } = generateEmbedCode(agent);
                
                return (
                  <Card key={agent.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{agent.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              ID: {agent.id.slice(0, 8)}...
                              {agent.sdk_name && <Badge variant="outline">{agent.sdk_name}</Badge>}
                              <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                                {agent.is_active ? '启用' : '禁用'}
                              </Badge>
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {agent.greeting && (
                        <p className="text-sm text-muted-foreground mb-4">
                          欢迎语：{agent.greeting}
                        </p>
                      )}
                      
                      <Tabs defaultValue="embed" className="w-full">
                        <TabsList>
                          <TabsTrigger value="embed">嵌入代码</TabsTrigger>
                          <TabsTrigger value="guide">接入指南</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="embed" className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium mb-2 block">第一步：配置代码（放在 SDK 脚本之前）</Label>
                            <div className="relative">
                              <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40">
                                {configCode}
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopy(configCode, `config-${agent.id}`)}
                              >
                                {copied === `config-${agent.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium mb-2 block">第二步：SDK 脚本</Label>
                            <div className="relative">
                              <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-40">
                                {sdkScript}
                              </pre>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2"
                                onClick={() => handleCopy(sdkScript, `sdk-${agent.id}`)}
                              >
                                {copied === `sdk-${agent.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          <Alert className="bg-blue-50 border-blue-200">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <div className="text-sm">
                              <p className="font-medium text-blue-800">使用提示：</p>
                              <ul className="text-blue-700 mt-1 space-y-1">
                                <li>1. 将配置代码和 SDK 脚本粘贴到网页中</li>
                                <li>2. 在 SDK 脚本之前设置用户信息：<code className="bg-blue-100 px-1 rounded">AI_SDK_CONFIG.userName = '用户名'</code></li>
                                <li>3. 页面加载后自动显示悬浮按钮</li>
                              </ul>
                            </div>
                          </Alert>
                        </TabsContent>
                        
                        <TabsContent value="guide">
                          <div className="bg-muted rounded-lg p-4 space-y-4">
                            <div className="bg-white rounded p-4">
                              <h4 className="font-medium mb-2">第一步：复制嵌入代码</h4>
                              <p className="text-sm text-muted-foreground">从上方获取配置代码和 SDK 脚本代码</p>
                            </div>
                            <div className="bg-white rounded p-4">
                              <h4 className="font-medium mb-2">第二步：透传用户名</h4>
                              <p className="text-sm text-muted-foreground">在第三方系统中，设置 userName 为当前登录用户名</p>
                            </div>
                            <div className="bg-white rounded p-4">
                              <h4 className="font-medium mb-2">第三步：完成！</h4>
                              <p className="text-sm text-muted-foreground">用户访问页面时，SDK 自动初始化并渲染悬浮按钮</p>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 使用指南 */}
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-700 flex items-center gap-2">
                <Code2 className="w-5 h-5" />
                第三方接入示例
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/80 rounded-lg p-4">
                <h4 className="font-medium mb-2">HTML 示例</h4>
                <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">
{`<!DOCTYPE html>
<html>
<head>
  <title>第三方网站</title>
</head>
<body>
  <!-- 1. AI SDK配置 -->
  <script>
    window.AI_SDK_CONFIG = {
      agentId: '${agents[0]?.id || 'YOUR_AGENT_ID'}',
      userName: '当前登录用户', // 透传用户名
    };
  </script>
  
  <!-- 2. SDK脚本 -->
  <script src="你的域名/api/sdk/ai-agents/${agents[0]?.id || 'AGENT_ID'}/embed"></script>
  
</body>
</html>`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
