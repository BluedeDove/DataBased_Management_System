# setup_and_run.ps1
# Automates the setup and execution of the Electron Smart Library

Write-Host ">>> Starting Setup Process..." -ForegroundColor Cyan

# 1. Config npm mirror for faster installation in China
Write-Host ">>> Configuring npm mirror..." -ForegroundColor Yellow
npm config set registry https://registry.npmmirror.com
$env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"

# 2. Install dependencies (This includes postinstall hook to rebuild native modules)
Write-Host ">>> Installing dependencies (this may take a while)..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error "npm install failed!"
    exit 1
}

# 3. Start the application
Write-Host ">>> Starting application..." -ForegroundColor Green
npm run dev
