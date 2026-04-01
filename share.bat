@echo off
chcp 65001 >nul 2>&1
setlocal

echo.
echo   ========================================
echo     Smart Library - Share via ngrok
echo   ========================================
echo.

REM -- Check ngrok.exe exists --
if not exist "ngrok.exe" (
    echo   [ERROR] ngrok.exe not found in project directory
    echo   Please download ngrok from https://ngrok.com/download
    pause
    exit /b 1
)

REM -- Check servers are running --
echo   [1/2] Checking servers...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Backend not running. Starting start.bat first...
    start "Library" cmd /c "start.bat"
    echo   Waiting 8s for servers to start...
    timeout /t 8 /nobreak >nul
)
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Frontend not ready, waiting 5 more seconds...
    timeout /t 5 /nobreak >nul
)

REM -- Start ngrok --
echo.
echo   [2/2] Starting ngrok tunnel on port 3000...
echo.
echo   ----------------------------------------
echo   The public URL will appear below.
echo   Share the "Forwarding" https:// link.
echo   Press Ctrl+C to stop sharing.
echo   ----------------------------------------
echo.
.\ngrok.exe start --all --config ngrok.yml

endlocal
