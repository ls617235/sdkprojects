"""
SDK Share Platform - 缓存层
支持 Redis 和内存缓存，提升高并发性能
"""
import asyncio
import hashlib
import json
from typing import Any, Optional

from aiocache import cached
from aiocache.backends.memory import SimpleMemoryCache
from aiocache.backends.redis import RedisCache
from aiocache.serializers import BaseSerializer
from loguru import logger

from app.core.config import settings


class JSONSerializer(BaseSerializer):
    """JSON 序列化器"""

    def dumps(self, value: Any) -> bytes:
        return json.dumps(value, ensure_ascii=False, default=str).encode("utf-8")

    def loads(self, value: bytes) -> Any:
        if value is None:
            return None
        return json.loads(value.decode("utf-8"))


class CacheManager:
    """缓存管理器"""

    def __init__(self):
        self._cache: Optional[Cache] = None
        self._memory_cache: dict = {}
        self._lock = asyncio.Lock()

    async def init(self):
        """初始化缓存"""
        if settings.CACHE_ENABLED:
            if settings.REDIS_URL:
                # 使用 Redis 缓存
                logger.info(f"初始化 Redis 缓存: {settings.REDIS_URL}")
                # 解析 Redis URL: redis://[:password@]host:port/db
                redis_url = settings.REDIS_URL
                if "://" in redis_url:
                    # 移除协议前缀
                    url_part = redis_url.split("://")[1]
                    # 解析 host 和 port
                    if "@" in url_part:
                        # 有密码: :password@host:port/db
                        auth_part, host_part = url_part.split("@", 1)
                    else:
                        # 无密码: host:port/db
                        host_part = url_part
                    
                    # 提取 host
                    host = host_part.split(":")[0]
                    # 提取 port
                    port_part = host_part.split(":")[1] if ":" in host_part else "6379"
                    port = int(port_part.split("/")[0])
                else:
                    raise ValueError(f"Invalid REDIS_URL format: {redis_url}")
                
                self._cache = RedisCache(
                    endpoint=host,
                    port=port,
                    serializer=JSONSerializer(),
                    timeout=5,
                )
            else:
                # 使用内存缓存
                logger.info("使用内存缓存")
                self._cache = SimpleMemoryCache(
                    serializer=JSONSerializer(),
                )

    async def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        if not settings.CACHE_ENABLED or not self._cache:
            return None

        try:
            return await self._cache.get(key)
        except Exception as e:
            logger.warning(f"缓存读取失败: {e}")
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """设置缓存"""
        if not settings.CACHE_ENABLED or not self._cache:
            return False

        try:
            await self._cache.set(key, value, ttl=ttl or settings.CACHE_TTL)
            return True
        except Exception as e:
            logger.warning(f"缓存写入失败: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """删除缓存"""
        if not settings.CACHE_ENABLED or not self._cache:
            return False

        try:
            await self._cache.delete(key)
            return True
        except Exception as e:
            logger.warning(f"缓存删除失败: {e}")
            return False

    async def clear_pattern(self, pattern: str) -> bool:
        """清除匹配的缓存"""
        if not settings.CACHE_ENABLED or not self._cache:
            return False

        try:
            # 简单实现：清除所有缓存
            await self._cache.clear()
            return True
        except Exception as e:
            logger.warning(f"缓存清除失败: {e}")
            return False


# 全局缓存实例
cache_manager = CacheManager()


def generate_cache_key(*args, **kwargs) -> str:
    """生成缓存键"""
    key_data = f"{args}:{kwargs}"
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_result(ttl: Optional[int] = None):
    """缓存装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            if not settings.CACHE_ENABLED:
                return await func(*args, **kwargs)

            cache_key = f"{func.__name__}:{generate_cache_key(*args, **kwargs)}"

            # 尝试从缓存获取
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # 执行函数
            result = await func(*args, **kwargs)

            # 存入缓存
            await cache_manager.set(cache_key, result, ttl=ttl)

            return result
        return wrapper
    return decorator
