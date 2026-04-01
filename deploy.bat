@echo off
chcp 65001 >nul 2>&1
setlocal

echo.
echo   ========================================
echo     Smart Library - Deploy Mode
echo   ========================================
echo.

REM -- Node check --
where volta >nul 2>&1
if %errorlevel% equ 0 (
    set "NODE_CMD=volta run --node 20.20.2"
    echo   [OK] Volta found
) else (
    set "NODE_CMD="
    echo   [i] Using system Node.js
)

REM -- 1. Install deps --
if not exist "server\node_modules" (
    echo   [1/3] Installing backend deps...
    cd server && call npm install && cd ..
) else (
    echo   [1/3] Backend deps ready
)

if not exist "web\node_modules" (
    echo   [1/3] Installing frontend deps...
    cd web && call npm install && cd ..
)

REM -- 2. Build frontend --
echo.
echo   [2/3] Building frontend...
cd web
if "%NODE_CMD%"=="" (
    call npm run build
) else (
    call %NODE_CMD% npm run build
)
if %errorlevel% neq 0 (
    echo   [ERROR] Frontend build failed
    pause
    exit /b 1
)
cd ..
echo   [OK] Frontend built to web/dist/

REM -- 3. Start backend (production) --
echo.
echo   [3/3] Starting backend (production mode)...
echo.

REM Kill port 3001 if in use
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 .*LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

cd server
if "%NODE_CMD%"=="" (
    start "Library-Prod" cmd /k "set NODE_ENV=production && npm run dev"
) else (
    start "Library-Prod" cmd /k "set NODE_ENV=production && %NODE_CMD% npm run dev"
)
cd ..

echo.
echo   ========================================
echo     Server running at http://localhost:3001
echo.
echo     Next step - expose via ngrok:
echo       ngrok http 3001
echo.
echo     Copy the ngrok https:// URL and share it
echo   ========================================
echo.
pause
endlocal
