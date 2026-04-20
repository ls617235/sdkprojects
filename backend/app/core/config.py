"""
SDK Share Platform - 核心配置
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 应用配置
    APP_NAME: str = "SDK Share API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4  # Gunicorn workers 数量

    # 数据库配置 (PostgreSQL)
    DATABASE_URL: str  # postgres://user:password@host:port/database
    DATABASE_POOL_SIZE: int = 20  # 连接池大小
    DATABASE_MAX_OVERFLOW: int = 10  # 最大溢出连接数
    DATABASE_POOL_TIMEOUT: int = 30  # 连接池超时（秒）

    # Redis 缓存配置（可选，不配置则使用内存缓存）
    REDIS_URL: Optional[str] = None
    CACHE_TTL: int = 300  # 缓存过期时间（秒）
    CACHE_ENABLED: bool = True

    # API 限流配置
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100  # 每分钟请求数限制
    RATE_LIMIT_PERIOD: int = 60  # 限流周期（秒）

    # CORS 配置
    CORS_ORIGINS: list[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True

    # 前端域名（用于生成嵌入代码）
    FRONTEND_DOMAIN: Optional[str] = None

    # 灵童平台配置
    LINGTONG_BASE_URL: str = "http://localhost:8800"
    LINGTONG_APP_ID: Optional[str] = None
    LINGTONG_APP_SECRET: Optional[str] = None
    LINGTONG_APP_INFO: str = "digital_intelligent_audit"  # 默认应用标识

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
