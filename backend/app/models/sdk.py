"""
SDK Share Platform - 数据模型
"""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SDKPageBase(BaseModel):
    """SDK 页面基础模型"""

    page_id: str = Field(..., description="页面唯一标识")
    name: str = Field(..., description="页面名称")
    code: str = Field(..., description="页面代码（HTML/JS/CSS）")
    is_default: bool = Field(False, description="是否为默认页面")


class SDKPageCreate(SDKPageBase):
    """创建 SDK 页面"""

    pass


class SDKPage(SDKPageBase):
    """SDK 页面完整模型"""

    id: Optional[str] = None
    sdk_id: Optional[str] = None
    page_order: int = Field(0, description="页面排序")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SDKShareBase(BaseModel):
    """SDK 基础模型"""

    name: str = Field(..., min_length=1, max_length=255, description="SDK 名称")
    description: Optional[str] = Field(None, description="SDK 描述")


class SDKShareCreate(SDKShareBase):
    """创建 SDK"""

    pages: List[SDKPageCreate] = Field(..., min_length=1, description="SDK 页面列表")
    config: Optional[dict] = Field(default_factory=dict, description="SDK 配置")


class SDKShareUpdate(BaseModel):
    """更新 SDK"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    pages: Optional[List[SDKPageCreate]] = None
    config: Optional[dict] = None


class SDKShare(SDKShareBase):
    """SDK 完整模型"""

    id: str
    share_token: str
    config: dict = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    pages: List[SDKPage] = Field(default_factory=list)
    page_count: int = Field(0, description="页面数量")

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


class SDKDeleteResponse(BaseModel):
    """SDK 删除响应"""

    success: bool = True
    message: str = "SDK 已删除"


class SDKUpdateResponse(BaseModel):
    """SDK 更新响应"""

    success: bool = True
    message: str = "SDK 已更新"


class APIError(BaseModel):
    """API 错误响应"""

    error: str
    detail: Optional[str] = None
