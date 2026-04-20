"""
SDK Share Platform - 用户模型
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ==========================================
# 用户相关
# ==========================================
class UserBase(BaseModel):
    """用户基础模型"""
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    """用户注册"""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """用户登录"""
    email: EmailStr
    password: str


class User(UserBase):
    """用户完整模型"""
    id: str
    role: str = "user"
    status: str = "active"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """用户响应"""
    success: bool = True
    data: User


class AuthResponse(BaseModel):
    """认证响应"""
    success: bool = True
    data: dict  # {user, token}


# ==========================================
# API Key 相关
# ==========================================
class APIKeyBase(BaseModel):
    """API Key 基础模型"""
    name: str = Field(..., min_length=1, max_length=100)


class APIKeyCreate(APIKeyBase):
    """创建 API Key"""
    permissions: List[str] = Field(default=["read", "write"])
    rate_limit: int = Field(default=1000)
    expires_days: Optional[int] = None  # 过期天数，None 表示永不过期


class APIKey(APIKeyBase):
    """API Key 完整模型"""
    id: str
    user_id: str
    key_prefix: str  # sk_xxxx
    permissions: List[str]
    rate_limit: int
    usage_count: int
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyWithSecret(APIKey):
    """包含完整 Key 的 API Key（仅创建时返回一次）"""
    key: str  # 完整的 key，仅创建时返回


class APIKeyListResponse(BaseModel):
    """API Key 列表响应"""
    success: bool = True
    data: List[APIKey]


class APIKeyCreateResponse(BaseModel):
    """API Key 创建响应"""
    success: bool = True
    data: APIKeyWithSecret
    message: str = "API Key 创建成功，请妥善保存，系统不会再次显示完整 Key"


# ==========================================
# 应用/场景相关
# ==========================================
class AppBase(BaseModel):
    """应用基础模型"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    scene: Optional[str] = Field(None, description="场景类型：float_button, modal, embed, custom")


class AppCreate(AppBase):
    """创建应用"""
    config: dict = Field(default_factory=dict)


class App(AppBase):
    """应用完整模型"""
    id: str
    user_id: str
    status: str = "active"
    config: dict
    created_at: datetime
    updated_at: datetime
    sdk_count: int = 0

    class Config:
        from_attributes = True


class AppListResponse(BaseModel):
    """应用列表响应"""
    success: bool = True
    data: List[App]


class AppDetailResponse(BaseModel):
    """应用详情响应"""
    success: bool = True
    data: App


# ==========================================
# SDK 相关（更新）
# ==========================================
class SDKShareCreate(BaseModel):
    """创建 SDK"""
    app_id: Optional[str] = None  # 关联应用
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field(default="public", description="访问状态：public 或 private")
    pages: List[dict]  # [{page_id, name, code, is_default}]
    config: dict = Field(default_factory=dict)


class SDKShare(BaseModel):
    """SDK 完整模型"""
    id: str
    app_id: Optional[str]
    user_id: str
    name: str
    description: Optional[str]
    share_token: str
    config: dict
    status: str
    view_count: int
    created_at: datetime
    updated_at: datetime
    pages: List[dict] = []
    page_count: int = 0

    class Config:
        from_attributes = True


class SDKListResponse(BaseModel):
    """SDK 列表响应"""
    success: bool = True
    data: List[SDKShare]


class SDKDetailResponse(BaseModel):
    """SDK 详情响应"""
    success: bool = True
    data: SDKShare


class APIError(BaseModel):
    """API 错误响应"""
    error: str
    detail: Optional[str] = None
