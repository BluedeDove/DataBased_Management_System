@echo off
chcp 65001 >nul 2>&1
setlocal

echo.
echo   ========================================
echo     Smart Library - Starting...
echo   ========================================
echo.

REM -- 1. Node.js check --
where volta >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Volta found, using Node.js 20.20.2
    set "NODE_CMD=volta run --node 20.20.2"
) else (
    echo   [i] Volta not found, using system Node.js
    set "NODE_CMD="
    node -v >nul 2>&1
    if %errorlevel% neq 0 (
        echo   [ERROR] Node.js not found. Please install Node.js 18+
        pause
        exit /b 1
    )
)

REM -- 2. Install deps only if missing --
if not exist "server\node_modules" (
    echo.
    echo   [1/4] Installing backend deps...
    cd server
    call npm install
    if %errorlevel% neq 0 (
        echo   [ERROR] Backend install failed
        pause
        exit /b 1
    )
    cd ..
) else (
    echo   [1/4] Backend deps ready
)

if not exist "web\node_modules" (
    echo.
    echo   [2/4] Installing frontend deps...
    cd web
    call npm install
    if %errorlevel% neq 0 (
        echo   [ERROR] Frontend install failed
        pause
        exit /b 1
    )
    cd ..
) else (
    echo   [2/4] Frontend deps ready
)

REM -- 3. Check ports --
echo.
echo   [3/4] Checking ports...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001 .*LISTENING"') do (
    echo   [!] Port 3001 in use ^(PID: %%a^), releasing...
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000 .*LISTENING"') do (
    echo   [!] Port 3000 in use ^(PID: %%a^), releasing...
    taskkill /PID %%a /F >nul 2>&1
)
echo   [OK] Ports ready

REM -- 4. Start servers --
echo.
echo   [4/4] Starting servers...
cd server
if "%NODE_CMD%"=="" (
    start "Library-Backend" cmd /c "npm run dev"
) else (
    start "Library-Backend" cmd /c "%NODE_CMD% npm run dev"
)
cd ..

echo   [i] Waiting for backend...
timeout /t 3 /nobreak >nul

cd web
if "%NODE_CMD%"=="" (
    start "Library-Frontend" cmd /c "npm run dev"
) else (
    start "Library-Frontend" cmd /c "%NODE_CMD% npm run dev"
)
cd ..

echo.
echo   ========================================
echo     Backend:  http://localhost:3001
echo     Frontend: http://localhost:3000
echo   ========================================
echo.
echo   Opening browser in 5s...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo   Press any key to stop servers...
pause >nul

taskkill /FI "WINDOWTITLE eq Library-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Library-Frontend*" /F >nul 2>&1
echo   Servers stopped.
endlocal
