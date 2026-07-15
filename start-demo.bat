@echo off
title Gaming Room Management Demo

echo ==========================================
echo Gaming Room Management System - Demo
echo ==========================================
echo.

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo Docker is not installed or not running.
    echo Please install/start Docker Desktop first.
    pause
    exit /b 1
)

echo Starting demo...
docker compose up --build -d

echo.
echo Waiting for services to start...
timeout /t 8 /nobreak >nul

echo.
echo Opening frontend...
start http://localhost:5173

echo.
echo Demo is running.
echo Frontend: http://localhost:5173
echo Backend docs: http://localhost:8000/docs
echo.
echo Login:
echo admin / admin123
echo.
pause