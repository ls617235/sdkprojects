"""
Gunicorn 配置文件
用于高并发生产环境
"""
import multiprocessing
import os

# 绑定地址
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '8000')}"

# Worker 配置
workers = int(os.getenv("WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
max_requests = 10000  # 防止内存泄漏
max_requests_jitter = 1000  # 随机抖动，避免同时重启

# 超时配置
timeout = 120
graceful_timeout = 30
keepalive = 5

# 日志配置
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# 进程名
proc_name = "sdk-share-api"

# 安全配置
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# 预加载应用（节省内存）
preload_app = True

# 守护进程
daemon = False

# 进程 ID 文件
pidfile = None

# 用户和组（在 Docker 中以非 root 用户运行）
# user = "appuser"
# group = "appgroup"
