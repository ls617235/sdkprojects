"""
SDK Share Platform - SDK 服务层
处理 SDK 的 CRUD 操作，支持高并发和用户体系
"""
import hashlib
import random
import string
import time
from datetime import datetime
from typing import List, Optional

from loguru import logger

from app.core.cache import cache_manager, cache_result
from app.core.config import settings
from app.core.database import DatabasePool, get_db


class SDKService:
    """SDK 服务"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        """生成唯一 ID"""
        return "".join(random.choices(string.hexdigits.lower(), k=16))

    def _generate_token(self, name: str) -> str:
        """生成分享 Token"""
        timestamp = str(int(time.time() * 1000))
        data = f"{name}:{timestamp}:{random.random()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    async def create_sdk(
        self,
        user_id: str,
        name: str,
        pages: List[dict],
        app_id: str = None,
        description: str = None,
        config: dict = None,
        status: str = "public",  # public 或 private
    ) -> dict:
        """创建 SDK"""
        sdk_id = self._generate_id()
        share_token = self._generate_token(name)
        now = datetime.utcnow()

        # 插入 SDK 主表
        import json
        await self.db.execute(
            """
            INSERT INTO sdk_shares (id, app_id, user_id, name, description, share_token, config, status, view_count, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            sdk_id,
            app_id,
            user_id,
            name,
            description,
            share_token,
            json.dumps(config or {}),
            status,
            0,
            now,
            now
        )

        # 插入页面
        for idx, page in enumerate(pages):
            await self.db.execute(
                """
                INSERT INTO sdk_pages (id, sdk_id, page_id, name, code, page_order, is_default, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                self._generate_id(),
                sdk_id,
                page.get("page_id", f"page_{idx + 1}"),
                page.get("name", f"页面 {idx + 1}"),
                page.get("code", ""),
                idx,
                page.get("is_default", idx == 0),
                now,
                now
            )

        # 返回创建的 SDK
        return await self.get_sdk_by_token(share_token)

    @cache_result(ttl=60)
    async def list_sdks(self, limit: int = 100, offset: int = 0) -> dict:
        """获取 SDK 列表（仅公开）"""
        # 获取总数
        total = await self.db.fetchval(
            "SELECT COUNT(*) FROM sdk_shares WHERE status = 'public'"
        )
        
        # 获取列表
        rows = await self.db.fetch(
            """
            SELECT s.id, s.app_id, s.user_id, s.name, s.description, s.share_token, s.config, s.status, s.view_count, s.created_at, s.updated_at,
                   (SELECT COUNT(*) FROM sdk_pages WHERE sdk_id = s.id) as page_count
            FROM sdk_shares s
            WHERE s.status = 'public'
            ORDER BY s.created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset
        )

        # 转换数据，确保所有必需的字段都存在
        import json
        result = []
        for row in rows:
            row_dict = dict(row)
            # 确保 app_id 字段存在
            if 'app_id' not in row_dict or row_dict['app_id'] is None:
                row_dict['app_id'] = None
            # 确保 user_id 字段存在
            if 'user_id' not in row_dict or row_dict['user_id'] is None:
                row_dict['user_id'] = ''
            # 确保 config 字段存在且是字典
            if 'config' not in row_dict or row_dict['config'] is None:
                row_dict['config'] = {}
            else:
                try:
                    if isinstance(row_dict['config'], str):
                        row_dict['config'] = json.loads(row_dict['config'])
                except json.JSONDecodeError:
                    row_dict['config'] = {}
            # 确保 status 字段存在
            if 'status' not in row_dict or row_dict['status'] is None:
                row_dict['status'] = 'public'
            # 确保 updated_at 字段存在
            if 'updated_at' not in row_dict or row_dict['updated_at'] is None:
                row_dict['updated_at'] = row_dict.get('created_at')
            # 确保 pages 字段存在
            row_dict['pages'] = []
            result.append(row_dict)

        return {'list': result, 'total': total}

    async def list_sdks_by_user(self, user_id: str, limit: int = 100, offset: int = 0) -> dict:
        """获取用户的 SDK 列表"""
        # 获取总数
        total = await self.db.fetchval(
            "SELECT COUNT(*) FROM sdk_shares WHERE user_id = $1",
            user_id
        )
        
        # 获取列表
        rows = await self.db.fetch(
            """
            SELECT s.id, s.app_id, s.user_id, s.name, s.description, s.share_token, s.config, s.status, s.view_count, s.created_at, s.updated_at,
                   (SELECT COUNT(*) FROM sdk_pages WHERE sdk_id = s.id) as page_count
            FROM sdk_shares s
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id,
            limit,
            offset
        )

        # 转换数据，确保所有必需的字段都存在
        import json
        result = []
        for row in rows:
            row_dict = dict(row)
            # 确保 app_id 字段存在
            if 'app_id' not in row_dict or row_dict['app_id'] is None:
                row_dict['app_id'] = None
            # 确保 user_id 字段存在
            if 'user_id' not in row_dict or row_dict['user_id'] is None:
                row_dict['user_id'] = ''
            # 确保 config 字段存在且是字典
            if 'config' not in row_dict or row_dict['config'] is None:
                row_dict['config'] = {}
            else:
                try:
                    if isinstance(row_dict['config'], str):
                        row_dict['config'] = json.loads(row_dict['config'])
                except json.JSONDecodeError:
                    row_dict['config'] = {}
            # 确保 status 字段存在
            if 'status' not in row_dict or row_dict['status'] is None:
                row_dict['status'] = 'public'
            # 确保 updated_at 字段存在
            if 'updated_at' not in row_dict or row_dict['updated_at'] is None:
                row_dict['updated_at'] = row_dict.get('created_at')
            # 确保 pages 字段存在
            row_dict['pages'] = []
            result.append(row_dict)

        return {'list': result, 'total': total}

    # 暂时移除缓存，避免 sdk_pages 查询超时导致空数据被缓存
    # @cache_result(ttl=300)
    async def get_sdk_by_token(self, token: str) -> Optional[dict]:
        """通过 Token 获取 SDK 详情"""
        try:
            # 查询 SDK 主表（设置10秒超时）
            sdk_row = await self.db.fetchrow(
                "SELECT * FROM sdk_shares WHERE share_token = $1",
                token,
                timeout=10
            )

            if not sdk_row:
                return None

            sdk_data = dict(sdk_row)

            # 解析 config 字段（从 JSON 字符串转换为字典）
            import json
            config = sdk_data.get("config")
            if config:
                try:
                    config = json.loads(config)
                except json.JSONDecodeError:
                    config = {}
            else:
                config = {}

            # 查询页面（设置15秒超时）
            pages_rows = await self.db.fetch(
                """
                SELECT id, sdk_id, page_id, name, code, page_order, is_default
                FROM sdk_pages
                WHERE sdk_id = $1
                ORDER BY page_order
                """,
                sdk_data["id"],
                timeout=15
            )

            pages = [dict(p) for p in pages_rows]

            return {
                "id": sdk_data["id"],
                "user_id": sdk_data.get("user_id"),
                "app_id": sdk_data.get("app_id"),
                "name": sdk_data["name"],
                "description": sdk_data.get("description"),
                "share_token": sdk_data["share_token"],
                "config": config,
                "status": sdk_data.get("status", "active"),
                "view_count": sdk_data.get("view_count", 0),
                "created_at": sdk_data["created_at"],
                "updated_at": sdk_data["updated_at"],
                "pages": pages,
                "page_count": len(pages),
            }
        except Exception as e:
            logger.error(f"获取 SDK 详情失败 (token: {token}): {e}")
            raise

    async def update_sdk_pages(self, token: str, pages: List[dict]) -> bool:
        """更新 SDK 页面内容"""
        sdk = await self.get_sdk_by_token(token)
        if not sdk:
            return False
        
        now = datetime.utcnow()
        
        # 删除旧的页面
        await self.db.execute(
            "DELETE FROM sdk_pages WHERE sdk_id = $1",
            sdk["id"]
        )
        
        # 插入新的页面
        for idx, page in enumerate(pages):
            await self.db.execute(
                """
                INSERT INTO sdk_pages (id, sdk_id, page_id, name, code, page_order, is_default, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                self._generate_id(),
                sdk["id"],
                page.get("page_id", f"page_{idx + 1}"),
                page.get("name", f"页面 {idx + 1}"),
                page.get("code", ""),
                idx,
                page.get("is_default", idx == 0),
                now,
                now
            )
        
        # 清除缓存
        await self._clear_sdk_cache(token)
        
        return True

    async def delete_sdk(self, token: str) -> bool:
        """删除 SDK"""
        sdk = await self.get_sdk_by_token(token)
        if not sdk:
            return False

        # 删除页面
        await self.db.execute(
            "DELETE FROM sdk_pages WHERE sdk_id = $1",
            sdk["id"]
        )

        # 删除 SDK
        await self.db.execute(
            "DELETE FROM sdk_shares WHERE id = $1",
            sdk["id"]
        )

        # 清除缓存
        await self._clear_sdk_cache(token)

        return True

    async def increment_view_count(self, token: str):
        """增加访问计数"""
        try:
            await self.db.execute(
                "UPDATE sdk_shares SET view_count = view_count + 1 WHERE share_token = $1",
                token
            )
        except Exception as e:
            logger.warning(f"更新访问计数失败: {e}")

    async def _clear_sdk_cache(self, token: str):
        """清除 SDK 相关缓存"""
        cache_key = f"get_sdk_by_token:{token}"
        await cache_manager.delete(cache_key)


async def get_sdk_service() -> SDKService:
    """获取 SDK 服务实例（依赖注入）"""
    db = await get_db()
    return SDKService(db)
