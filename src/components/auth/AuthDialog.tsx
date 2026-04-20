'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AuthResponse, AuthData } from '@/lib/api';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: AuthData) => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);

  // 登录表单
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册表单
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginEmail || !loginPassword) {
      toast.error('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.login(loginEmail, loginPassword);
      if (result.success && result.data) {
        toast.success('登录成功');
        onSuccess?.(result.data);
        onOpenChange(false);
        // 重置表单
        setLoginEmail('');
        setLoginPassword('');
      } else {
        toast.error(result.error || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail || !registerPassword) {
      toast.error('请填写邮箱和密码');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast.error('两次密码不一致');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('密码至少需要 6 位');
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.register(registerEmail, registerPassword, registerName || '');
      if (result.success && result.data) {
        toast.success('注册成功');
        onSuccess?.(result.data);
        onOpenChange(false);
        // 重置表单
        setRegisterEmail('');
        setRegisterPassword('');
        setRegisterName('');
        setRegisterConfirmPassword('');
      } else {
        toast.error(result.error || '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>欢迎使用 SDK 平台</DialogTitle>
          <DialogDescription>
            登录或注册以管理您的 SDK 和应用
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b mb-4">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('login')}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('register')}
          >
            注册
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="register-name">昵称（可选）</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  placeholder="您的昵称"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  placeholder="至少 6 位"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-confirm-password">确认密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-confirm-password"
                  type="password"
                  placeholder="再次输入密码"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
