"""
对话历史管理服务
管理多轮对话上下文和对话历史
"""
import hashlib
import random
import string
import time
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from loguru import logger

from app.core.database import DatabasePool


class ConversationService:
    """对话服务 - 管理对话历史和上下文"""

    def __init__(self, db: DatabasePool):
        self.db = db

    def _generate_id(self) -> str:
        """生成唯一ID"""
        return "".join(random.choices(string.hexdigits.lower(), k=16))

    def _generate_token(self) -> str:
        """生成会话Token"""
        timestamp = str(int(time.time() * 1000))
        data = f"session:{timestamp}:{random.random()}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]

    async def create_session(
        self,
        agent_id: str,
        user_name: str,
        user_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        创建新对话会话

        Args:
            agent_id: AI助手ID
            user_name: 用户名
            user_id: 用户标识（可选）
            client_ip: 客户端IP（可选）
            user_agent: 浏览器UA（可选）

        Returns:
            会话信息
        """
        session_id = self._generate_id()
        session_token = self._generate_token()

        await self.db.execute(
            """
            INSERT INTO ai_sessions (
                id, agent_id, session_token, user_name, user_id,
                client_ip, user_agent, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            session_id,
            agent_id,
            session_token,
            user_name,
            user_id,
            client_ip,
            user_agent,
            'active',
            datetime.utcnow()
        )

        logger.info(f"[对话服务] 创建会话成功 - SessionID: {session_id}, User: {user_name}")

        return {
            "session_id": session_id,
            "session_token": session_token,
            "user_name": user_name,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }

    async def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """
        获取会话信息

        Args:
            session_token: 会话Token

        Returns:
            会话信息或None
        """
        row = await self.db.fetchrow(
            """
            SELECT id, agent_id, session_token, user_name, user_id,
                   client_ip, user_agent, status, last_message_at, created_at
            FROM ai_sessions
            WHERE session_token = $1 AND status = 'active'
            """,
            session_token
        )

        if not row:
            return None

        return {
            "id": row["id"],
            "agent_id": row["agent_id"],
            "session_token": row["session_token"],
            "user_name": row["user_name"],
            "user_id": row["user_id"],
            "client_ip": row["client_ip"],
            "user_agent": row["user_agent"],
            "status": row["status"],
            "last_message_at": row["last_message_at"].isoformat() if row["last_message_at"] else None,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }

    async def get_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        通过ID获取会话信息

        Args:
            session_id: 会话ID

        Returns:
            会话信息或None
        """
        row = await self.db.fetchrow(
            """
            SELECT id, agent_id, session_token, user_name, user_id,
                   client_ip, user_agent, status, last_message_at, created_at
            FROM ai_sessions
            WHERE id = $1
            """,
            session_id
        )

        if not row:
            return None

        return {
            "id": row["id"],
            "agent_id": row["agent_id"],
            "session_token": row["session_token"],
            "user_name": row["user_name"],
            "user_id": row["user_id"],
            "client_ip": row["client_ip"],
            "user_agent": row["user_agent"],
            "status": row["status"],
            "last_message_at": row["last_message_at"].isoformat() if row["last_message_at"] else None,
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        添加消息到会话

        Args:
            session_id: 会话ID
            role: 角色 (user, assistant, system)
            content: 消息内容
            metadata: 额外元数据

        Returns:
            消息信息
        """
        message_id = self._generate_id()
        message_token = self._generate_token()

        # 插入消息
        await self.db.execute(
            """
            INSERT INTO ai_messages (
                id, session_id, role, content, message_token, metadata, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            message_id,
            session_id,
            role,
            content,
            message_token,
            metadata or {},
            datetime.utcnow()
        )

        # 更新会话最后消息时间
        await self.db.execute(
            """
            UPDATE ai_sessions
            SET last_message_at = $1
            WHERE id = $2
            """,
            datetime.utcnow(),
            session_id
        )

        logger.debug(f"[对话服务] 添加消息 - SessionID: {session_id}, Role: {role}")

        return {
            "message_id": message_id,
            "message_token": message_token,
            "session_id": session_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat()
        }

    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        获取对话历史

        Args:
            session_id: 会话ID
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            消息列表
        """
        rows = await self.db.fetch(
            """
            SELECT id, role, content, message_token, metadata, created_at
            FROM ai_messages
            WHERE session_id = $1
            ORDER BY created_at ASC
            LIMIT $2 OFFSET $3
            """,
            session_id,
            limit,
            offset
        )

        messages = []
        for row in rows:
            messages.append({
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "message_token": row["message_token"],
                "metadata": row["metadata"] or {},
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            })

        return messages

    async def get_conversation_context(
        self,
        session_id: str,
        max_context_length: int = 10
    ) -> List[Dict[str, str]]:
        """
        获取对话上下文（用于多轮对话）

        Args:
            session_id: 会话ID
            max_context_length: 最大上下文消息数

        Returns:
            格式化的上下文消息列表
        """
        # 获取最近的消息作为上下文
        rows = await self.db.fetch(
            """
            SELECT role, content
            FROM ai_messages
            WHERE session_id = $1 AND role IN ('user', 'assistant')
            ORDER BY created_at DESC
            LIMIT $2
            """,
            session_id,
            max_context_length
        )

        # 反转顺序，按时间正序排列
        context = []
        for row in reversed(rows):
            context.append({
                "role": row["role"],
                "content": row["content"]
            })

        return context

    async def list_user_conversations(
        self,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        获取用户的对话列表

        Args:
            user_id: 用户ID
            user_name: 用户名
            agent_id: AI助手ID
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            对话列表和总数
        """
        # 构建查询条件
        conditions = ["status = 'active'"]
        params = []
        param_idx = 1

        if user_id:
            conditions.append(f"user_id = ${param_idx}")
            params.append(user_id)
            param_idx += 1

        if user_name:
            conditions.append(f"user_name = ${param_idx}")
            params.append(user_name)
            param_idx += 1

        if agent_id:
            conditions.append(f"agent_id = ${param_idx}")
            params.append(agent_id)
            param_idx += 1

        where_clause = " AND ".join(conditions)

        # 获取总数
        count_sql = f"SELECT COUNT(*) FROM ai_sessions WHERE {where_clause}"
        total = await self.db.fetchval(count_sql, *params)

        # 获取列表
        list_sql = f"""
            SELECT id, agent_id, session_token, user_name, user_id,
                   last_message_at, created_at,
                   (SELECT COUNT(*) FROM ai_messages WHERE session_id = ai_sessions.id) as message_count
            FROM ai_sessions
            WHERE {where_clause}
            ORDER BY last_message_at DESC NULLS LAST, created_at DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        params.extend([limit, offset])

        rows = await self.db.fetch(list_sql, *params)

        conversations = []
        for row in rows:
            conversations.append({
                "id": row["id"],
                "agent_id": row["agent_id"],
                "session_token": row["session_token"],
                "user_name": row["user_name"],
                "user_id": row["user_id"],
                "last_message_at": row["last_message_at"].isoformat() if row["last_message_at"] else None,
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "message_count": row["message_count"]
            })

        return {
            "list": conversations,
            "total": total,
            "limit": limit,
            "offset": offset
        }

    async def close_session(self, session_token: str) -> bool:
        """
        关闭会话

        Args:
            session_token: 会话Token

        Returns:
            是否成功
        """
        result = await self.db.execute(
            """
            UPDATE ai_sessions
            SET status = 'closed'
            WHERE session_token = $1
            """,
            session_token
        )

        logger.info(f"[对话服务] 关闭会话 - SessionToken: {session_token}")
        return True

    async def delete_session(self, session_id: str) -> bool:
        """
        删除会话及其消息

        Args:
            session_id: 会话ID

        Returns:
            是否成功
        """
        # 删除消息
        await self.db.execute(
            "DELETE FROM ai_messages WHERE session_id = $1",
            session_id
        )

        # 删除会话
        await self.db.execute(
            "DELETE FROM ai_sessions WHERE id = $1",
            session_id
        )

        logger.info(f"[对话服务] 删除会话 - SessionID: {session_id}")
        return True


# 服务实例管理
_conversation_service: Optional[ConversationService] = None


def get_conversation_service(db: DatabasePool) -> ConversationService:
    """获取对话服务实例"""
    global _conversation_service
    if _conversation_service is None:
        _conversation_service = ConversationService(db)
    return _conversation_service
