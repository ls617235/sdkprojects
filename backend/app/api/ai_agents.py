"""
AI助手管理 API路由
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from typing import Optional
from loguru import logger
from pydantic import BaseModel
import secrets
import json

from app.core.database import get_db
from app.services.ai_sdk_bundler import generate_ai_sdk_embed_code


router = APIRouter(prefix="/api/sdk/ai-agents", tags=["AI助手管理"])


class AIAgentCreate(BaseModel):
    sdk_id: str
    name: str
    avatar: Optional[str] = None
    greeting: Optional[str] = "你好！有什么可以帮您的吗？"
    description: Optional[str] = None
    model: Optional[str] = "preview"
    config: Optional[dict] = {}


@router.get("")
async def list_ai_agents():
    """获取AI助手列表"""
    try:
        db = await get_db()
        query = """
            SELECT a.*, s.name as sdk_name, s.share_token
            FROM ai_agents a
            LEFT JOIN sdk_shares s ON a.sdk_id = s.id
            WHERE a.is_active = TRUE
            ORDER BY a.created_at DESC
        """
        results = await db.fetch(query)
        
        agents = []
        for row in results:
            agent = dict(row)
            if agent.get('config') and isinstance(agent['config'], str):
                agent['config'] = json.loads(agent['config'])
            agents.append(agent)
        
        return {"success": True, "data": agents}
    except Exception as e:
        logger.error(f"获取AI助手列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_ai_agent(data: AIAgentCreate):
    """创建AI助手"""
    try:
        agent_id = secrets.token_hex(16)
        
        db = await get_db()
        query = """
            INSERT INTO ai_agents (id, sdk_id, name, avatar, greeting, description, model, config)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """
        result = await db.fetchrow(
            query, agent_id, data.sdk_id, data.name, data.avatar,
            data.greeting, data.description, data.model, json.dumps(data.config or {})
        )
        
        agent = dict(result)
        if agent.get('config') and isinstance(agent['config'], str):
            agent['config'] = json.loads(agent['config'])
        
        return {
            "success": True,
            "data": {
                **agent,
                "preview_token": f"ai_{agent_id[:16]}"
            }
        }
    except Exception as e:
        logger.error(f"创建AI助手失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/embed")
async def get_ai_sdk_embed(agent_id: str):
    """获取AI助手SDK嵌入代码"""
    try:
        db = await get_db()
        agent = await db.fetchrow(
            "SELECT * FROM ai_agents WHERE id = $1 AND is_active = TRUE",
            agent_id
        )
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent不存在")
        
        config = json.loads(agent["config"]) if agent.get("config") else {}
        
        embed = generate_ai_sdk_embed_code(
            agent_id=agent["id"],
            name=agent["name"],
            avatar=agent.get("avatar"),
            greeting=agent.get("greeting", "你好！有什么可以帮您的吗？"),
            theme_color=config.get("theme_color", "#4F46E5"),
            position=config.get("position", "right"),
            bottom=config.get("bottom", 20),
            side_margin=config.get("side_margin", 20),
        )
        
        return Response(
            content=embed["code"],
            media_type="application/javascript; charset=utf-8",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取SDK嵌入代码失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{agent_id}")
async def delete_ai_agent(agent_id: str):
    """删除AI助手"""
    try:
        db = await get_db()
        await db.execute(
            "UPDATE ai_agents SET is_active = FALSE WHERE id = $1",
            agent_id
        )
        return {"success": True, "message": "已删除"}
    except Exception as e:
        logger.error(f"删除AI助手失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
