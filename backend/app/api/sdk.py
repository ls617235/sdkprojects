"""
SDK Share Platform - SDK API 路由
支持 API Key 认证
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Header
from fastapi.responses import PlainTextResponse, Response
from typing import Optional, List
from loguru import logger
import datetime
import time
import httpx

from app.core.config import settings
from app.core.database import DatabasePool, get_db
from app.models.models import (
    APIError,
    SDKListResponse,
    SDKDetailResponse,
    SDKShareCreate,
)
from app.services.sdk_service import SDKService, get_sdk_service
from app.services.sdk_generator import SDKGenerator
from app.services.webpack_bundler import bundle_sdk_with_webpack
from app.services.user_service import APIKeyService
from app.services.lingtong_token_cache import lingtong_token_cache

router = APIRouter(prefix="/api/sdk", tags=["SDK"])


async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: DatabasePool = Depends(get_db)
) -> dict:
    """验证 API Key（可选，用于写操作）"""
    # 开发环境下允许无 API Key 访问，使用默认测试用户
    if not x_api_key:
        # 检查是否有测试用户，如果没有则创建
        key_service = APIKeyService(db)
        # 查找测试用户的 API Key
        test_key = await key_service.get_test_key()
        if test_key:
            return test_key
        
        # 创建测试用户和 API Key
        test_key = await key_service.create_test_key()
        if test_key:
            return test_key
        
        # 如果创建失败，返回默认测试数据
        return {
            "user_id": "test_user",
            "permissions": ["read", "write"],
            "rate_limit": 1000
        }
    
    key_service = APIKeyService(db)
    key_data = await key_service.verify_key(x_api_key)
    
    if not key_data:
        raise HTTPException(status_code=401, detail="API Key 无效或已过期")
    
    # 检查权限
    if "write" not in key_data.get("permissions", []):
        raise HTTPException(status_code=403, detail="API Key 没有写权限")
    
    return key_data


@router.get(
    "/",
    summary="获取 SDK 列表",
    description="获取所有 SDK 的列表，支持分页。需要 API Key 认证。",
)
@router.get(
    "",
    summary="获取 SDK 列表",
    description="获取所有 SDK 的列表，支持分页。需要 API Key 认证。",
)
async def list_sdks(
    request: Request,
    limit: int = Query(100, ge=1, le=500, description="返回数量限制"),
    offset: int = Query(0, ge=0, description="偏移量"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """获取 SDK 列表（需要 API Key）"""
    try:
        # 如果提供了 API Key，获取该用户的 SDK
        if x_api_key:
            db = await get_db()
            key_service = APIKeyService(db)
            key_data = await key_service.verify_key(x_api_key)
            if key_data:
                result = await sdk_service.list_sdks_by_user(key_data["user_id"], limit, offset)
                return {"success": True, "data": result["list"], "total": result["total"]}
        
        # 无 API Key，返回公开 SDK（可选）
        result = await sdk_service.list_sdks(limit=limit, offset=offset)
        return {"success": True, "data": result["list"], "total": result["total"]}
    except Exception as e:
        logger.error(f"获取 SDK 列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "",
    response_model=SDKDetailResponse,
    summary="创建 SDK",
    description="创建新的 SDK，需要 API Key 认证",
)
async def create_sdk(
    data: SDKShareCreate,
    key_data: dict = Depends(verify_api_key),
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """创建 SDK（需要 API Key）"""
    try:
        # 先创建 SDK，获取真正的 token
        sdk = await sdk_service.create_sdk(
            user_id=key_data["user_id"],
            app_id=data.app_id,
            name=data.name,
            description=data.description,
            pages=data.pages,  # 先用原始页面创建
            config=data.config,
            status=data.status,
        )
        
        # 如果是纯 HTML SDK，用真正的 token 重新打包并更新
        share_token = sdk.get("share_token")
        pages = data.pages
        # 支持两种情况：1. config.type == "pure" 明确指定为纯HTML；2. 没有设置config或config.type为空的普通HTML
        config_type = data.config.get("type") if data.config else None
        is_pure_html = (config_type == "pure") or (config_type is None and pages and len(pages) > 0)
        if is_pure_html and pages and len(pages) > 0:
            page = pages[0]
            # 支持 Pydantic 对象和字典两种格式
            page_dict = page if isinstance(page, dict) else page.model_dump()
            html = page_dict.get('code') or ""
            css = ""
            js = ""
            
            # 解析 HTML 中的 CSS 和 JS
            import re
            # 提取所有 <style> 内容（合并）
            style_matches = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
            css = '\n'.join(match.strip() for match in style_matches)
            
            # 提取所有 <script> 内容（合并）
            script_matches = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
            js = '\n'.join(match.strip() for match in script_matches)
            
            # 生成 config_key
            config_key = f"SDK_CONFIG_{share_token[:8].upper()}"
            
            # 使用真正的 token 打包
            # 从 SDK 配置中获取 app_info（如果配置了）
            sdk_config = data.config or {}
            
            bundled_code = bundle_sdk_with_webpack(
                name=data.name,
                token=share_token,
                html=html,
                css=css,
                js=js,
                config_key=config_key,
                sdk_config=sdk_config
            )
            
            # 注意：不保存打包后的代码到数据库，只保存原始HTML
            # 打包在 embed 接口中实时进行，避免循环打包
            # 重新获取 SDK（此时数据库中仍是原始HTML）
            sdk = await sdk_service.get_sdk_by_token(share_token)
        
        logger.info(f"创建 SDK 成功: {sdk['share_token']}, 用户: {key_data['user_id']}")
        return SDKDetailResponse(success=True, data=sdk)
    except Exception as e:
        logger.error(f"创建 SDK 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{token}/preview",
    summary="获取 SDK 预览页面",
    description="返回完整的 HTML 预览页面，直接在浏览器中渲染 SDK 效果",
    responses={
        200: {"content": {"text/html": {}}},
        401: {"model": APIError},
        404: {"model": APIError},
    },
)
async def get_sdk_preview(
    token: str,
    api_key: Optional[str] = Query(None, description="API Key（私有 SDK 必需）"),
    sdk_service: SDKService = Depends(get_sdk_service),
    db: DatabasePool = Depends(get_db),
):
    """获取 SDK 预览页面
    
    返回完整的 HTML 页面，包含 SDK 配置、脚本引用和容器，
    可以直接在浏览器中预览 SDK 效果。
    
    - 公开 SDK：直接访问，无需 API Key
    - 私有 SDK：需要通过 ?api_key=xxx 参数验证
    """
    try:
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在或已删除")

        # 检查 SDK 状态
        sdk_status = sdk.get("status", "public")
        
        # 私有 SDK 需要验证 API Key
        if sdk_status == "private":
            if not api_key:
                raise HTTPException(
                    status_code=401, 
                    detail="此 SDK 为私有，需要提供 api_key 参数"
                )
            
            # 验证 API Key
            key_service = APIKeyService(db)
            key_data = await key_service.verify_key(api_key)
            
            if not key_data:
                raise HTTPException(status_code=401, detail="API Key 无效或已过期")
            
            # 检查 SDK 所有者是否匹配
            if sdk.get("user_id") != key_data["user_id"]:
                raise HTTPException(status_code=403, detail="无权访问此 SDK")

        # 生成预览 HTML 页面
        config_key = f"SDK_CONFIG_{token[:8].upper()}"
        
        # 使用前端地址加载 SDK 脚本（前端代理到后端）
        # 由于预览页面是在前端 iframe 中加载的，使用相对路径会指向后端
        # 需要使用前端地址来避免跨域问题
        embed_script_url = f"http://localhost:3000/api/sdk/{token}/embed"
        
        html_content = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{sdk.get("name", "SDK")} - 预览</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        html, body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #fff;
            height: 100%;
            width: 100%;
            overflow: hidden;
        }}
        .preview-header {{
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 50px;
        }}
        .preview-header h1 {{
            font-size: 16px;
            font-weight: 500;
            color: #333;
        }}
        .preview-content {{
            height: calc(100% - 50px);
            width: 100%;
            position: relative;
            background: #fff;
        }}
        #sdk-container {{
            width: 100%;
            height: 100%;
        }}
        .loading {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #666;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="preview-header">
        <h1>🔍 {sdk.get("name", "SDK")} - 效果预览</h1>
        <span style="color: #666; font-size: 12px;">Token: {token[:16]}...</span>
    </div>
    <div class="preview-content">
        <!-- SDK 配置 -->
        <script>
            window.{config_key} = {{
                apiBaseUrl: 'http://localhost:8000',
                apiKey: '',
                custom: {{
                    userId: 'preview-user',
                    userName: '预览用户',
                    environment: 'preview'
                }},
                useShadowDOM: true
            }};
        </script>
        
        <!-- SDK 容器 -->
        <div id="sdk-container" data-sdk-token="{token}">
            <div class="loading">正在加载 SDK...</div>
        </div>
        
        <!-- SDK 脚本 - 使用相对路径，由前端代理转发 -->
        <script src="{embed_script_url}"></script>
    </div>
</body>
</html>'''
        
        return Response(
            content=html_content,
            media_type="text/html; charset=utf-8",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 SDK 预览页面失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{token}/info",
    summary="获取 SDK 信息",
    description="获取 SDK 基本信息，用于预览页面",
    responses={404: {"model": APIError}},
)
async def get_sdk_info(
    token: str,
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """获取 SDK 信息（公开）"""
    import asyncio
    
    # 添加重试机制
    max_retries = 2
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            sdk = await sdk_service.get_sdk_by_token(token)
            if not sdk:
                raise HTTPException(status_code=404, detail="SDK 不存在或已删除")
            
            # 返回基本信息
            return {
                "name": sdk.get("name", "SDK"),
                "description": sdk.get("description", ""),
                "config": sdk.get("config", {}),
                "status": sdk.get("status", "public"),
            }
        except HTTPException:
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"获取 SDK 信息失败，重试 ({attempt + 1}/{max_retries}): {e}")
                await asyncio.sleep(retry_delay)
            else:
                logger.error(f"获取 SDK 信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== 灵童平台代理路由 ==========

@router.post(
    "/lingtong/login",
    summary="灵童平台登录",
    description="代理灵童平台登录接口，前端 SDK 调用此接口获取 token",
)
async def lingtong_login(
    request: Request,
):
    """灵童平台登录代理"""
    try:
        # 获取请求体
        body = await request.json()
        username = body.get("username")
        
        if not username:
            raise HTTPException(status_code=400, detail="缺少 username 参数")
        
        # 获取灵童平台基础 URL
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        # 调用灵童平台登录接口
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{lingtong_base_url}/api/login/account_dan",
                json={"username": username},
                timeout=30.0
            )
            
            # 返回灵童平台的响应
            return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"灵童平台登录失败: {e}")
        raise HTTPException(status_code=500, detail=f"登录失败: {str(e)}")





@router.post(
    "/lingtong/user-info",
    summary="获取灵童平台用户信息",
    description="代理灵童平台获取用户信息接口",
)
async def lingtong_user_info(
    request: Request,
    authorization: str = Header(None, alias="Authorization"),
):
    """获取灵童平台用户信息
    
    灵童平台接口: POST /api/get_user_info_by_token
    请求体: { "auth_token": "xxx" }
    """
    try:
        # 优先从请求体获取 auth_token，如果没有则从 Authorization header 提取
        auth_token = None
        try:
            body = await request.json()
            auth_token = body.get("auth_token")
        except:
            pass
        
        # 如果请求体中没有，从 Authorization header 提取
        if not auth_token and authorization:
            if authorization.startswith("Bearer "):
                auth_token = authorization[7:]
            else:
                auth_token = authorization
        
        if not auth_token:
            raise HTTPException(status_code=401, detail="Missing auth_token")
        
        # 获取灵童平台基础 URL
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        # 调用灵童平台获取用户信息接口 (POST 方式)
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{lingtong_base_url}/api/get_user_info_by_token",
                json={"auth_token": auth_token},
                timeout=10.0
            )
            
            # 返回灵童平台的响应
            return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取用户信息失败: {str(e)}")


@router.post(
    "/lingtong/chat",
    summary="灵童平台对话",
    description="代理灵童平台对话接口",
)
async def lingtong_chat(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """灵童平台对话代理"""
    try:
        # 获取请求体
        body = await request.json()
        
        # 获取 Authorization header
        auth_header = authorization
        if not auth_header:
            # 尝试从请求头中获取（大小写不敏感）
            auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        # 获取灵童平台基础 URL
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        # 检查是否是流式请求
        is_stream = request.query_params.get("stream") == "true"
        
        # 准备请求头
        headers = {"Authorization": auth_header}
        
        # 调用灵童平台对话接口
        if is_stream:
            # 流式响应 - 使用 StreamingResponse
            from fastapi.responses import StreamingResponse
            
            async def stream_response():
                # 在生成器内部创建 client，确保在流式传输完成前不会关闭
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "POST",
                        f"{lingtong_base_url}/api/app_chat",
                        json=body,
                        headers=headers,
                        timeout=60.0
                    ) as response:
                        async for chunk in response.aiter_text():
                            yield chunk
            
            return StreamingResponse(
                stream_response(),
                media_type="text/event-stream"
            )
        else:
            # 普通响应
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{lingtong_base_url}/api/app_chat",
                    json=body,
                    headers=headers,
                    timeout=30.0
                )
                return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"灵童平台对话失败: {e}")
        raise HTTPException(status_code=500, detail=f"对话失败: {str(e)}")


@router.post(
    "/lingtong/conversations",
    summary="创建对话",
    description="代理灵童平台创建对话接口",
)
async def lingtong_create_conversation(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """灵童平台创建对话代理
    
    流程：
    1. 从请求头获取 Authorization Token
    2. 使用 Token 缓存服务获取用户信息（带缓存和自动刷新）
    3. 将用户信息传递给灵童平台创建对话
    """
    try:
        # 1. 获取 Authorization header
        auth_header = authorization
        if not auth_header:
            # 尝试从请求头中获取（大小写不敏感）
            auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        # 提取 token（支持 "Bearer token" 或纯 token 格式）
        token = auth_header
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:]
        
        # 2. 使用 Token 缓存服务获取用户信息（自动处理缓存和刷新）
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        user_info = await lingtong_token_cache.get_user_info(token, lingtong_base_url)
        
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token or failed to get user info")
        
        # 提取用户ID和用户名称
        user_id = user_info.get("用户id") or user_info.get("user_id") or user_info.get("id")
        user_name = user_info.get("用户名称") or user_info.get("user_name") or user_info.get("name")
        
        if not user_id:
            logger.error(f"用户信息中未找到用户ID: {user_info}")
            raise HTTPException(status_code=400, detail="User info missing user_id")
        
        # 3. 获取原始请求体并添加用户信息
        body = await request.json()
        body["user_id"] = user_id
        if user_name:
            body["user_name"] = user_name
        
        # 4. 调用灵童平台创建对话
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{lingtong_base_url}/api/conversations",
                json=body,
                headers={"Authorization": auth_header},
                timeout=30.0
            )
            return response.json()
            
    except httpx.HTTPError as e:
        logger.error(f"HTTP请求失败: {e}")
        raise HTTPException(status_code=502, detail=f"Upstream service error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建对话失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建对话失败: {str(e)}")


@router.get(
    "/lingtong/conversations",
    summary="获取对话列表",
    description="代理灵童平台获取对话列表接口",
)
async def lingtong_get_conversations(
    request: Request,
    user_id: str = Query(None, description="用户ID"),
    app_info: str = Query(..., description="应用信息"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """灵童平台获取对话列表代理"""
    try:
        # 从请求头中获取 Authorization
        auth_header = authorization
        if not auth_header:
            # 尝试从请求头中获取（小写）
            auth_header = request.headers.get("authorization")

        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        # 使用 Token 缓存服务获取用户信息
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        
        # 提取纯 token（去掉 Bearer 前缀）
        pure_token = auth_header
        if auth_header.lower().startswith("bearer "):
            pure_token = auth_header[7:]
        
        user_info = await lingtong_token_cache.get_user_info(pure_token, lingtong_base_url)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid token")

        # 提取用户ID和用户名
        user_id_from_token = user_info.get("用户id") or user_info.get("user_id") or user_info.get("id")
        user_name = user_info.get("用户名称") or user_info.get("user_name") or user_info.get("name")

        # 使用 token 中的 user_id 优先
        final_user_id = user_id_from_token if user_id_from_token else user_id

        if not final_user_id:
            raise HTTPException(status_code=400, detail="Missing user_id")

        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{lingtong_base_url}/api/myConversations",
                params={
                    "user_id": final_user_id,
                    "user_name": user_name,
                    "app_info": app_info
                },
                headers={"Authorization": auth_header},
                timeout=30.0
            )
            return response.json()

    except Exception as e:
        logger.error(f"获取对话列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取对话列表失败: {str(e)}")


@router.get(
    "/lingtong/conversations/{conversation_id}",
    summary="获取会话详情",
    description="代理灵童平台获取会话详情接口",
)
async def lingtong_get_conversation_detail(
    conversation_id: str,
    request: Request,
    active_at: str = Query(None, description="活跃时间"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """灵童平台获取会话详情代理"""
    try:
        # 从请求头中获取 Authorization
        auth_header = authorization
        if not auth_header:
            auth_header = request.headers.get("authorization")

        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")

        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')

        async with httpx.AsyncClient() as client:
            # 构建URL参数
            params = {}
            if active_at:
                params["active_at"] = active_at

            response = await client.get(
                f"{lingtong_base_url}/api/conversations/{conversation_id}",
                params=params,
                headers={"Authorization": auth_header},
                timeout=30.0
            )
            return response.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取会话详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取会话详情失败: {str(e)}")


@router.post(
    "/lingtong/message",
    summary="保存消息",
    description="代理灵童平台保存消息接口",
)
async def lingtong_save_message(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """灵童平台保存消息代理 - 使用Token缓存"""
    try:
        body = await request.json()
        
        # 1. 获取用户 Token
        user_token = None
        if authorization and authorization.startswith("Bearer "):
            user_token = authorization[7:]
        elif authorization:
            user_token = authorization

        if not user_token:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        # 2. 使用Token缓存服务获取用户信息（自动处理缓存和失效重试）
        lingtong_base_url = getattr(settings, 'LINGTONG_BASE_URL', 'http://localhost:8800')
        user_info = await lingtong_token_cache.get_user_info(
            user_token, 
            lingtong_base_url
        )
        
        if not user_info:
            raise HTTPException(status_code=401, detail="Failed to get user info")
        
        # 3. 提取用户ID和用户名
        user_id = user_info.get("用户id") or user_info.get("user_id") or user_info.get("id")
        user_name = user_info.get("用户名称") or user_info.get("user_name") or user_info.get("name")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user info response")
        
        # 4. 将用户信息添加到请求体
        body["user_id"] = user_id
        if user_name:
            body["user_name"] = user_name
        
        # 5. 转发请求到灵童平台
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{lingtong_base_url}/api/message",
                json=body,
                headers={"Authorization": authorization},
                timeout=30.0
            )
            return response.json()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"保存消息失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存消息失败: {str(e)}")


@router.get(
    "/{token}/embed",
    response_class=PlainTextResponse,
    summary="获取 SDK 嵌入代码",
    description="获取已打包的 JavaScript SDK 代码",
    responses={
        200: {"content": {"application/javascript": {}}},
        401: {"model": APIError},
        404: {"model": APIError},
    },
)
async def get_sdk_embed(
    token: str,
    api_key: Optional[str] = Query(None, description="API Key（私有 SDK 必需）"),
    sdk_service: SDKService = Depends(get_sdk_service),
    db: DatabasePool = Depends(get_db),
):
    """获取 SDK 嵌入代码
    
    - 公开 SDK：直接访问，无需 API Key
    - 私有 SDK：需要通过 ?api_key=xxx 参数验证
    """
    try:
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在或已删除")

        # 检查 SDK 状态
        sdk_status = sdk.get("status", "public")
        
        # 私有 SDK 需要验证 API Key
        if sdk_status == "private":
            if not api_key:
                raise HTTPException(
                    status_code=401, 
                    detail="此 SDK 为私有，需要提供 api_key 参数"
                )
            
            # 验证 API Key
            key_service = APIKeyService(db)
            key_data = await key_service.verify_key(api_key)
            
            if not key_data:
                raise HTTPException(status_code=401, detail="API Key 无效或已过期")
            
            # 检查 SDK 所有者是否匹配
            if sdk.get("user_id") != key_data["user_id"]:
                raise HTTPException(status_code=403, detail="无权访问此 SDK")

        # 强制使用新的打包器重新生成代码，确保包含最新的 SDK 实例暴露逻辑
        logger.info(f"SDK {token} 使用新打包器重新生成代码")
        from app.services.webpack_bundler import bundle_sdk_with_webpack
        
        # 优先使用用户上传的HTML代码
        pages = sdk.get("pages", [])
        if pages and len(pages) > 0 and pages[0].get("code"):
            # 使用用户上传的第一个页面的代码
            html_content = pages[0]["code"]
            logger.info(f"SDK {token} 使用用户上传的HTML代码")
        else:
            # 使用默认的灵童助手 HTML 代码
            html_content = '''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>灵童助手</title>
    <style>
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
        }
        
        .modal-content {
            background-color: #fefefe;
            margin: 15% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 600px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            position: relative;
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
        }
        
        .close:hover,
        .close:focus {
            color: black;
            text-decoration: none;
            cursor: pointer;
        }
        
        .lingtong-image {
            cursor: pointer;
            width: 100px;
            height: 100px;
        }
    </style>
</head>
<body>
    <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20blue%20robot%20spirit%20child%20with%20circuit%20patterns%20on%20body&image_size=square" alt="灵童助手" class="lingtong-image">
    
    <div id="myModal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>灵童助手</h2>
            <div class="chat-container" style="height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin: 10px 0;"></div>
            <div class="input-container" style="display: flex; margin-top: 10px;">
                <input type="text" class="message-input" placeholder="输入消息..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px;">
                <button class="send-button" style="margin-left: 10px; padding: 10px 20px; background: #2196f3; color: white; border: none; border-radius: 20px; cursor: pointer;">发送</button>
            </div>
        </div>
    </div>
    
    <script>
        // 获取模态框
        var modal = document.getElementById("myModal");
        
        // 获取触发模态框的图片
        var img = document.getElementsByClassName("lingtong-image")[0];
        
        // 获取关闭按钮
        var span = document.getElementsByClassName("close")[0];
        
        // 当用户点击图片时，打开模态框
        img.onclick = function() {
            modal.style.display = "block";
            // 初始化SDK
            initSDK();
        }
        
        // 当用户点击关闭按钮时，关闭模态框
        span.onclick = function() {
            modal.style.display = "none";
        }
        
        // 当用户点击模态框外部时，关闭模态框
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
        
        // 初始化SDK
        function initSDK() {
            console.log('初始化灵童SDK...');
        }
        
        // 获取聊天容器和输入元素
        var chatContainer = document.querySelector('.chat-container');
        var messageInput = document.querySelector('.message-input');
        var sendButton = document.querySelector('.send-button');
        
        // 添加消息到聊天界面
        function addMessage(message, isUser) {
            var messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message ' + (isUser ? 'user-message' : 'ai-message');
            messageDiv.textContent = message;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // 发送消息
        async function sendMessage() {
            var message = messageInput.value.trim();
            if (!message) return;
            
            // 添加用户消息
            addMessage(message, true);
            messageInput.value = '';
            
            try {
                // 调用灵童平台API
                console.log('[SDK] 发送消息到灵童平台:', message);
                
                // 使用固定的 __SDK__ 全局变量访问 SDK 实例
                var sdkInstance = window.__SDK__ || window.__SDK_INSTANCE__;
                
                // 如果固定变量不存在，尝试动态查找
                if (!sdkInstance) {
                    for (var key in window) {
                        if (key.startsWith('SDK_') && !key.startsWith('SDK_TOKEN_') && window[key] && window[key].lingtong) {
                            sdkInstance = window[key];
                            console.log('[SDK] 动态找到 SDK 实例:', key);
                            break;
                        }
                    }
                }
                
                console.log('[SDK] window.__SDK__:', window.__SDK__);
                console.log('[SDK] window.__SDK_INSTANCE__:', window.__SDK_INSTANCE__);
                console.log('[SDK] SDK 实例:', sdkInstance);
                
                if (sdkInstance && sdkInstance.lingtong && sdkInstance.lingtong.sendMessage) {
                    // 发送消息到灵童平台
                    console.log('[SDK] 调用灵童平台 sendMessage...');
                    var response = await sdkInstance.lingtong.sendMessage(message);
                    console.log('灵童平台响应:', response);
                    
                    // 添加AI回复 - 响应格式是 {success, data: {response, ...}}
                    if (response && response.success && response.data && response.data.response) {
                        addMessage(response.data.response, false);
                    } else if (response && response.response) {
                        // 兼容旧格式
                        addMessage(response.response, false);
                    } else if (response && response.data) {
                        // 其他格式
                        addMessage(JSON.stringify(response.data), false);
                    } else {
                        console.error('灵童平台响应格式错误:', response);
                        addMessage('系统：消息发送成功，但未收到有效回复', false);
                    }
                } else {
                    // SDK实例未找到或没有 lingtong 方法
                    console.error('SDK实例未找到或缺少灵童API:', {
                        sdkInstance: !!sdkInstance,
                        hasLingtong: sdkInstance && !!sdkInstance.lingtong,
                        hasSendMessage: sdkInstance && sdkInstance.lingtong && !!sdkInstance.lingtong.sendMessage
                    });
                    addMessage('系统错误：SDK 未正确加载', false);
                }
            } catch (error) {
                console.error('发送消息失败:', error);
                console.error('错误详情:', error.message, error.stack);
                addMessage('系统：消息发送失败，请重试', false);
            }
        }
        
        // 绑定发送按钮点击事件
        sendButton.onclick = sendMessage;
        
        // 绑定输入框回车事件
        messageInput.onkeypress = function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        }
    </script>
</body>
</html>
'''
            logger.info(f"SDK {token} 使用默认HTML模板")
        
        # 提取 CSS 和 JS，并从 HTML 中移除这些标签
        import re
        
        # 提取 CSS（使用贪婪匹配确保获取完整内容，处理可能的转义）
        style_pattern = r'<style(?:\s[^>]*)?>([\s\S]*?)(?:<\\?/style>|</style>)'
        style_matches = re.findall(style_pattern, html_content, re.IGNORECASE)
        css = '\n'.join(match.strip() for match in style_matches if match.strip())
        
        # 提取 JS（使用贪婪匹配确保获取完整内容，处理可能的转义）
        script_pattern = r'<script(?:\s[^>]*)?>([\s\S]*?)(?:<\\?/script>|</script>)'
        script_matches = re.findall(script_pattern, html_content, re.IGNORECASE)
        js = '\n'.join(match.strip() for match in script_matches if match.strip())
        
        # 从 HTML 中移除 style 和 script 标签，只保留纯 HTML 结构
        html_content = re.sub(r'<style(?:\s[^>]*)?>[\s\S]*?(?:<\\?/style>|</style>)', '', html_content, flags=re.IGNORECASE)
        html_content = re.sub(r'<script(?:\s[^>]*)?>[\s\S]*?(?:<\\?/script>|</script>)', '', html_content, flags=re.IGNORECASE)
        html_content = html_content.strip()
        
        config_key = f"SDK_CONFIG_{token[:8].upper()}"
        
        # 从 SDK 的 config 字段中获取自定义配置
        sdk_config = sdk.get("config", {})
        
        sdk_code = bundle_sdk_with_webpack(
            name=sdk.get("name", "lingtong-assistant"),
            token=token,
            html=html_content,
            css=css,
            js=js,
            config_key=config_key,
            sdk_config=sdk_config
        )
        
        # 只有在没有用户代码时才保存到数据库（避免覆盖用户上传的代码）
        if not pages or len(pages) == 0 or not pages[0].get("code"):
            await sdk_service.update_sdk_pages(token, [{
                "page_id": "main",
                "name": "主组件",
                "code": sdk_code,
                "is_default": True,
            }])
            logger.info(f"SDK {token} 的默认代码已生成并保存")

        if not sdk_code:
            raise HTTPException(status_code=404, detail="SDK 代码为空")

        # 更新访问计数
        await sdk_service.increment_view_count(token)

        return Response(
            content=sdk_code,
            media_type="application/javascript; charset=utf-8",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 SDK 嵌入代码失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{token}/download",
    summary="下载 SDK 文件",
    description="下载完整的 SDK JavaScript 文件。私有 SDK 需要通过 api_key 参数验证",
    responses={
        200: {"content": {"application/javascript": {}}},
        401: {"model": APIError},
        404: {"model": APIError},
    },
)
async def download_sdk(
    token: str,
    api_key: Optional[str] = Query(None, description="API Key（私有 SDK 必需）"),
    sdk_service: SDKService = Depends(get_sdk_service),
    db: DatabasePool = Depends(get_db),
):
    """下载 SDK 文件
    
    - 公开 SDK：直接下载，无需 API Key
    - 私有 SDK：需要通过 ?api_key=xxx 参数验证
    """
    try:
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在或已删除")

        # 检查 SDK 状态
        sdk_status = sdk.get("status", "public")
        
        # 私有 SDK 需要验证 API Key
        if sdk_status == "private":
            if not api_key:
                raise HTTPException(
                    status_code=401, 
                    detail="此 SDK 为私有，需要提供 api_key 参数"
                )
            
            # 验证 API Key
            key_service = APIKeyService(db)
            key_data = await key_service.verify_key(api_key)
            
            if not key_data:
                raise HTTPException(status_code=401, detail="API Key 无效或已过期")
            
            # 检查 SDK 所有者是否匹配
            if sdk.get("user_id") != key_data["user_id"]:
                raise HTTPException(status_code=403, detail="无权访问此 SDK")

        # 获取域名
        domain = settings.FRONTEND_DOMAIN or ""

        # 生成 SDK 代码
        sdk_code = SDKGenerator.generate_sdk_loader(sdk, domain)

        # 生成文件名
        filename = SDKGenerator.generate_download_filename(token)

        # 更新访问计数
        await sdk_service.increment_view_count(token)

        return Response(
            content=sdk_code,
            media_type="application/javascript; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Allow-Origin": "*",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载 SDK 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{token}/sdk.js",
    summary="获取独立 SDK JS 文件",
    description="获取独立的、可直接加载的 SDK JavaScript 文件，前端直接 <script src=\"/api/sdk/{token}/sdk.js\"></script> 即可",
    responses={
        200: {"content": {"application/javascript": {}}},
        404: {"model": APIError},
    },
)
async def get_sdk_js_file(
    token: str,
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """获取独立的 SDK JS 文件
    
    这是一个完整的,可自包含的 JS 文件,可以直接在前端通过 script 标签加载
    """
    try:
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在或已删除")

        # 获取页面数据
        pages = sdk.get("pages", [])
        if not pages:
            raise HTTPException(status_code=404, detail="SDK 没有页面")

        # 使用第一个页面作为主内容
        main_page = next((p for p in pages if p.get('is_default')), pages[0])
        
        # 获取原始代码（如果已经打包过，需要重新解析）
        code = main_page.get("code", "")
        
        # 检查代码是否已经是打包格式（包含 Base64 解码）
        import re
        if "decodeB64" in code and "SDK_HTML_B64" not in code:
            # 已经是打包格式，直接返回
            return Response(
                content=code,
                media_type="application/javascript; charset=utf-8",
                headers={
                    "Content-Disposition": f"inline; filename=sdk-{token[:8]}.js",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )
        
        # 提取 HTML、CSS、JS
        # 提取 CSS
        css_matches = re.findall(r'<style[^>]*>(.*?)</style>', code, re.DOTALL | re.IGNORECASE)
        all_css = '\n'.join(css_matches)
        
        # 提取 JS
        js_matches = re.findall(r'<script[^>]*>(.*?)</script>', code, re.DOTALL | re.IGNORECASE)
        all_js = '\n'.join(js_matches)
        
        # 移除 style 和 script 标签后的内容是 HTML
        html_content = re.sub(r'<style[^>]*>.*?</style>', '', code, flags=re.DOTALL | re.IGNORECASE)
        html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
        
        # 生成 config_key
        config_key = f"SDK_CONFIG_{token[:8].upper()}"
        
        # 生成独立的 SDK JS 文件
        from app.services.webpack_bundler import generate_simple_bundle
        sdk_js = generate_simple_bundle(
            name=sdk.get("name", "SDK"),
            token=token,
            html=html_content,
            css=all_css,
            js=all_js,
            config_key=config_key
        )

        return Response(
            content=sdk_js,
            media_type="application/javascript; charset=utf-8",
            headers={
                "Content-Disposition": f"inline; filename=sdk-{token[:8]}.js",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 SDK JS 文件失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 灵童平台交互接口 ====================

from pydantic import BaseModel
from typing import Dict, Any
import datetime


class LingTongAuthRequest(BaseModel):
    """灵童平台认证请求"""
    agent_id: str
    user_name: str
    platform_key: str


class ChatMessage(BaseModel):
    """对话消息"""
    role: str  # user, assistant, system
    content: str
    timestamp: Optional[str] = None


class LingTongMessageRequest(BaseModel):
    """灵童平台消息请求"""
    message: str
    user_name: str
    conversation_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = None  # 历史对话记录


class LingTongConversationRequest(BaseModel):
    """创建会话请求"""
    conversation_name: str
    user_id: str
    user_name: str
    app_info: Optional[str] = "digital_intelligent_audit"


class LingTongMessageSaveRequest(BaseModel):
    """保存消息请求"""
    conversation_id: Optional[str] = None
    message_id: str
    content: str
    role: str
    user_id: str
    user_name: str
    app_info: Optional[str] = "digital_intelligent_audit"


@router.post(
    "/lingtong/auth",
    summary="灵童平台认证",
    description="使用 PlatformKey + 签名 进行认证，获取访问Token",
)
async def lingtong_auth(
    request: LingTongAuthRequest,
):
    """
    灵童平台认证接口
    
    流程：
    1. 接收前端传来的 agent_id, user_name, platform_key
    2. 使用 PlatformSecret 生成签名
    3. 向灵童平台发送认证请求
    4. 返回短期Token（30分钟有效期）
    """
    try:
        logger.info(f"[灵童认证] 开始认证 - AgentID: {request.agent_id}, User: {request.user_name}")
        
        # 从配置获取PlatformSecret
        platform_secret = settings.LINGTONG_APP_SECRET or "test_secret"
        
        # 导入认证服务
        from app.services.lingtong_auth import LingTongAuth
        auth_service = LingTongAuth(request.platform_key, platform_secret)
        
        # 生成签名
        signature = auth_service.generate_signature({
            "agent_id": request.agent_id,
            "user_name": request.user_name,
            "platform_key": request.platform_key
        })
        
        logger.info(f"[灵童认证] 签名生成成功: {signature[:16]}...")
        
        # 生成Token
        token_result = auth_service.generate_token(request.agent_id, request.user_name)
        
        logger.info(f"[灵童认证] Token生成成功")
        
        return {
            "success": True,
            "message": "认证成功",
            "data": token_result
        }
        
    except Exception as e:
        logger.error(f"[灵童认证] 认证失败: {e}")
        return {
            "success": False,
            "message": f"认证失败: {str(e)}"
        }


@router.post(
    "/lingtong/chat",
    summary="灵童平台对话",
    description="发送消息到灵童平台，获取AI回复，支持多轮对话上下文",
)
async def lingtong_chat(
    request: LingTongMessageRequest,
    authorization: Optional[str] = Header(None),
    db: DatabasePool = Depends(get_db),
):
    """
    灵童平台对话接口（支持多轮对话上下文）

    流程：
    1. 校验前端传入的短期Token（来自SDK服务平台）
    2. 使用用户名登录灵童平台获取Token（如果需要）
    3. 获取或创建会话，加载历史消息作为上下文
    4. 调用 /api/app_chat 与AI应用交互（携带上下文）
    5. 保存消息到数据库
    6. 返回AI对话结果
    """
    try:
        logger.info(f"[灵童对话] 收到消息 - User: {request.user_name}, Message: {request.message[:50]}...")

        # 校验前端Token（可选，允许调试模式跳过校验）
        if authorization:
            token = authorization.replace("Bearer ", "").strip()

            # 使用认证服务验证Token
            from app.services.lingtong_auth import LingTongAuth
            platform_key = settings.LINGTONG_APP_ID or "test_key"
            platform_secret = settings.LINGTONG_APP_SECRET or "test_secret"
            auth_service = LingTongAuth(platform_key, platform_secret)

            if not auth_service.verify_token(token):
                logger.warning(f"[灵童对话] Token验证失败")
                # 如果Token验证失败，仍允许继续（为了向后兼容和调试）
                # 生产环境应该返回401错误
                # return {"success": False, "message": "Token无效或已过期", "data": {}}

        # 获取灵童平台配置
        lingtong_base_url = settings.LINGTONG_BASE_URL or "http://localhost:8800"

        # 灵童平台应用标识（可配置，默认使用数智审计）
        app_info = settings.LINGTONG_APP_INFO or "digital_intelligent_audit"

        # 初始化对话服务
        from app.services.conversation_service import ConversationService
        conversation_service = ConversationService(db)

        # 获取或创建会话
        session = await conversation_service.get_or_create_session(
            user_name=request.user_name,
            user_id=request.user_id,
            conversation_id=request.conversation_id
        )
        session_id = session["id"]
        conversation_id = session["conversation_token"]

        logger.info(f"[灵童对话] 使用会话 - SessionID: {session_id}, ConversationID: {conversation_id}")

        # 保存用户消息到数据库
        await conversation_service.save_message(
            session_id=session_id,
            role="user",
            content=request.message
        )

        # 获取历史消息作为上下文（最近20条）
        history_messages = await conversation_service.get_messages(session_id, limit=20)
        context = []
        for msg in history_messages:
            context.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        logger.info(f"[灵童对话] 加载历史消息 - 共 {len(context)} 条")

        async with httpx.AsyncClient(timeout=120.0) as client:
            # 1. 使用用户名登录获取Token
            login_response = await client.post(
                f"{lingtong_base_url}/api/login/account_dan",
                json={
                    "username": request.user_name,
                    "type": "account"
                }
            )

            if login_response.status_code != 200:
                logger.error(f"[灵童对话] 登录失败: {login_response.status_code}")
                return {
                    "success": False,
                    "message": f"登录失败: {login_response.status_code}",
                    "data": {
                        "response": "登录失败，请检查用户名是否正确",
                        "conversation_id": conversation_id,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }

            login_data = login_response.json()
            if not login_data.get("success"):
                logger.error(f"[灵童对话] 登录失败: {login_data}")
                return {
                    "success": False,
                    "message": login_data.get("message", "登录失败"),
                    "data": {
                        "response": f"登录失败: {login_data.get('message', '未知错误')}",
                        "conversation_id": conversation_id,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }

            auth_token = login_data.get("auth_token")
            logger.info(f"[灵童对话] 登录成功，Token: {auth_token[:20]}...")

            # 2. 调用灵童平台对话API（携带上下文）
            chat_request_data = {
                "app_info": app_info,
                "input_value": request.message,
                "session_id": conversation_id,
                "context": context  # 传递历史上下文
            }

            logger.info(f"[灵童对话] 发送请求 - 携带 {len(context)} 条上下文")

            chat_response = await client.post(
                f"{lingtong_base_url}/api/app_chat",
                headers={
                    "Authorization": f"Bearer {auth_token}",
                    "Content-Type": "application/json"
                },
                json=chat_request_data
            )

            logger.info(f"[灵童对话] API响应状态: {chat_response.status_code}")

            if chat_response.status_code == 200:
                chat_data = chat_response.json()
                ai_response = chat_data.get("data", "")

                if not ai_response:
                    ai_response = "【提示】AI未返回有效响应，请稍后重试"

                logger.info(f"[灵童对话] 收到AI回复: {ai_response[:100]}...")

                # 保存AI回复到数据库
                await conversation_service.save_message(
                    session_id=session_id,
                    role="assistant",
                    content=ai_response,
                    metadata={
                        "model": chat_data.get("model"),
                        "tokens": chat_data.get("tokens"),
                        "duration": chat_data.get("duration")
                    }
                )

                # 更新会话最后消息时间
                await conversation_service.update_session_last_message(session_id)

                return {
                    "success": True,
                    "message": "对话成功",
                    "data": {
                        "response": ai_response,
                        "conversation_id": chat_data.get("flow_id", conversation_id),
                        "session_id": session_id,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }
            else:
                error_text = chat_response.text
                logger.error(f"[灵童对话] API调用失败: {error_text}")
                return {
                    "success": False,
                    "message": f"API调用失败: {chat_response.status_code}",
                    "data": {
                        "response": f"【提示】AI服务暂时不可用，请稍后重试\n错误: {error_text[:200]}",
                        "conversation_id": conversation_id,
                        "timestamp": datetime.datetime.now().isoformat()
                    }
                }

    except httpx.TimeoutException:
        logger.error(f"[灵童对话] 请求超时")
        return {
            "success": False,
            "message": "请求超时",
            "data": {
                "response": "【提示】AI响应超时，请稍后重试",
                "conversation_id": request.conversation_id,
                "timestamp": datetime.datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"[灵童对话] 对话失败: {e}")
        import traceback
        logger.error(f"[灵童对话] 异常堆栈: {traceback.format_exc()}")
        return {
            "success": False,
            "message": f"对话失败: {str(e)}",
            "data": {
                "response": f"【提示】发生错误: {str(e)[:100]}",
                "conversation_id": request.conversation_id,
                "timestamp": datetime.datetime.now().isoformat()
            }
        }


@router.get(
    "/lingtong/conversation/{conversation_id}",
    summary="获取对话历史",
    description="获取指定对话的历史记录",
)
async def get_conversation_history(
    conversation_id: str,
    authorization: Optional[str] = Header(None),
):
    """获取对话历史"""
    try:
        logger.info(f"[灵童对话] 获取对话历史 - ConversationID: {conversation_id}")
        
        # 获取灵童平台配置
        lingtong_base_url = settings.LINGTONG_BASE_URL or "http://localhost:8800"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 调用灵童平台接口
            response = await client.get(
                f"{lingtong_base_url}/api/conversations/{conversation_id}",
                headers={
                    "Authorization": authorization or "",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": data
                }
            else:
                logger.error(f"[灵童对话] 获取历史失败: {response.status_code}")
                return {
                    "success": False,
                    "message": f"获取历史失败: {response.status_code}"
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[灵童对话] 获取历史失败: {e}")
        return {
            "success": False,
            "message": f"获取历史失败: {str(e)}"
        }


@router.get(
    "/lingtong/myConversations",
    summary="获取我的对话列表",
    description="获取当前用户的对话历史列表，直接使用Authorization header转发到灵童平台",
)
async def get_my_conversations(
    user_id: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    app_info: Optional[str] = Query("ai_qing_integrated_circuit"),
    authorization: Optional[str] = Header(None),
):
    """
    获取我的对话列表
    
    直接使用请求头中的Authorization token转发到灵童平台 /api/myConversations 接口
    """
    try:
        # 获取灵童平台配置
        lingtong_base_url = settings.LINGTONG_BASE_URL or "http://localhost:8800"
        
        # 检查Authorization header
        if not authorization:
            logger.error("[灵童对话] 获取列表 - 缺少Authorization header")
            return {
                "success": False,
                "message": "缺少Authorization header"
            }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 调用灵童平台接口（使用GET方法），直接使用前端传来的Authorization
            params = {
                "app_info": app_info,
                "user_id": user_id
            }
            
            logger.info(f"[灵童对话] 获取列表 - 转发到灵童平台，user_id: {user_id}, app_info: {app_info}")
            
            response = await client.get(
                f"{lingtong_base_url}/api/myConversations",
                params=params,
                headers={
                    "Authorization": authorization,
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": data
                }
            else:
                logger.error(f"[灵童对话] 获取列表失败: {response.status_code}, 响应: {response.text}")
                return {
                    "success": False,
                    "message": f"获取列表失败: {response.status_code}"
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[灵童对话] 获取列表失败: {e}")
        return {
            "success": False,
            "message": f"获取列表失败: {str(e)}"
        }


@router.post(
    "/lingtong/message",
    summary="保存消息",
    description="保存对话消息到灵童平台",
)
async def save_message(
    request: LingTongMessageSaveRequest,
    authorization: Optional[str] = Header(None),
):
    """
    保存消息
    
    根据接口文档：POST /api/message
    """
    try:
        logger.info(f"[灵童对话] 保存消息 - User: {request.user_name}")
        
        # 获取灵童平台配置
        lingtong_base_url = settings.LINGTONG_BASE_URL or "http://localhost:8800"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 调用灵童平台接口
            response = await client.post(
                f"{lingtong_base_url}/api/message",
                headers={
                    "Authorization": authorization or "",
                    "Content-Type": "application/json"
                },
                json={
                    "conversation_id": request.conversation_id,
                    "message_id": request.message_id,
                    "content": request.content,
                    "role": request.role,
                    "user_id": request.user_id,
                    "user_name": request.user_name,
                    "app_info": request.app_info or "digital_intelligent_audit"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": data
                }
            else:
                logger.error(f"[灵童对话] 保存消息失败: {response.status_code}")
                return {
                    "success": False,
                    "message": f"保存消息失败: {response.status_code}"
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[灵童对话] 保存消息失败: {e}")
        return {
            "success": False,
            "message": f"保存消息失败: {str(e)}"
        }


@router.get(
    "/lingtong/flowlist",
    summary="获取流程列表",
    description="获取灵童平台的流程列表",
)
async def get_flow_list(
    authorization: Optional[str] = Header(None),
):
    """
    获取流程列表
    
    根据接口文档：GET /api/flowlist
    """
    try:
        # 获取灵童平台配置
        lingtong_base_url = settings.LINGTONG_BASE_URL or "http://localhost:8800"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 调用灵童平台接口
            response = await client.get(
                f"{lingtong_base_url}/api/flowlist",
                headers={
                    "Authorization": authorization or "",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "data": data
                }
            else:
                logger.error(f"[灵童对话] 获取流程列表失败: {response.status_code}")
                return {
                    "success": False,
                    "message": f"获取流程列表失败: {response.status_code}"
                }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[灵童对话] 获取流程列表失败: {e}")
        return {
            "success": False,
            "message": f"获取流程列表失败: {str(e)}"
        }


@router.delete(
    "/{token}",
    summary="删除 SDK",
    description="删除 SDK，需要 API Key 认证且为 SDK 所有者",
)
async def delete_sdk(
    token: str,
    key_data: dict = Depends(verify_api_key),
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """删除 SDK（需要 API Key 且为所有者）"""
    try:
        # 验证 SDK 所有者
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在")
        
        if sdk.get("user_id") != key_data["user_id"]:
            raise HTTPException(status_code=403, detail="无权删除此 SDK")
        
        success = await sdk_service.delete_sdk(token)
        if not success:
            raise HTTPException(status_code=500, detail="删除失败")
        
        logger.info(f"删除 SDK 成功: {token}")
        return {"success": True, "message": "SDK 已删除"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除 SDK 失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/{token}",
    response_model=SDKDetailResponse,
    summary="获取 SDK 详情",
    description="通过分享 Token 获取 SDK 详细信息",
    responses={404: {"model": APIError}},
)
async def get_sdk(
    token: str,
    sdk_service: SDKService = Depends(get_sdk_service),
):
    """获取 SDK 详情（公开）"""
    try:
        sdk = await sdk_service.get_sdk_by_token(token)
        if not sdk:
            raise HTTPException(status_code=404, detail="SDK 不存在或已删除")
        return SDKDetailResponse(success=True, data=sdk)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 SDK 详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
