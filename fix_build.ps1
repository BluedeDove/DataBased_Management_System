# install_manual.ps1
# Offline Installation Script (English Version)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

# Cache Paths
$LocalAppData = [System.Environment]::GetFolderPath('LocalApplicationData')
$BuilderCache = "$LocalAppData\electron-builder\Cache"

# 7zip Tool Path
$7zaPath = "$ProjectRoot\node_modules\7zip-bin\win\x64\7za.exe"

Write-Host ">>> Starting Manual Installation..." -ForegroundColor Cyan

# Check if 7za exists
if (-not (Test-Path $7zaPath)) {
    Write-Host ">>> Installing dependencies to get 7zip..." -ForegroundColor Yellow
    npm install
}

function Install-Local-File ($ZipName, $FolderName) {
    $LocalFile = "$ProjectRoot\$ZipName"
    $DestPath = "$BuilderCache\$FolderName"

    # Check if user downloaded the file
    if (-not (Test-Path $LocalFile)) {
        Write-Error "ERROR: File [$ZipName] not found in project root. Please download it and place it here."
    }

    # Check if already installed
    if (Test-Path "$DestPath") {
        # Simple check, we assume if folder exists it might be okay, but let's force overwrite to be safe
        Write-Host ">>> Target folder for $FolderName exists. Proceeding to extract..." -ForegroundColor Cyan
    }

    Write-Host ">>> Extracting [$ZipName] to [$DestPath] ..." -ForegroundColor Cyan
    
    # Ensure destination directory exists
    if (-not (Test-Path $DestPath)) { New-Item -ItemType Directory -Path $DestPath -Force | Out-Null }
    
    # Extract using 7za
    $Proc = Start-Process -FilePath $7zaPath -ArgumentList "x `"$LocalFile`" -o`"$DestPath`" -y" -Wait -PassThru
    
    if ($Proc.ExitCode -ne 0) { 
        Write-Error "Extraction failed! The downloaded file might be corrupted." 
    } else {
        Write-Host "[SUCCESS] $FolderName installed successfully!" -ForegroundColor Green
    }
}

# 1. Install WinCodeSign
Install-Local-File "winCodeSign-2.6.0.7z" "winCodeSign"

# 2. Install NSIS
Install-Local-File "nsis-3.0.4.1.7z" "nsis"

# 3. Fix better-sqlite3
Write-Host ">>> Fixing better-sqlite3..." -ForegroundColor Yellow
npm install better-sqlite3 --save

# 4. Start Build
Write-Host ">>> Environment fixed. Starting Build Process..." -ForegroundColor Green
Write-Host "-------------------------------------------"

# Set mirror for Electron just in case
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[SUCCESS] Build finished! Check 'dist' folder." -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Build failed. Check logs above." -ForegroundColor Red
}