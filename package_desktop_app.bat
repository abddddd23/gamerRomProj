@echo off
echo ========================================
echo Gaming Room Management - Package Desktop App
echo ========================================
echo.

echo This creates a portable desktop application package
echo that runs like a real Windows software (not in browser)
echo.

echo [1/3] Building Frontend...
cd frontend
call npm run build
cd ..
echo Frontend build completed
echo.

echo [2/3] Building Backend EXE...
cd backend
call .venv\Scripts\activate
pyinstaller --clean backend.spec
cd ..
echo Backend EXE build completed
echo.

echo [3/3] Creating Desktop Application Package...
if exist "DesktopApp" rmdir /S /Q "DesktopApp"
mkdir "DesktopApp"
mkdir "DesktopApp\backend"
mkdir "DesktopApp\frontend"

copy "backend\dist\GamingRoomBackend.exe" "DesktopApp\backend\"
xcopy /E /I /Y "frontend\dist" "DesktopApp\frontend"
copy "DATABASE_SETUP.md" "DesktopApp\"

echo Creating application launcher...
copy "create_launcher.bat" "DesktopApp\GamingRoomManagement.bat"

echo Creating ZIP-ready package...
echo Package created: DesktopApp\
echo.
echo ========================================
echo Desktop Application Package Created!
echo ========================================
echo.
echo The DesktopApp folder contains:
echo - backend\GamingRoomBackend.exe (standalone backend)
echo - frontend\ (React application)
echo - GamingRoomManagement.bat (application launcher)
echo.
echo To distribute:
echo 1. Zip the DesktopApp folder
echo 2. Send to users
echo 3. They just run GamingRoomManagement.bat
echo.
echo Note: This opens the React app in a dedicated window,
echo not in a web browser, giving a desktop app experience.
echo.
pause
