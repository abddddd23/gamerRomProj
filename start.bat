@echo off
echo ========================================
echo Gaming Room Management - Starting
echo ========================================
echo.

cd /d "%~dp0"

echo Starting Backend Server...
start "Gaming Room Backend" cmd /k "cd backend && GamingRoomBackend.exe"

echo.
echo Backend is starting...
echo Please wait a few seconds for the backend to initialize.
echo.
echo Then open: frontend\index.html in your browser
echo.
echo Or visit: http://localhost:8000/docs for API documentation
echo.

timeout /t 3

echo Opening application...
start "" "frontend\index.html"

echo Application started successfully!
echo Backend running in separate window.
