"""
灵童平台 Token 缓存服务
支持每个用户独立的 Token 缓存，失效时自动重新获取
"""
import asyncio
import hashlib
import time
from typing import Optional, Dict, Any
from loguru import logger
import httpx

from ..core.cache import cache_manager
from ..core.config import settings



class LingTongTokenCache:
    """灵童 Token 缓存管理器"""
    
    # Token 缓存前缀
    CACHE_KEY_PREFIX = "lingtong:token:"
    # Token 默认过期时间（秒），设置为23小时，灵童 Token 通常24小时过期
    DEFAULT_TTL = 82800  # 23 * 3600
    
    def __init__(self):
        self._lock = asyncio.Lock()
    
    def _generate_cache_key(self, user_token: str) -> str:
        """生成缓存键，基于用户 token 的哈希值"""
        # 使用用户 token 的 MD5 作为缓存键，确保不同用户有不同的缓存
        token_hash = hashlib.md5(user_token.encode()).hexdigest()
        return f"{self.CACHE_KEY_PREFIX}{token_hash}"
    
    async def get_user_info(self, user_token: str, base_url: str) -> Optional[Dict[str, Any]]:
        """
        获取用户信息（带缓存）
        
        Args:
            user_token: 用户的 Authorization token
            base_url: 灵童平台基础 URL
            
        Returns:
            用户信息字典，包含用户id、用户名称等
        """
        cache_key = self._generate_cache_key(user_token)
        
        # 1. 先尝试从缓存获取
        try:
            cached_data = await cache_manager.get(cache_key)
            if cached_data:
                # 检查缓存是否过期（预留5分钟缓冲时间）
                expire_time = cached_data.get("expire_time", 0)
                if expire_time > time.time() + 300:  # 还有5分钟以上才过期
                    logger.debug(f"从缓存获取用户信息: {cache_key}")
                    return cached_data.get("user_info")
                else:
                    logger.debug(f"缓存即将过期，重新获取: {cache_key}")
        except Exception as e:
            logger.warning(f"读取缓存失败: {e}")
        
        # 2. 缓存未命中或即将过期，从灵童平台获取
        async with self._lock:
            # 双重检查，避免并发时重复获取
            try:
                cached_data = await cache_manager.get(cache_key)
                if cached_data:
                    expire_time = cached_data.get("expire_time", 0)
                    if expire_time > time.time() + 300:
                        return cached_data.get("user_info")
            except Exception:
                pass
            
            # 3. 调用灵童平台接口获取用户信息
            try:
                user_info = await self._fetch_user_info_from_lingtong(user_token, base_url)
                if user_info:
                    # 4. 存入缓存
                    ttl = self.DEFAULT_TTL
                    cache_data = {
                        "user_info": user_info,
                        "expire_time": time.time() + ttl,
                        "cached_at": time.time()
                    }
                    await cache_manager.set(cache_key, cache_data, ttl=ttl)
                    logger.info(f"用户信息已缓存: {cache_key}, 用户ID: {user_info.get('用户id') or user_info.get('user_id')}")
                    return user_info
            except Exception as e:
                logger.error(f"获取用户信息失败: {e}")
                raise
        
        return None
    
    async def _fetch_user_info_from_lingtong(self, user_token: str, base_url: str) -> Optional[Dict[str, Any]]:
        """
        从灵童平台获取用户信息
        
        Args:
            user_token: 用户的 Authorization token
            base_url: 灵童平台基础 URL
            
        Returns:
            用户信息字典
        """
        async with httpx.AsyncClient() as client:
            # 灵童平台接口: POST /api/get_user_info_by_token，auth_token 在 body 中
            response = await client.post(
                f"{base_url}/api/get_user_info_by_token",
                json={"auth_token": user_token},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"灵童平台 /api/get_user_info_by_token 返回数据: {data}")
                # 检查是否是标准成功响应
                if isinstance(data, dict):
                    # 处理嵌套在 data 字段中的情况
                    if data.get("success") and "data" in data:
                        user_data = data["data"]
                        logger.info(f"从 data 字段提取用户信息: {user_data}")
                        return user_data
                    elif data.get("code") == 200 or "用户id" in data or "user_id" in data:
                        return data
                    else:
                        raise Exception(f"灵童平台返回错误: {data.get('message', '未知错误')}")
                return data
            elif response.status_code == 401:
                raise Exception("Token 已失效或无效，请重新登录")
            else:
                raise Exception(f"获取用户信息失败: HTTP {response.status_code}, {response.text}")
    
    async def invalidate_cache(self, user_token: str) -> bool:
        """
        使指定用户的缓存失效
        
        Args:
            user_token: 用户的 Authorization token
            
        Returns:
            是否成功删除缓存
        """
        cache_key = self._generate_cache_key(user_token)
        try:
            result = await cache_manager.delete(cache_key)
            logger.info(f"缓存已失效: {cache_key}")
            return result
        except Exception as e:
            logger.error(f"失效缓存失败: {e}")
            return False
    
    async def get_cached_token_info(self, user_token: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存的 Token 信息（用于调试）
        
        Args:
            user_token: 用户的 Authorization token
            
        Returns:
            缓存信息字典
        """
        cache_key = self._generate_cache_key(user_token)
        try:
            return await cache_manager.get(cache_key)
        except Exception:
            return None


# 全局 Token 缓存实例
lingtong_token_cache = LingTongTokenCache()


 
async def get_user_info_with_cache(user_token: str, base_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        便捷函数：获取用户信息（带缓存）
        
        Args:
            user_token: 用户的 Authorization token
            base_url: 灵童平台基础 URL，默认从配置读取
            
        Returns:
            用户信息字典
            
        Example:
            user_info = await get_user_info_with_cache("Bearer xxx")
            user_id = user_info.get("用户id") or user_info.get("user_id")
            user_name = user_info.get("用户名称") or user_info.get("user_name")
        """
        if not base_url:
            # 确保 base_url 始终是一个非空字符串，避免传递 None
            base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        # 显式确保 base_url 是 str 类型，防止 getattr 返回 None 或其他类型导致类型检查错误
        final_base_url: str = base_url if isinstance(base_url, str) else 'http://localhost:8800'
        
        return await lingtong_token_cache.get_user_info(user_token, final_base_url)
