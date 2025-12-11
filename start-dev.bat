@echo off
chcp 65001
set PATH=%~dp0.node\node20;%PATH%
set ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/
npm run dev

pause
