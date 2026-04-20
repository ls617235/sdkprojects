"""
灵童平台签名认证服务
基于 PlatformKey + PlatformSecret 的签名认证机制
"""
import hashlib
import hmac
import time
import json
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from loguru import logger


class LingTongAuth:
    """灵童平台签名认证"""
    
    def __init__(self, platform_key: str, platform_secret: str):
        self.platform_key = platform_key
        self.platform_secret = platform_secret
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
    
    def generate_signature(self, params: Dict[str, Any]) -> str:
        """
        生成签名
        
        签名算法：
        1. 将所有参数按key排序
        2. 拼接成 key1=value1&key2=value2 格式
        3. 使用 PlatformSecret 作为 key，进行 HMAC-SHA256 加密
        4. 将结果转为小写十六进制字符串
        
        Args:
            params: 请求参数
            
        Returns:
            签名字符串
        """
        # 添加时间戳和nonce
        params_with_ts = {
            **params,
            'timestamp': str(int(time.time())),
            'nonce': hashlib.md5(str(time.time()).encode()).hexdigest()[:16]
        }
        
        # 按key排序并拼接
        sorted_params = sorted(params_with_ts.items())
        param_string = '&'.join([f"{k}={v}" for k, v in sorted_params])
        
        # HMAC-SHA256签名
        signature = hmac.new(
            self.platform_secret.encode('utf-8'),
            param_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        logger.debug(f"签名参数: {param_string}")
        logger.debug(f"生成签名: {signature}")
        
        return signature
    
    def get_auth_headers(self, agent_id: str, user_name: str) -> Dict[str, str]:
        """
        获取认证请求头
        
        Args:
            agent_id: 应用ID
            user_name: 用户名
            
        Returns:
            请求头字典
        """
        params = {
            'platform_key': self.platform_key,
            'agent_id': agent_id,
            'user_name': user_name
        }
        
        signature = self.generate_signature(params)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Platform-Key': self.platform_key,
            'X-Signature': signature,
            'X-Timestamp': str(int(time.time())),
            'X-Nonce': hashlib.md5(str(time.time()).encode()).hexdigest()[:16]
        }
        
        logger.info(f"生成认证请求头 - AgentID: {agent_id}, User: {user_name}")
        
        return headers
    
    def generate_token(self, agent_id: str, user_name: str) -> Dict[str, Any]:
        """
        生成短期Token（30分钟有效期）
        
        Args:
            agent_id: 应用ID
            user_name: 用户名
            
        Returns:
            Token信息
        """
        # 生成JWT格式的Token
        header = json.dumps({"alg": "HS256", "typ": "JWT"})
        
        expiry = datetime.utcnow() + timedelta(minutes=30)
        payload = json.dumps({
            "platform_key": self.platform_key,
            "agent_id": agent_id,
            "user_name": user_name,
            "exp": int(expiry.timestamp()),
            "iat": int(datetime.utcnow().timestamp())
        })
        
        # Base64编码
        import base64
        header_b64 = base64.urlsafe_b64encode(header.encode()).decode().rstrip('=')
        payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')
        
        # 签名
        message = f"{header_b64}.{payload_b64}"
        signature = hmac.new(
            self.platform_secret.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
        
        token = f"{header_b64}.{payload_b64}.{signature_b64}"
        
        self._token = token
        self._token_expiry = expiry
        
        logger.info(f"生成Token - AgentID: {agent_id}, User: {user_name}, Expiry: {expiry}")
        
        return {
            "success": True,
            "token": token,
            "token_type": "Bearer",
            "expires_in": 1800,  # 30分钟
            "expires_at": expiry.isoformat()
        }
    
    def verify_token(self, token: str) -> bool:
        """
        验证Token有效性
        
        Args:
            token: Token字符串
            
        Returns:
            是否有效
        """
        try:
            import base64
            parts = token.split('.')
            if len(parts) != 3:
                return False
            
            # 解码payload
            payload_b64 = parts[1] + '=' * (4 - len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode())
            
            # 检查过期时间
            exp = payload.get('exp')
            if not exp or exp < int(time.time()):
                logger.warning("Token已过期")
                return False
            
            # 验证签名
            message = f"{parts[0]}.{parts[1]}"
            expected_signature = hmac.new(
                self.platform_secret.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).digest()
            expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode().rstrip('=')
            
            if not hmac.compare_digest(parts[2], expected_signature_b64):
                logger.warning("Token签名无效")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Token验证失败: {e}")
            return False
    
    @property
    def token(self) -> Optional[str]:
        """获取当前Token"""
        return self._token
    
    @property
    def is_token_valid(self) -> bool:
        """检查Token是否有效"""
        if not self._token or not self._token_expiry:
            return False
        return datetime.utcnow() < self._token_expiry


# 全局认证实例
_lingtong_auth: Optional[LingTongAuth] = None


def init_lingtong_auth(platform_key: str, platform_secret: str) -> LingTongAuth:
    """初始化灵童平台认证"""
    global _lingtong_auth
    _lingtong_auth = LingTongAuth(platform_key, platform_secret)
    return _lingtong_auth


def get_lingtong_auth() -> Optional[LingTongAuth]:
    """获取灵童平台认证实例"""
    return _lingtong_auth
