"""
SDK Share Platform - 数据库连接池
支持高并发的异步数据库操作
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import urlparse, parse_qs

import asyncpg
from loguru import logger

from app.core.config import settings


class DatabasePool:
    """PostgreSQL 异步连接池"""

    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self._lock = asyncio.Lock()
        self._retry_count = 3  # 连接重试次数

    def _parse_database_url(self) -> dict:
        """解析数据库 URL，提取连接参数"""
        url = settings.DATABASE_URL
        
        # 移除 ssl 参数（asyncpg 不支持在 DSN 中传递）
        if '?' in url:
            base_url, query = url.split('?', 1)
            params = parse_qs(query)
            ssl_mode = params.get('ssl', [None])[0]
            # 移除 ssl 参数后的 URL
            url = base_url
        else:
            ssl_mode = None
        
        parsed = urlparse(url)
        
        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': parsed.password,
            'database': parsed.path.lstrip('/'),
            'ssl': ssl_mode or 'prefer',  # 默认 prefer，不强制 SSL
        }

    async def init(self, force_reconnect: bool = False):
        """初始化连接池"""
        async with self._lock:
            if self.pool is not None and not force_reconnect:
                return

            if self.pool:
                try:
                    await self.pool.close()
                except Exception as e:
                    logger.warning(f"关闭旧连接池时出错: {e}")
                self.pool = None

            logger.info(f"初始化数据库连接池，大小: {settings.DATABASE_POOL_SIZE}")
            
            params = self._parse_database_url()
            logger.info(f"连接到数据库: {params['host']}:{params['port']}/{params['database']}")
            
            async def init_connection(conn):
                await conn.execute("SET CLIENT_ENCODING TO 'UTF8'")
            
            self.pool = await asyncpg.create_pool(
                host=params['host'],
                port=params['port'],
                user=params['user'],
                password=params['password'],
                database=params['database'],
                ssl=params['ssl'],
                min_size=5,
                max_size=settings.DATABASE_POOL_SIZE,
                command_timeout=settings.DATABASE_POOL_TIMEOUT,
                timeout=settings.DATABASE_POOL_TIMEOUT,
                init=init_connection,
                max_inactive_connection_lifetime=300,  # 连接最大空闲时间（秒）
            )
            logger.info("数据库连接池初始化成功")

    async def close(self):
        """关闭连接池"""
        async with self._lock:
            if self.pool:
                await self.pool.close()
                self.pool = None
                logger.info("数据库连接池已关闭")

    @asynccontextmanager
    async def get_connection(self):
        """获取数据库连接（带重试机制）"""
        if not self.pool:
            await self.init()

        for attempt in range(self._retry_count):
            try:
                async with self.pool.acquire() as conn:
                    # 验证连接是否有效
                    await conn.execute("SELECT 1")
                    yield conn
                    return
            except asyncpg.exceptions.ConnectionDoesNotExistError:
                logger.warning(f"数据库连接不存在，尝试重新连接 ({attempt + 1}/{self._retry_count})")
                await asyncio.sleep(1)
                await self.init(force_reconnect=True)
            except asyncpg.exceptions.PostgresConnectionError as e:
                logger.warning(f"数据库连接错误 ({attempt + 1}/{self._retry_count}): {e}")
                if attempt < self._retry_count - 1:
                    await asyncio.sleep(1)
                    await self.init(force_reconnect=True)
            except asyncpg.exceptions.InterfaceError as e:
                logger.warning(f"数据库接口错误 ({attempt + 1}/{self._retry_count}): {e}")
                if attempt < self._retry_count - 1:
                    await asyncio.sleep(1)
                    await self.init(force_reconnect=True)
            except Exception as e:
                logger.warning(f"获取数据库连接失败 ({attempt + 1}/{self._retry_count}): {e}")
                if attempt < self._retry_count - 1:
                    await asyncio.sleep(1)
        
        raise RuntimeError("无法获取数据库连接")

    async def execute(self, query: str, *args) -> str:
        """执行 SQL 命令，返回状态"""
        async with self.get_connection() as conn:
            return await conn.execute(query, *args)

    async def fetch(self, query: str, *args, timeout: int = None) -> list:
        """执行查询，返回多条记录"""
        async with self.get_connection() as conn:
            if timeout:
                return await conn.fetch(query, *args, timeout=timeout)
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args, timeout: int = None) -> Optional[asyncpg.Record]:
        """执行查询，返回单条记录"""
        async with self.get_connection() as conn:
            if timeout:
                return await conn.fetchrow(query, *args, timeout=timeout)
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args, timeout: int = None):
        """执行查询，返回单个值"""
        async with self.get_connection() as conn:
            if timeout:
                return await conn.fetchval(query, *args, timeout=timeout)
            return await conn.fetchval(query, *args)

    async def execute_many(self, query: str, args_list: list):
        """批量执行 SQL 命令"""
        async with self.get_connection() as conn:
            await conn.executemany(query, args_list)


# 全局数据库实例
db = DatabasePool()


async def get_db() -> DatabasePool:
    """获取数据库实例（依赖注入）"""
    if db.pool is None:
        await db.init()
    return db
