@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\start-smart-library.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo 启动失败，按任意键退出...
  pause >nul
)

exit /b %EXIT_CODE%
