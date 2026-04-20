"""
SDK Share Platform - 认证 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer
from typing import Optional

from app.core.database import DatabasePool, get_db
from app.models.models import (
    UserCreate, UserLogin, UserResponse, AuthResponse,
    APIKeyCreate, APIKeyCreateResponse, APIKeyListResponse,
    AppCreate, AppListResponse, AppDetailResponse,
)
from app.services.user_service import UserService, APIKeyService, AppService

router = APIRouter(prefix="/api/auth", tags=["认证"])
security = HTTPBearer(auto_error=False)


# ==========================================
# 用户认证
# ==========================================
@router.post("/register", response_model=AuthResponse, summary="用户注册")
async def register(data: UserCreate, db: DatabasePool = Depends(get_db)):
    """用户注册"""
    try:
        user_service = UserService(db)
        result = await user_service.register(data.email, data.password, data.name)
        return AuthResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/login", response_model=AuthResponse, summary="用户登录")
async def login(data: UserLogin, db: DatabasePool = Depends(get_db)):
    """用户登录"""
    try:
        user_service = UserService(db)
        result = await user_service.login(data.email, data.password)
        return AuthResponse(success=True, data=result)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me", response_model=UserResponse, summary="获取当前用户")
async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: DatabasePool = Depends(get_db)
):
    """获取当前用户信息"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证 Token")

    token = authorization.replace("Bearer ", "")

    # 简单验证：token 格式应该是 user_id:random:timestamp 的 sha256
    # 这里简化处理，实际应该使用 JWT 或 Redis 存储
    user_service = UserService(db)
    # 从 token 反推 user_id（简化版，实际应该查 Redis）
    # 这里我们假设前端存储了 user_id
    raise HTTPException(status_code=501, detail="请使用 API Key 认证")


# ==========================================
# API Key 管理
# ==========================================
@router.post("/api-keys", response_model=APIKeyCreateResponse, summary="创建 API Key")
async def create_api_key(
    data: APIKeyCreate,
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """创建新的 API Key"""
    try:
        key_service = APIKeyService(db)
        result = await key_service.create_key(
            user_id=user_id,
            name=data.name,
            permissions=data.permissions,
            rate_limit=data.rate_limit,
            expires_days=data.expires_days,
        )
        return APIKeyCreateResponse(
            success=True,
            data=result,
            message="API Key 创建成功，请妥善保存，系统不会再次显示完整 Key"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api-keys", response_model=APIKeyListResponse, summary="获取 API Key 列表")
async def list_api_keys(
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """获取用户的 API Key 列表"""
    try:
        key_service = APIKeyService(db)
        keys = await key_service.list_keys(user_id)
        return APIKeyListResponse(success=True, data=keys)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/api-keys/{key_id}", summary="删除 API Key")
async def delete_api_key(
    key_id: str,
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """删除 API Key"""
    try:
        key_service = APIKeyService(db)
        success = await key_service.delete_key(user_id, key_id)
        if not success:
            raise HTTPException(status_code=404, detail="API Key 不存在")
        return {"success": True, "message": "API Key 已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 应用管理
# ==========================================
@router.post("/apps", response_model=AppDetailResponse, summary="创建应用")
async def create_app(
    data: AppCreate,
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """创建新应用/场景"""
    try:
        app_service = AppService(db)
        result = await app_service.create_app(
            user_id=user_id,
            name=data.name,
            description=data.description,
            scene=data.scene,
            config=data.config,
        )
        return AppDetailResponse(success=True, data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/apps", response_model=AppListResponse, summary="获取应用列表")
async def list_apps(
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """获取用户的应用列表"""
    try:
        app_service = AppService(db)
        apps = await app_service.list_apps(user_id)
        return AppListResponse(success=True, data=apps)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/apps/{app_id}", response_model=AppDetailResponse, summary="获取应用详情")
async def get_app(
    app_id: str,
    user_id: str = "demo_user",  # TODO: 从认证中获取
    db: DatabasePool = Depends(get_db)
):
    """获取应用详情"""
    try:
        app_service = AppService(db)
        app = await app_service.get_app(user_id, app_id)
        if not app:
            raise HTTPException(status_code=404, detail="应用不存在")
        return AppDetailResponse(success=True, data=app)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
