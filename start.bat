@echo off
echo ========================================
echo   Smart Library Management System
echo   Starting Backend and Frontend Servers
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 20.x from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Installing backend dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd ..\web
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Starting backend server (port 3001)...
cd ..\server
start "Library Backend Server" cmd /c "npm run dev"
echo Backend server started at http://localhost:3001

echo.
echo [4/4] Starting frontend server (port 3000)...
cd ..\web
start "Library Frontend Server" cmd /c "npm run dev"
echo Frontend server started at http://localhost:3000

echo.
echo ========================================
echo   Servers are starting...
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo Press any key to stop the servers...
pause >nul

REM Kill the servers
taskkill /FI "WINDOWTITLE eq Library Backend Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Library Frontend Server*" /F >nul 2>&1
echo Servers stopped.
