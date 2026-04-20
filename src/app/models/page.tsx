'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Package, Settings, Code2, TestTube, Save, CheckCircle2, 
  PlusCircle, Trash2, Edit, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

type Model = {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  isDefault: boolean;
  status: 'active' | 'inactive';
};

export default function ModelConfigPage() {
  const [models, setModels] = useState<Model[]>([
    {
      id: '1',
      name: 'OpenAI GPT-4',
      provider: 'openai',
      apiKey: 'sk-...',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant that helps users generate SDK code.',
      isDefault: true,
      status: 'active'
    },
    {
      id: '2',
      name: 'Claude 3',
      provider: 'anthropic',
      apiKey: 'sk-...',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant that helps users generate SDK code.',
      isDefault: false,
      status: 'inactive'
    }
  ]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [testStatus, setTestStatus] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'error' }>({});
  
  const [newModel, setNewModel] = useState<Omit<Model, 'id' | 'status'>>({ 
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful assistant that helps users generate SDK code.',
    isDefault: false
  });

  const handleAddModel = () => {
    if (!newModel.name || !newModel.apiKey) {
      toast.error('请填写模型名称和API Key');
      return;
    }
    
    const model: Model = {
      ...newModel,
      id: Date.now().toString(),
      status: 'inactive'
    };
    
    setModels([...models, model]);
    setNewModel({ 
      name: '',
      provider: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant that helps users generate SDK code.',
      isDefault: false
    });
    setIsAdding(false);
    toast.success('模型添加成功');
  };

  const handleUpdateModel = (id: string, updates: Partial<Model>) => {
    setModels(models.map(model => 
      model.id === id ? { ...model, ...updates } : model
    ));
    setEditingModel(null);
    toast.success('模型更新成功');
  };

  const handleDeleteModel = (id: string) => {
    setModels(models.filter(model => model.id !== id));
    toast.success('模型删除成功');
  };

  const handleSetDefault = (id: string) => {
    setModels(models.map(model => ({
      ...model,
      isDefault: model.id === id
    })));
    toast.success('默认模型设置成功');
  };

  const testModelConnection = async (model: Model) => {
    setTestStatus({ ...testStatus, [model.id]: 'testing' });
    
    try {
      // 模拟测试连接
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 这里可以添加实际的API测试逻辑
      // 例如调用模型的API来验证连接
      
      setTestStatus({ ...testStatus, [model.id]: 'success' });
      toast.success(`模型 ${model.name} 连接测试成功`);
    } catch (error) {
      setTestStatus({ ...testStatus, [model.id]: 'error' });
      toast.error(`模型 ${model.name} 连接测试失败`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 transition-all hover:scale-105">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">模型配置</h1>
                <p className="text-sm text-gray-500">自定义AI模型设置</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="default" size="sm" className="transition-all hover:shadow-md">
                <Code2 className="w-4 h-4 mr-1.5" />
                SDK 创建
              </Button>
            </Link>
            <Link href="/sdk-list">
              <Button variant="outline" size="sm" className="transition-all hover:shadow-sm">
                <Package className="w-4 h-4 mr-1.5" />
                SDK 列表
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 功能介绍 */}
          <Card className="mb-6 rounded-2xl shadow-sm border-gray-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <Settings className="w-5 h-5 text-purple-500" />
                模型配置
              </CardTitle>
              <CardDescription className="text-gray-600">
                管理和配置AI模型，支持自定义模型、设置提示词和测试连接
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">添加模型</h4>
                    <p className="text-sm text-gray-600">
                      添加自定义AI模型配置
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">设置提示词</h4>
                    <p className="text-sm text-gray-600">
                      配置模型的系统提示词
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-white shadow-sm border border-gray-100 transition-all hover:shadow-md">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0 shadow-sm">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">测试连接</h4>
                    <p className="text-sm text-gray-600">
                      验证模型连接是否正常
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 添加模型按钮 */}
          <div className="mb-6 flex justify-end">
            <Button onClick={() => setIsAdding(!isAdding)} className="rounded-lg transition-all hover:shadow-md">
              <PlusCircle className="w-4 h-4 mr-2" />
              {isAdding ? '取消添加' : '添加模型'}
            </Button>
          </div>

          {/* 添加模型表单 */}
          {isAdding && (
            <Card className="mb-6 rounded-2xl shadow-sm border-gray-100">
              <CardHeader className="bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-xl font-semibold text-gray-900">添加新模型</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">模型名称</Label>
                    <Input 
                      id="name" 
                      value={newModel.name} 
                      onChange={(e) => setNewModel({ ...newModel, name: e.target.value })} 
                      placeholder="例如：OpenAI GPT-4"
                      className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="provider" className="text-sm font-medium text-gray-700">提供商</Label>
                    <select 
                      id="provider" 
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={newModel.provider}
                      onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                      <option value="azure">Azure OpenAI</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700">API Key</Label>
                  <Input 
                    id="apiKey" 
                    value={newModel.apiKey} 
                    onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })} 
                    placeholder="sk-..."
                    className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="baseUrl" className="text-sm font-medium text-gray-700">API 基础 URL</Label>
                  <Input 
                    id="baseUrl" 
                    value={newModel.baseUrl} 
                    onChange={(e) => setNewModel({ ...newModel, baseUrl: e.target.value })} 
                    placeholder="https://api.openai.com/v1"
                    className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="model" className="text-sm font-medium text-gray-700">模型名称</Label>
                  <Input 
                    id="model" 
                    value={newModel.model} 
                    onChange={(e) => setNewModel({ ...newModel, model: e.target.value })} 
                    placeholder="gpt-4"
                    className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label htmlFor="temperature" className="text-sm font-medium text-gray-700">温度</Label>
                    <Input 
                      id="temperature" 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="2" 
                      value={newModel.temperature} 
                      onChange={(e) => setNewModel({ ...newModel, temperature: parseFloat(e.target.value) })} 
                      className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="maxTokens" className="text-sm font-medium text-gray-700">最大 tokens</Label>
                    <Input 
                      id="maxTokens" 
                      type="number" 
                      value={newModel.maxTokens} 
                      onChange={(e) => setNewModel({ ...newModel, maxTokens: parseInt(e.target.value) })} 
                      className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="systemPrompt" className="text-sm font-medium text-gray-700">系统提示词</Label>
                  <Textarea 
                    id="systemPrompt" 
                    value={newModel.systemPrompt} 
                    onChange={(e) => setNewModel({ ...newModel, systemPrompt: e.target.value })} 
                    placeholder="You are a helpful assistant that helps users generate SDK code."
                    rows={4}
                    className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <Switch 
                    id="isDefault" 
                    checked={newModel.isDefault} 
                    onCheckedChange={(checked) => setNewModel({ ...newModel, isDefault: checked })}
                  />
                  <Label htmlFor="isDefault" className="text-sm font-medium text-gray-700">设为默认模型</Label>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleAddModel} className="rounded-lg transition-all hover:shadow-md">
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)} className="rounded-lg transition-all hover:shadow-sm">
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 模型列表 */}
          <div className="space-y-5">
            {models.map((model) => (
              <Card key={model.id} className="rounded-2xl shadow-sm border-gray-100 overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gray-50 border-b border-gray-100">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      {model.name}
                      {model.isDefault && (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium border border-blue-100">默认</span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {model.provider} | {model.model} | 状态: <span className={`font-medium ${model.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>{model.status === 'active' ? '活跃' : '非活跃'}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => testModelConnection(model)}
                      disabled={testStatus[model.id] === 'testing'}
                      className="rounded-full h-9 w-9 hover:bg-gray-100 transition-colors"
                    >
                      {testStatus[model.id] === 'testing' ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                      ) : testStatus[model.id] === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : testStatus[model.id] === 'error' ? (
                        <span className="w-4 h-4 text-red-500">✗</span>
                      ) : (
                        <TestTube className="w-4 h-4 text-purple-500" />
                      )}
                      <span className="sr-only">{testStatus[model.id] === 'testing' ? '测试中...' : '测试连接'}</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setEditingModel(model)}
                      className="rounded-full h-9 w-9 hover:bg-gray-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteModel(model.id)}
                      className="rounded-full h-9 w-9 hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {editingModel?.id === model.id ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                          <Label htmlFor={`name-${model.id}`} className="text-sm font-medium text-gray-700">模型名称</Label>
                          <Input 
                            id={`name-${model.id}`} 
                            value={editingModel.name} 
                            onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })} 
                            className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor={`provider-${model.id}`} className="text-sm font-medium text-gray-700">提供商</Label>
                          <select 
                            id={`provider-${model.id}`} 
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={editingModel.provider}
                            onChange={(e) => setEditingModel({ ...editingModel, provider: e.target.value })}
                          >
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google</option>
                            <option value="azure">Azure OpenAI</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor={`apiKey-${model.id}`} className="text-sm font-medium text-gray-700">API Key</Label>
                        <Input 
                          id={`apiKey-${model.id}`} 
                          value={editingModel.apiKey} 
                          onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })} 
                          className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor={`baseUrl-${model.id}`} className="text-sm font-medium text-gray-700">API 基础 URL</Label>
                        <Input 
                          id={`baseUrl-${model.id}`} 
                          value={editingModel.baseUrl} 
                          onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })} 
                          className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor={`model-${model.id}`} className="text-sm font-medium text-gray-700">模型名称</Label>
                        <Input 
                          id={`model-${model.id}`} 
                          value={editingModel.model} 
                          onChange={(e) => setEditingModel({ ...editingModel, model: e.target.value })} 
                          className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3">
                          <Label htmlFor={`temperature-${model.id}`} className="text-sm font-medium text-gray-700">温度</Label>
                          <Input 
                            id={`temperature-${model.id}`} 
                            type="number" 
                            step="0.1" 
                            min="0" 
                            max="2" 
                            value={editingModel.temperature} 
                            onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })} 
                            className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                          />
                        </div>
                        <div className="space-y-3">
                          <Label htmlFor={`maxTokens-${model.id}`} className="text-sm font-medium text-gray-700">最大 tokens</Label>
                          <Input 
                            id={`maxTokens-${model.id}`} 
                            type="number" 
                            value={editingModel.maxTokens} 
                            onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) })} 
                            className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor={`systemPrompt-${model.id}`} className="text-sm font-medium text-gray-700">系统提示词</Label>
                        <Textarea 
                          id={`systemPrompt-${model.id}`} 
                          value={editingModel.systemPrompt} 
                          onChange={(e) => setEditingModel({ ...editingModel, systemPrompt: e.target.value })} 
                          rows={4}
                          className="rounded-lg border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Switch 
                          id={`isDefault-${model.id}`} 
                          checked={editingModel.isDefault} 
                          onCheckedChange={(checked) => setEditingModel({ ...editingModel, isDefault: checked })}
                        />
                        <Label htmlFor={`isDefault-${model.id}`} className="text-sm font-medium text-gray-700">设为默认模型</Label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Switch 
                          id={`status-${model.id}`} 
                          checked={editingModel.status === 'active'} 
                          onCheckedChange={(checked) => setEditingModel({ 
                            ...editingModel, 
                            status: checked ? 'active' : 'inactive' 
                          })}
                        />
                        <Label htmlFor={`status-${model.id}`} className="text-sm font-medium text-gray-700">启用模型</Label>
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => handleUpdateModel(model.id, editingModel)} className="rounded-lg transition-all hover:shadow-md">
                          <Save className="w-4 h-4 mr-2" />
                          保存
                        </Button>
                        <Button variant="outline" onClick={() => setEditingModel(null)} className="rounded-lg transition-all hover:shadow-sm">
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-700 mb-2">API Key</p>
                          <p className="text-sm text-gray-600 font-mono">{model.apiKey}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-700 mb-2">API 基础 URL</p>
                          <p className="text-sm text-gray-600 font-mono">{model.baseUrl}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-700 mb-2">温度</p>
                          <p className="text-sm text-gray-600">{model.temperature}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-700 mb-2">最大 tokens</p>
                          <p className="text-sm text-gray-600">{model.maxTokens}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                          <p className="text-sm font-medium text-gray-700 mb-2">状态</p>
                          <p className={`text-sm font-medium ${model.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                            {model.status === 'active' ? '活跃' : '非活跃'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-white border border-gray-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-700 mb-2">系统提示词</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{model.systemPrompt}</p>
                      </div>
                      
                      {!model.isDefault && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSetDefault(model.id)}
                          className="rounded-lg transition-all hover:shadow-sm"
                        >
                          设为默认模型
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 提示信息 */}
          <Alert className="mt-6 rounded-xl border-gray-200 bg-purple-50 shadow-sm">
            <Settings className="w-4 h-4 text-purple-500" />
            <AlertTitle className="text-gray-900 font-medium">注意事项</AlertTitle>
            <AlertDescription className="space-y-2 text-gray-600">
              <div>• API Key 请妥善保管，不要分享给他人</div>
              <div>• 测试连接会消耗 API 调用次数，请谨慎使用</div>
              <div>• 只有活跃状态的模型才能被使用</div>
              <div>• 默认模型会在未指定模型时被使用</div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </main>
  );
}
