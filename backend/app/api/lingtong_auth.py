"""
灵童平台认证 API
与灵童平台交互，获取Token并封装到请求中
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from loguru import logger

from app.core.config import settings
from app.services.lingtong_client import get_lingtong_client, init_lingtong_client, LingTongClient


router = APIRouter(prefix="/api/lingtong", tags=["灵童平台"])


class LingTongLogin(BaseModel):
    """灵童平台登录"""
    username: str
    login_type: str = "account"


class LingTongRequest(BaseModel):
    """带Token的请求"""
    endpoint: str
    method: str = "GET"
    data: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None


def get_client() -> LingTongClient:
    """获取或创建灵童客户端"""
    client = get_lingtong_client()
    if not client:
        # 使用配置中的灵童平台地址
        client = init_lingtong_client(
            base_url=settings.LINGTONG_BASE_URL,
            app_id=settings.LINGTONG_APP_ID,
            app_secret=settings.LINGTONG_APP_SECRET
        )
    return client


@router.post("/login", summary="登录获取Token")
async def lingtong_login(login_data: LingTongLogin):
    """
    调用灵童平台登录接口获取Token
    
    请求:
        POST /api/lingtong/login
        {
            "username": "zhangsan",
            "password": "123456",  // 可选
            "login_type": "account"
        }
    
    响应:
        {
            "success": true,
            "token": "xxx",
            "user_role": "admin"
        }
    """
    client = get_client()
    result = await client.login(
        username=login_data.username,
        login_type=login_data.login_type
    )
    
    if result.get("success"):
        return {
            "success": True,
            "data": {
                "token": result.get("token"),
                "token_expiry": result.get("token_expiry"),
                "user_role": result.get("user_role")
            }
        }
    else:
        return {
            "success": False,
            "message": result.get("message", "登录失败")
        }


@router.post("/request", summary="带Token的请求")
async def lingtong_request(request_data: LingTongRequest):
    """
    使用已获取的Token向灵童平台发起请求
    
    请求:
        POST /api/lingtong/request
        {
            "endpoint": "/api/user/info",
            "method": "GET"
        }
    
    响应:
        灵童平台的响应数据
    """
    client = get_client()
    
    if not client.token:
        raise HTTPException(status_code=401, detail="未登录，请先调用 /api/lingtong/login")
    
    result = await client.request(
        method=request_data.method,
        endpoint=request_data.endpoint,
        data=request_data.data,
        params=request_data.params,
        require_auth=True
    )
    
    return result


@router.get("/status", summary="检查Token状态")
async def lingtong_status():
    """检查当前Token状态"""
    client = get_client()
    return {
        "success": True,
        "has_token": client.token is not None,
        "token": client.token[:20] + "..." if client.token else None
    }


@router.post("/logout", summary="清除Token")
async def lingtong_logout():
    """清除已获取的Token"""
    client = get_client()
    if client:
        client.set_token(None)
    return {"success": True, "message": "已清除Token"}


# ==========================================
# 配置灵童平台连接（供管理员使用）
# ==========================================

class LingTongConfig(BaseModel):
    """灵童平台配置"""
    base_url: str
    app_id: Optional[str] = None
    app_secret: Optional[str] = None


@router.post("/config", summary="配置灵童平台")
async def configure_lingtong(config: LingTongConfig):
    """
    配置灵童平台连接信息
    
    请求:
        POST /api/lingtong/config
        {
            "base_url": "http://lingtong.example.com",
            "app_id": "xxx",
            "app_secret": "xxx"
        }
    """
    client = init_lingtong_client(
        base_url=config.base_url,
        app_id=config.app_id,
        app_secret=config.app_secret
    )
    
    return {
        "success": True,
        "message": "灵童平台配置成功",
        "base_url": config.base_url
    }


@router.get("/config", summary="获取灵童平台配置")
async def get_lingtong_config():
    """获取当前灵童平台配置（不包含密钥）"""
    client = get_client()
    if not client:
        return {
            "success": False,
            "message": "未配置灵童平台"
        }
    
    return {
        "success": True,
        "data": {
            "base_url": client.base_url,
            "has_app_id": bool(client.app_id),
            "has_token": bool(client._token)
        }
    }
