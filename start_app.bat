@echo off
title Gaming Room Management
color 0A

echo ========================================
echo   Gaming Room Management System
echo ========================================
echo.
echo Starting application...
echo.

cd /d "%~dp0"

REM Initialize database on first run
if not exist "backend\gaming_room.db" (
    echo [INIT] Creating database...
    cd backend
    GamingRoomBackend.exe --init-db
    if %errorlevel% neq 0 (
        echo ERROR: Database initialization failed
        pause
        exit /b 1
    )
    cd ..
    timeout /t 2 /nobreak > nul
)

REM Check if backend executable exists
if not exist "backend\GamingRoomBackend.exe" (
    echo ERROR: Backend executable not found!
    echo Please reinstall the application.
    pause
    exit /b 1
)

REM Start the backend server
echo [1/2] Starting Backend Server...
start "Gaming Room Backend" backend\GamingRoomBackend.exe

REM Wait for backend to start
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

REM Open the frontend
echo [2/2] Opening Frontend...
if exist "frontend\index.html" (
    start "" frontend\index.html
) else (
    echo ERROR: Frontend files not found!
    echo Opening API documentation instead...
    start http://localhost:8000/docs
)

echo.
echo ========================================
echo Application Started Successfully!
echo ========================================
echo.
echo Backend running in background window.
echo Frontend opened in your browser.
echo.
echo API Documentation: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause > nul
