@echo off
echo 启动后端服务...
cd F:\sdkprojects\backend
start "Backend" python -m uvicorn app.main:app --reload --port 8000

echo 等待后端启动...
timeout /t 3 /nobreak >nul

echo 启动前端服务...
cd F:\sdkprojects
start "Frontend" pnpm dev