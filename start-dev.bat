@echo off
chcp 65001 > nul
echo ================================
echo   智能图书管理系统 - 启动中...
echo ================================
echo.

REM 设置本地 Node 20 路径
set "NODE_PATH=%~dp0.node\node20"
set "PATH=%NODE_PATH%;%PATH%"

REM 设置国内镜像
set "ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/"

echo ✓ 使用本地 Node 20
node --version

echo.
echo ✓ 启动开发服务器...
echo.

npm run dev

pause
