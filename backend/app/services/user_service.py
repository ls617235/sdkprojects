"""
SDK Share Platform - 用户服务
"""
import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from loguru import logger

from app.core.database import DatabasePool


class UserService:
    """用户服务"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        return secrets.token_hex(16)

    def _hash_password(self, password: str) -> str:
        """密码哈希"""
        salt = os.urandom(32)
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return salt.hex() + ':' + key.hex()

    def _verify_password(self, password: str, stored: str) -> bool:
        """验证密码"""
        try:
            salt, key = stored.split(':')
            new_key = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode(),
                bytes.fromhex(salt),
                100000
            )
            return new_key.hex() == key
        except Exception:
            return False

    def _generate_token(self, user_id: str) -> str:
        """生成认证 Token"""
        data = f"{user_id}:{secrets.token_hex(16)}:{datetime.utcnow().timestamp()}"
        return hashlib.sha256(data.encode()).hexdigest()

    async def register(self, email: str, password: str, name: str = None) -> dict:
        """用户注册"""
        # 检查邮箱是否已存在
        existing = await self.db.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            email
        )
        if existing:
            raise ValueError("邮箱已被注册")

        user_id = self._generate_id()
        now = datetime.utcnow()

        # 创建用户
        await self.db.execute(
            """
            INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            user_id,
            email,
            self._hash_password(password),
            name or email.split("@")[0],
            "user",
            "active",
            now,
            now
        )

        # 生成 Token
        token = self._generate_token(user_id)

        return {
            "user": {
                "id": user_id,
                "email": email,
                "name": name or email.split("@")[0],
                "role": "user",
                "created_at": now.isoformat(),
            },
            "token": token,
        }

    async def login(self, email: str, password: str) -> dict:
        """用户登录"""
        user = await self.db.fetchrow(
            "SELECT * FROM users WHERE email = $1",
            email
        )

        if not user:
            raise ValueError("邮箱或密码错误")

        if user["status"] != "active":
            raise ValueError("账号已被禁用")

        if not self._verify_password(password, user["password_hash"]):
            raise ValueError("邮箱或密码错误")

        # 更新最后登录时间
        now = datetime.utcnow()
        await self.db.execute(
            "UPDATE users SET last_login_at = $1 WHERE id = $2",
            now,
            user["id"]
        )

        # 生成 Token
        token = self._generate_token(user["id"])

        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
            },
            "token": token,
        }

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """通过 ID 获取用户"""
        user = await self.db.fetchrow(
            "SELECT id, email, name, role, status, created_at, updated_at, last_login_at FROM users WHERE id = $1",
            user_id
        )
        if user:
            return dict(user)
        return None


class APIKeyService:
    """API Key 服务"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        return secrets.token_hex(16)

    def _generate_key(self) -> tuple[str, str, str]:
        """生成 API Key
        返回: (完整 key, key_hash, key_prefix)
        """
        # 生成格式: sk_live_xxxxxxxxxxxxxxxx
        key = f"sk_live_{secrets.token_hex(24)}"
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        key_prefix = key[:11]  # sk_live_xxx
        return key, key_hash, key_prefix

    async def create_key(self, user_id: str, name: str, permissions: list = None,
                         rate_limit: int = 1000, expires_days: int = None) -> dict:
        """创建 API Key"""
        key_id = self._generate_id()
        key, key_hash, key_prefix = self._generate_key()
        now = datetime.utcnow()

        expires_at = None
        if expires_days:
            expires_at = now + timedelta(days=expires_days)

        # 插入 API Key
        await self.db.execute(
            """
            INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, permissions, rate_limit, usage_count, expires_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            key_id,
            user_id,
            name,
            key_hash,
            key_prefix,
            permissions or ["read", "write"],
            rate_limit,
            0,
            expires_at,
            now,
            now
        )

        return {
            "id": key_id,
            "name": name,
            "key": key,  # 仅此一次返回完整 key
            "key_prefix": key_prefix,
            "permissions": permissions or ["read", "write"],
            "rate_limit": rate_limit,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "created_at": now.isoformat(),
        }

    async def list_keys(self, user_id: str) -> list:
        """获取用户的 API Key 列表"""
        rows = await self.db.fetch(
            """
            SELECT id, name, key_prefix, permissions, rate_limit, usage_count, last_used_at, expires_at, created_at
            FROM api_keys
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )
        return [dict(row) for row in rows]

    async def verify_key(self, key: str) -> Optional[dict]:
        """验证 API Key"""
        key_hash = hashlib.sha256(key.encode()).hexdigest()

        key_data = await self.db.fetchrow(
            """
            SELECT id, user_id, name, permissions, rate_limit, usage_count, expires_at
            FROM api_keys
            WHERE key_hash = $1
            """,
            key_hash
        )

        if not key_data:
            return None

        # 检查是否过期
        if key_data["expires_at"]:
            if datetime.utcnow() > key_data["expires_at"]:
                return None

        # 更新使用次数和最后使用时间
        now = datetime.utcnow()
        await self.db.execute(
            """
            UPDATE api_keys
            SET usage_count = usage_count + 1, last_used_at = $1
            WHERE id = $2
            """,
            now,
            key_data["id"]
        )

        return dict(key_data)

    async def delete_key(self, user_id: str, key_id: str) -> bool:
        """删除 API Key"""
        result = await self.db.execute(
            "DELETE FROM api_keys WHERE id = $1 AND user_id = $2",
            key_id,
            user_id
        )
        return result == "DELETE 1"

    async def get_test_key(self) -> Optional[dict]:
        """获取测试 API Key"""
        # 查找测试用户的 API Key
        test_key = await self.db.fetchrow(
            """
            SELECT id, user_id, name, permissions, rate_limit, usage_count, expires_at
            FROM api_keys
            WHERE user_id = 'test_user'
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
        if test_key:
            return dict(test_key)
        return None

    async def create_test_key(self) -> Optional[dict]:
        """创建测试 API Key"""
        try:
            # 检查测试用户是否存在
            test_user = await self.db.fetchrow(
                "SELECT id FROM users WHERE id = 'test_user'"
            )
            
            if not test_user:
                # 创建测试用户
                await self.db.execute(
                    """
                    INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    'test_user',
                    'test@example.com',
                    'test_password_hash',
                    '测试用户',
                    'user',
                    'active',
                    datetime.utcnow(),
                    datetime.utcnow()
                )
            
            # 创建测试 API Key
            key_id = self._generate_id()
            key, key_hash, key_prefix = self._generate_key()
            now = datetime.utcnow()
            
            await self.db.execute(
                """
                INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, permissions, rate_limit, usage_count, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """,
                key_id,
                'test_user',
                '测试 API Key',
                key_hash,
                key_prefix,
                ['read', 'write'],
                1000,
                0,
                now,
                now
            )
            
            return {
                "id": key_id,
                "user_id": 'test_user',
                "name": '测试 API Key',
                "permissions": ['read', 'write'],
                "rate_limit": 1000
            }
        except Exception as e:
            logger.error(f"创建测试 API Key 失败: {e}")
            return None


class AppService:
    """应用服务"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        return secrets.token_hex(16)

    async def create_app(self, user_id: str, name: str, description: str = None,
                         scene: str = None, config: dict = None) -> dict:
        """创建应用"""
        app_id = self._generate_id()
        now = datetime.utcnow()

        await self.db.execute(
            """
            INSERT INTO apps (id, user_id, name, description, scene, config, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            app_id,
            user_id,
            name,
            description,
            scene,
            config or {},
            "active",
            now,
            now
        )

        return await self.get_app(user_id, app_id)

    async def list_apps(self, user_id: str) -> list:
        """获取用户的应用列表"""
        rows = await self.db.fetch(
            """
            SELECT * FROM apps
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id
        )

        apps = [dict(row) for row in rows]

        # 获取每个应用的 SDK 数量
        for app in apps:
            count = await self.db.fetchval(
                "SELECT COUNT(*) FROM sdk_shares WHERE app_id = $1",
                app["id"]
            )
            app["sdk_count"] = count or 0

        return apps

    async def get_app(self, user_id: str, app_id: str) -> Optional[dict]:
        """获取应用详情"""
        row = await self.db.fetchrow(
            "SELECT * FROM apps WHERE id = $1 AND user_id = $2",
            app_id,
            user_id
        )
        return dict(row) if row else None
