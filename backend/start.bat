@echo off
cd F:\work\sdkprojects\backend
python -m uvicorn app.main:app --reload --port 8000
pause