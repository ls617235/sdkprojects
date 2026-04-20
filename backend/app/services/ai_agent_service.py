"""
AI助手SDK服务
支持与灵童平台对接：
1. 第三方零开发：只需嵌入SDK+透传用户名
2. 托管服务鉴权：SDK托管平台与灵童平台验签交互
3. Token转发：灵童平台Token转发给JSSDK
4. 直连访问：JSSDK携带Token直接访问灵童平台
"""
import hashlib
import hmac
import json
import secrets
import time
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from loguru import logger
import httpx

from app.core.database import DatabasePool
from app.core.cache import cache_manager
from app.core.config import settings


class LingTongClient:
    """灵童平台API客户端"""
    
    def __init__(self, app_id: str, app_secret: str, api_base_url: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.api_base_url = api_base_url.rstrip('/')
    
    def generate_signature(self, params: dict) -> str:
        """生成签名（HMAC-SHA256）"""
        sorted_params = sorted(params.items())
        query_string = '&'.join([f'{k}={v}' for k, v in sorted_params])
        sign_string = f"{query_string}{self.app_secret}"
        return hashlib.sha256(sign_string.encode()).hexdigest()
    
    async def verify_and_get_token(self, agent_id: str, user_name: str, 
                                   client_ip: str = None) -> Dict[str, Any]:
        """与灵童平台验签并获取Token"""
        timestamp = int(time.time())
        nonce = secrets.token_hex(16)
        
        sign_params = {
            'app_id': self.app_id,
            'agent_id': agent_id,
            'user_name': user_name,
            'timestamp': str(timestamp),
            'nonce': nonce,
        }
        
        signature = self.generate_signature(sign_params)
        
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.api_base_url}/api/auth/verify",
                    json={
                        'app_id': self.app_id,
                        'agent_id': agent_id,
                        'user_name': user_name,
                        'timestamp': timestamp,
                        'nonce': nonce,
                        'signature': signature,
                        'client_ip': client_ip,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        return {
                            'success': True,
                            'token': data.get('token'),
                            'expires_in': data.get('expires_in', 3600),
                            'api_base_url': data.get('api_base_url', self.api_base_url),
                        }
                    else:
                        return {'success': False, 'error': data.get('message', '验签失败')}
                else:
                    return {'success': False, 'error': f'HTTP {response.status_code}'}
                    
        except httpx.TimeoutException:
            return {'success': False, 'error': '请求超时'}
        except Exception as e:
            logger.error(f"灵童平台验签失败: {e}")
            return {'success': False, 'error': str(e)}
    
    async def send_message(self, token: str, message: str, 
                           session_id: str = None) -> Dict[str, Any]:
        """发送消息到灵童平台"""
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.api_base_url}/api/chat/message",
                    headers={'Authorization': f'Bearer {token}'},
                    json={
                        'message': message,
                        'session_id': session_id,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        'success': True,
                        'content': data.get('content', ''),
                        'message_id': data.get('message_id'),
                        'session_id': data.get('session_id'),
                    }
                else:
                    return {'success': False, 'error': f'HTTP {response.status_code}'}
                    
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            return {'success': False, 'error': str(e)}


class AIAgentService:
    """AI助手SDK服务"""
    
    def __init__(self, db: DatabasePool):
        self.db = db
        self.token_ttl = 1800  # 30分钟
    
    async def get_agent_config(self, agent_id: str) -> Optional[dict]:
        """获取Agent配置"""
        query = """
            SELECT a.*, s.name as sdk_name, s.share_token
            FROM ai_agents a
            LEFT JOIN sdk_shares s ON a.sdk_id = s.id
            WHERE a.id = $1 AND a.is_active = TRUE
        """
        return await self.db.fetchrow(query, agent_id)
    
    async def get_lingtong_client(self, agent_id: str) -> Optional[LingTongClient]:
        """获取灵童平台客户端"""
        agent = await self.get_agent_config(agent_id)
        if not agent:
            return None
        
        config = json.loads(agent.get('config', '{}')) if agent.get('config') else {}
        
        app_id = config.get('lingtong_app_id') or getattr(settings, 'LINGTONG_APP_ID', None)
        app_secret = config.get('lingtong_app_secret') or getattr(settings, 'LINGTONG_APP_SECRET', None)
        api_base_url = config.get('lingtong_api_url') or getattr(settings, 'LINGTONG_API_URL', None)
        
        if not app_id or not app_secret:
            return None
        
        return LingTongClient(app_id, app_secret, api_base_url or 'https://api.lingtong.com')
    
    async def init_session(self, agent_id: str, user_name: str,
                          client_ip: str = None, user_agent: str = None) -> dict:
        """
        初始化会话（预览模式）
        
        第三方只需传递 agent_id 和 user_name
        托管服务平台自动完成与灵童平台的验签交互
        """
        agent = await self.get_agent_config(agent_id)
        if not agent:
            raise ValueError("Agent不存在或未激活")
        
        # 创建会话记录
        session_id = secrets.token_hex(16)
        session_token = secrets.token_urlsafe(32)
        
        await self.db.execute("""
            INSERT INTO ai_sessions (id, agent_id, session_token, user_name, client_ip, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, session_id, agent_id, session_token, user_name, client_ip, user_agent)
        
        # 尝试与灵童平台验签
        lingtong_client = await self.get_lingtong_client(agent_id)
        lingtong_token = None
        lingtong_api_url = None
        
        if lingtong_client:
            result = await lingtong_client.verify_and_get_token(
                agent_id=agent_id,
                user_name=user_name,
                client_ip=client_ip
            )
            if result.get('success'):
                lingtong_token = result.get('token')
                lingtong_api_url = result.get('api_base_url')
        
        # 缓存会话信息
        cache_data = {
            "session_id": session_id,
            "agent_id": agent_id,
            "user_name": user_name,
            "lingtong_token": lingtong_token,
            "lingtong_api_url": lingtong_api_url,
            "status": "active"
        }
        await cache_manager.set(f"ai_session:{session_token}", cache_data, ttl=self.token_ttl)
        
        # Agent公开配置
        agent_config = json.loads(agent.get('config', '{}')) if agent.get('config') else {}
        
        return {
            "session_token": session_token,
            "expires_in": self.token_ttl,
            "agent_config": {
                "name": agent["name"],
                "avatar": agent.get("avatar"),
                "greeting": agent.get("greeting", "你好！有什么可以帮您的吗？"),
                "theme_color": agent_config.get('theme_color', '#4F46E5'),
                "position": agent_config.get('position', 'right'),
                "bottom": agent_config.get('bottom', 20),
                "side_margin": agent_config.get('side_margin', 20),
                "has_lingtong": lingtong_token is not None,
            }
        }
    
    async def verify_session_token(self, session_token: str) -> Optional[dict]:
        """验证会话Token"""
        cache_key = f"ai_session:{session_token}"
        session_data = await cache_manager.get(cache_key)
        
        if session_data:
            return session_data
        
        query = """
            SELECT s.*, a.name as agent_name, a.avatar, a.greeting, a.config
            FROM ai_sessions s
            JOIN ai_agents a ON s.agent_id = a.id
            WHERE s.session_token = $1 AND s.status = 'active'
        """
        result = await self.db.fetchrow(query, session_token)
        if result:
            session_data = dict(result)
            if session_data.get('config'):
                session_data['config'] = json.loads(session_data['config'])
            await cache_manager.set(cache_key, session_data, ttl=self.token_ttl)
            return session_data
        
        return None
    
    async def save_message(self, session_id: str, role: str, content: str,
                          metadata: dict = None) -> dict:
        """保存消息"""
        message_id = secrets.token_hex(16)
        message_token = secrets.token_urlsafe(32)
        
        await self.db.execute("""
            INSERT INTO ai_messages (id, session_id, role, content, message_token, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, message_id, session_id, role, content, message_token, json.dumps(metadata or {}))
        
        await self.db.execute(
            "UPDATE ai_sessions SET last_message_at = NOW() WHERE id = $1",
            session_id
        )
        
        return {
            "id": message_id,
            "message_token": message_token,
            "role": role,
            "content": content,
            "metadata": metadata,
        }
    
    async def get_session_messages(self, session_id: str, limit: int = 50) -> list:
        """获取会话历史消息"""
        results = await self.db.fetch("""
            SELECT role, content, metadata, created_at
            FROM ai_messages WHERE session_id = $1
            ORDER BY created_at ASC LIMIT $2
        """, session_id, limit)
        return [dict(r) for r in results]
    
    async def generate_preview_response(self, message: str, agent_config: dict) -> str:
        """生成预览回复（模拟模式）"""
        if any(kw in message.lower() for kw in ['你好', '您好', 'hello', 'hi']):
            return "你好！很高兴为您服务！"
        elif any(kw in message for kw in ['帮助', 'help', '怎么用', '功能']):
            return "我是AI助手，可以回答您的问题、提供建议和帮助。"
        else:
            return f"收到：{message[:50]}{'...' if len(message) > 50 else ''}\n\n【预览模式】"


async def get_ai_agent_service() -> AIAgentService:
    """获取AI Agent服务实例"""
    from app.core.database import get_db
    db = await get_db()
    return AIAgentService(db)
