# Set UTF-8 encoding for proper Chinese character display
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set environment variables
$env:PATH = "$PSScriptRoot\.node\node20;$env:PATH"
$env:ELECTRON_MIRROR = "https://cdn.npmmirror.com/binaries/electron/"

Write-Host "Starting Library Management System..." -ForegroundColor Green
Write-Host "Using local Node 20" -ForegroundColor Cyan

# Run dev server
npm run dev
