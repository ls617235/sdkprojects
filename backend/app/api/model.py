"""
SDK Share Platform - 模型配置 API 路由
管理 AI 模型配置，支持自定义模型和提示词
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel, Field

from app.core.database import DatabasePool, get_db
from app.services.model_service import ModelConfigService

router = APIRouter(prefix="/api/models", tags=["模型配置"])


# ==========================================
# 请求/响应模型
# ==========================================
class ModelConfigCreate(BaseModel):
    """创建模型配置请求"""
    model_id: str = Field(..., min_length=1, max_length=100, description="模型实际调用 ID")
    name: str = Field(..., min_length=1, max_length=100, description="显示名称")
    description: Optional[str] = Field(None, description="描述")
    provider: str = Field(default="custom", description="提供商：doubao, deepseek, kimi, custom")
    api_endpoint: Optional[str] = Field(None, description="自定义 API 端点")
    api_key_env: Optional[str] = Field(None, description="API Key 环境变量名")
    system_prompt: Optional[str] = Field(None, description="系统提示词")
    config: Optional[dict] = Field(default_factory=dict, description="其他配置")
    is_default: bool = Field(default=False, description="是否默认模型")
    is_active: bool = Field(default=True, description="是否启用")


class ModelConfigUpdate(BaseModel):
    """更新模型配置请求"""
    model_id: Optional[str] = Field(None, min_length=1, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    provider: Optional[str] = None
    api_endpoint: Optional[str] = None
    api_key_env: Optional[str] = None
    system_prompt: Optional[str] = None
    config: Optional[dict] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ModelConfigResponse(BaseModel):
    """模型配置响应"""
    id: str
    model_id: str
    name: str
    description: Optional[str]
    provider: str
    api_endpoint: Optional[str]
    api_key_env: Optional[str]
    system_prompt: Optional[str]
    config: dict
    is_default: bool
    is_active: bool
    created_at: str
    updated_at: str


class ModelListResponse(BaseModel):
    """模型列表响应"""
    success: bool = True
    data: List[ModelConfigResponse]


class ModelDetailResponse(BaseModel):
    """模型详情响应"""
    success: bool = True
    data: ModelConfigResponse


class ModelInitResponse(BaseModel):
    """初始化模型响应"""
    success: bool = True
    message: str = "默认模型已初始化"
    data: List[ModelConfigResponse]


# ==========================================
# API 路由
# ==========================================
@router.get("", response_model=ModelListResponse, summary="获取模型配置列表")
async def list_models(
    include_inactive: bool = False,
    db: DatabasePool = Depends(get_db)
):
    """获取所有模型配置列表"""
    try:
        service = ModelConfigService(db)
        models = await service.list_models(include_inactive=include_inactive)
        return ModelListResponse(data=models)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ModelDetailResponse, summary="创建模型配置")
async def create_model(
    data: ModelConfigCreate,
    db: DatabasePool = Depends(get_db)
):
    """创建新的模型配置"""
    try:
        service = ModelConfigService(db)
        model = await service.create_model(
            model_id=data.model_id,
            name=data.name,
            description=data.description,
            provider=data.provider,
            api_endpoint=data.api_endpoint,
            api_key_env=data.api_key_env,
            system_prompt=data.system_prompt,
            config=data.config,
            is_default=data.is_default,
            is_active=data.is_active,
        )
        return ModelDetailResponse(data=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/default", response_model=ModelDetailResponse, summary="获取默认模型")
async def get_default_model(
    db: DatabasePool = Depends(get_db)
):
    """获取默认模型配置"""
    try:
        service = ModelConfigService(db)
        model = await service.get_default_model()
        if not model:
            raise HTTPException(status_code=404, detail="没有可用的模型配置")
        return ModelDetailResponse(data=model)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/init", response_model=ModelInitResponse, summary="初始化默认模型")
async def init_default_models(
    db: DatabasePool = Depends(get_db)
):
    """初始化默认模型配置（如果数据库中没有模型）"""
    try:
        service = ModelConfigService(db)
        models = await service.init_default_models()
        return ModelInitResponse(
            message="默认模型已初始化",
            data=models
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}", response_model=ModelDetailResponse, summary="获取模型配置详情")
async def get_model(
    model_id: str,
    db: DatabasePool = Depends(get_db)
):
    """获取指定模型配置的详情"""
    try:
        service = ModelConfigService(db)
        model = await service.get_model(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="模型配置不存在")
        return ModelDetailResponse(data=model)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{model_id}", response_model=ModelDetailResponse, summary="更新模型配置")
async def update_model(
    model_id: str,
    data: ModelConfigUpdate,
    db: DatabasePool = Depends(get_db)
):
    """更新指定模型配置"""
    try:
        service = ModelConfigService(db)
        
        # 构建更新数据
        update_data = {}
        if data.model_id is not None:
            update_data["model_id"] = data.model_id
        if data.name is not None:
            update_data["name"] = data.name
        if data.description is not None:
            update_data["description"] = data.description
        if data.provider is not None:
            update_data["provider"] = data.provider
        if data.api_endpoint is not None:
            update_data["api_endpoint"] = data.api_endpoint
        if data.api_key_env is not None:
            update_data["api_key_env"] = data.api_key_env
        if data.system_prompt is not None:
            update_data["system_prompt"] = data.system_prompt
        if data.config is not None:
            update_data["config"] = data.config
        if data.is_default is not None:
            update_data["is_default"] = data.is_default
        if data.is_active is not None:
            update_data["is_active"] = data.is_active

        model = await service.update_model(model_id, **update_data)
        if not model:
            raise HTTPException(status_code=404, detail="模型配置不存在")
        return ModelDetailResponse(data=model)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{model_id}", summary="删除模型配置")
async def delete_model(
    model_id: str,
    db: DatabasePool = Depends(get_db)
):
    """删除指定模型配置"""
    try:
        service = ModelConfigService(db)
        success = await service.delete_model(model_id)
        if not success:
            raise HTTPException(status_code=404, detail="模型配置不存在")
        return {"success": True, "message": "模型配置已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{model_id}/set-default", response_model=ModelDetailResponse, summary="设置默认模型")
async def set_default_model(
    model_id: str,
    db: DatabasePool = Depends(get_db)
):
    """设置指定模型为默认模型"""
    try:
        service = ModelConfigService(db)
        model = await service.set_default_model(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="模型配置不存在")
        return ModelDetailResponse(data=model)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
