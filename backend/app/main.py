"""
SDK Share Platform - FastAPI 主应用
高性能 Python 后端，支持高并发
"""
import time
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api import auth, sdk, model, ai, ai_agents, lingtong_auth
from app.core.cache import cache_manager
from app.core.config import settings
from app.core.database import db
from app.core.patches import apply_all_patches

# 应用所有补丁
apply_all_patches()

# 配置日志
logger.add(
    "logs/app.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动中...")
    logger.info(f"环境: {settings.ENVIRONMENT}")

    # 初始化数据库连接池
    await db.init()
    logger.info("✅ 数据库连接池初始化完成")

    # 初始化缓存
    await cache_manager.init()
    logger.info("✅ 缓存初始化完成")

    logger.info(f"🎉 服务启动成功，监听端口: {settings.PORT}")

    yield

    # 关闭时清理
    logger.info("服务关闭中...")
    await db.close()
    logger.info("数据库连接池已关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## SDK Share Platform API

将前端代码转换为可嵌入的 JavaScript SDK，支持：

- 📦 多页面 SDK 支持
- 🔗 在线 CDN 嵌入
- 📥 SDK 文件下载
- 🚀 高性能缓存
- ⚡ 高并发支持

### 使用方式

1. **创建 SDK**: POST /api/sdk
2. **获取嵌入代码**: GET /api/sdk/{token}/embed
3. **下载 SDK**: GET /api/sdk/{token}/download
    """,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 限流
if settings.RATE_LIMIT_ENABLED:
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}second"],
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)


# 请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next: Callable):
    """记录请求日志"""
    start_time = time.time()

    # 处理请求
    response: Response = await call_next(request)

    # 计算耗时
    process_time = (time.time() - start_time) * 1000

    # 记录日志
    logger.info(
        f"{request.method} {request.url.path} | "
        f"状态: {response.status_code} | "
        f"耗时: {process_time:.2f}ms | "
        f"IP: {get_remote_address(request)}"
    )

    # 添加处理时间头
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

    return response


# 全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理"""
    logger.error(f"未捕获的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "服务器内部错误", "detail": str(exc) if settings.DEBUG else None},
    )


# 健康检查
@app.get("/health", tags=["Health"])
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


# API 状态
@app.get("/", tags=["Health"])
async def root():
    """根路径"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


# 注册路由
app.include_router(auth.router)
app.include_router(sdk.router)
app.include_router(model.router)
app.include_router(ai.router)           # AI助手SDK API
app.include_router(ai_agents.router)    # AI助手管理 API
app.include_router(lingtong_auth.router) # 灵童平台认证 API


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
    )
