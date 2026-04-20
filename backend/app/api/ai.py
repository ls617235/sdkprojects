"""
AI助手SDK API路由
支持预览模式：第三方零开发，只需粘贴代码+透传用户名
"""
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import PlainTextResponse, Response
from typing import Optional
from loguru import logger
from pydantic import BaseModel
import json

from app.core.database import get_db
from app.services.ai_agent_service import AIAgentService, get_ai_agent_service
from app.services.ai_sdk_bundler import generate_ai_sdk_embed_code


router = APIRouter(prefix="/api/ai", tags=["AI助手SDK"])


class AIMessageRequest(BaseModel):
    session_token: str
    message: str


def get_client_info(request: Request) -> tuple:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    return client_ip, user_agent


@router.get("/init")
async def ai_init(
    agent_id: str = Query(..., description="Agent ID"),
    user_name: str = Query(..., description="用户名"),
    request: Request = None,
):
    """AI初始化接口"""
    try:
        client_ip, user_agent = get_client_info(request)
        
        ai_service = await get_ai_agent_service()
        result = await ai_service.init_session(
            agent_id=agent_id,
            user_name=user_name,
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        logger.info(f"AI会话初始化: agent={agent_id}, user={user_name}")
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"AI初始化失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/message")
async def ai_send_message(body: AIMessageRequest, request: Request = None):
    """发送消息"""
    try:
        ai_service = await get_ai_agent_service()
        
        session = await ai_service.verify_session_token(body.session_token)
        if not session:
            raise HTTPException(status_code=401, detail="会话已过期")
        
        await ai_service.save_message(
            session_id=session["session_id"],
            role="user",
            content=body.message
        )
        
        agent_config = {"greeting": session.get("greeting", "你好")}
        
        ai_response = await ai_service.generate_preview_response(
            message=body.message,
            agent_config=agent_config
        )
        
        ai_msg = await ai_service.save_message(
            session_id=session["session_id"],
            role="assistant",
            content=ai_response,
            metadata={"model": "preview"}
        )
        
        return {
            "success": True,
            "data": {
                "content": ai_response,
                "message_token": ai_msg["message_token"],
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"消息发送失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def ai_get_history(
    session_token: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
):
    """获取聊天历史"""
    try:
        ai_service = await get_ai_agent_service()
        session = await ai_service.verify_session_token(session_token)
        if not session:
            raise HTTPException(status_code=401, detail="会话已过期")
        
        messages = await ai_service.get_session_messages(session["session_id"], limit)
        
        return {
            "success": True,
            "data": {
                "messages": [
                    {
                        "role": m["role"],
                        "content": m["content"],
                        "created_at": m["created_at"].isoformat() if m.get("created_at") else None
                    }
                    for m in messages
                ]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取历史失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/{agent_id}")
async def ai_get_config(agent_id: str):
    """获取Agent公开配置"""
    try:
        db = await get_db()
        agent = await db.fetchrow(
            "SELECT * FROM ai_agents WHERE id = $1 AND is_active = TRUE",
            agent_id
        )
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent不存在")
        
        config = json.loads(agent["config"]) if agent.get("config") else {}
        
        return {
            "success": True,
            "data": {
                "agent_id": agent["id"],
                "name": agent["name"],
                "avatar": agent.get("avatar"),
                "greeting": agent.get("greeting"),
                "description": agent.get("description"),
                "theme_color": config.get("theme_color", "#4F46E5"),
                "position": config.get("position", "right"),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取配置失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
