param(
  [switch]$ValidateOnly,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

try {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
} catch {
}

$script:ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:RuntimeRoot = Join-Path $script:ProjectRoot '.runtime'
$script:RunRoot = Join-Path $script:RuntimeRoot 'run'
$script:StateFile = Join-Path $script:RunRoot 'launcher-state.json'
$script:PackageJsonPath = Join-Path $script:ProjectRoot 'package.json'

function Write-Step([string]$Message) {
  Write-Host ''
  Write-Host ('[>] ' + $Message) -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host ('[OK] ' + $Message) -ForegroundColor Green
}

function Write-Info([string]$Message) {
  Write-Host ('[i] ' + $Message) -ForegroundColor Yellow
}

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Get-AppPackage() {
  return Get-Content -LiteralPath $script:PackageJsonPath -Raw | ConvertFrom-Json
}

function Get-RequiredNodeVersion() {
  $pkg = Get-AppPackage

  if ($pkg.volta -and $pkg.volta.node) {
    return [string]$pkg.volta.node
  }

  return '20.20.2'
}

function Get-RequiredNodeMajor() {
  return [int]((Get-RequiredNodeVersion).Split('.')[0])
}

function Get-NodeArchitecture() {
  $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()

  switch ($arch) {
    'x64' { return 'x64' }
    'arm64' { return 'arm64' }
    'x86' { return 'x86' }
    default { throw "Unsupported Windows architecture: $arch" }
  }
}

function Get-PortableNodeDir() {
  return Join-Path $script:RuntimeRoot 'node'
}

function Get-PortableNodeExe() {
  return Join-Path (Get-PortableNodeDir) 'node.exe'
}

function Get-NodeExe() {
  $portableNodeExe = Get-PortableNodeExe

  if (Test-Path -LiteralPath $portableNodeExe) {
    return $portableNodeExe
  }

  return (Get-Command node -ErrorAction Stop).Source
}

function Use-PortableNode() {
  $portableNodeDir = Get-PortableNodeDir
  $env:Path = $portableNodeDir + ';' + $env:Path
}

function Get-NodeVersion([string]$NodeCommand = 'node') {
  try {
    $version = & $NodeCommand --version 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }

    return [string]$version
  } catch {
    return $null
  }
}

function Test-NodeUsable([string]$Version) {
  if (-not $Version) {
    return $false
  }

  $normalized = $Version.Trim().TrimStart('v')
  $major = [int]($normalized.Split('.')[0])
  return $major -ge (Get-RequiredNodeMajor)
}

function Download-PortableNode() {
  $nodeVersion = Get-RequiredNodeVersion
  $nodeArch = Get-NodeArchitecture
  $portableNodeDir = Get-PortableNodeDir
  $portableNodeExe = Get-PortableNodeExe

  if (Test-Path -LiteralPath $portableNodeExe) {
    $portableVersion = Get-NodeVersion $portableNodeExe
    if (Test-NodeUsable $portableVersion) {
      Write-Ok "Portable Node.js detected: $portableVersion"
      return
    }
  }

  Ensure-Directory $script:RuntimeRoot

  $downloadsDir = Join-Path $script:RuntimeRoot 'downloads'
  $extractDir = Join-Path $downloadsDir 'extract'
  $zipName = "node-v$nodeVersion-win-$nodeArch.zip"
  $zipPath = Join-Path $downloadsDir $zipName

  Ensure-Directory $downloadsDir

  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $downloadUrls = @(
    "https://nodejs.org/dist/v$nodeVersion/$zipName",
    "https://npmmirror.com/mirrors/node/v$nodeVersion/$zipName"
  )

  $downloadSucceeded = $false

  foreach ($url in $downloadUrls) {
    try {
      Write-Step "Downloading portable Node.js: $url"
      Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
      $downloadSucceeded = $true
      break
    } catch {
      Write-Info "Download failed, trying next mirror: $url"
    }
  }

  if (-not $downloadSucceeded) {
    throw "Failed to download Node.js automatically. You can also unpack Node.js manually into $(Get-PortableNodeDir)"
  }

  if (Test-Path -LiteralPath $extractDir) {
    Remove-Item -LiteralPath $extractDir -Recurse -Force
  }

  Write-Step 'Extracting portable Node.js'
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force

  $expandedDir = Get-ChildItem -LiteralPath $extractDir -Directory | Select-Object -First 1
  if (-not $expandedDir) {
    throw 'The extracted Node.js archive is invalid'
  }

  if (Test-Path -LiteralPath $portableNodeDir) {
    Remove-Item -LiteralPath $portableNodeDir -Recurse -Force
  }

  Move-Item -LiteralPath $expandedDir.FullName -Destination $portableNodeDir

  if (-not (Test-Path -LiteralPath $portableNodeExe)) {
    throw 'Portable Node.js install failed: node.exe was not found'
  }

  Write-Ok "Portable Node.js is ready: $nodeVersion ($nodeArch)"
}

function Ensure-NodeRuntime() {
  $portableNodeExe = Get-PortableNodeExe
  if (Test-Path -LiteralPath $portableNodeExe) {
    Use-PortableNode
    $portableVersion = Get-NodeVersion $portableNodeExe
    if (Test-NodeUsable $portableVersion) {
      Write-Ok "Using portable Node.js $portableVersion"
      return
    }
  }

  $systemVersion = Get-NodeVersion
  if (Test-NodeUsable $systemVersion) {
    Write-Ok "Using system Node.js $systemVersion"
    return
  }

  if ($systemVersion) {
    Write-Info "System Node.js $systemVersion is too old, switching to portable Node.js"
  } else {
    Write-Info 'No usable Node.js was found, preparing a portable Node.js runtime'
  }

  Download-PortableNode
  Use-PortableNode

  $finalVersion = Get-NodeVersion (Get-PortableNodeExe)
  if (-not (Test-NodeUsable $finalVersion)) {
    throw 'Portable Node.js could not be activated'
  }

  Write-Ok "Current Node.js version: $finalVersion"
}

function Get-NpmExe() {
  $portableNpm = Join-Path (Get-PortableNodeDir) 'npm.cmd'
  if (Test-Path -LiteralPath $portableNpm) {
    return $portableNpm
  }

  $npm = Get-Command npm -ErrorAction Stop
  return $npm.Source
}

function Ensure-ConfigFile([string]$TargetPath, [string]$ExamplePath, [string]$Label) {
  if ((-not (Test-Path -LiteralPath $TargetPath)) -and (Test-Path -LiteralPath $ExamplePath)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
    Write-Ok "Created default config: $Label"
  }
}

function Get-LockHash([string]$LockPath) {
  if (-not (Test-Path -LiteralPath $LockPath)) {
    return $null
  }

  return (Get-FileHash -LiteralPath $LockPath -Algorithm SHA256).Hash
}

function Read-State() {
  if (-not (Test-Path -LiteralPath $script:StateFile)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $script:StateFile -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Write-State([int]$ProcessId, [int]$Port) {
  Ensure-Directory $script:RunRoot

  $state = [ordered]@{
    pid = $ProcessId
    port = $Port
    startedAt = (Get-Date).ToString('o')
  }

  $state | ConvertTo-Json | Set-Content -LiteralPath $script:StateFile -Encoding UTF8
}

function Clear-State() {
  if (Test-Path -LiteralPath $script:StateFile) {
    Remove-Item -LiteralPath $script:StateFile -Force
  }
}

function Test-HttpReady([int]$Port, [int]$TimeoutSeconds = 2) {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec $TimeoutSeconds
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Test-ProcessRunning([int]$ProcessId) {
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Stop-ServerProcess([int]$ProcessId) {
  if (-not (Test-ProcessRunning $ProcessId)) {
    return
  }

  & taskkill /PID $ProcessId /T /F | Out-Null
}

function Test-RootDependencies() {
  $tsxCmd = Join-Path $script:ProjectRoot 'node_modules\.bin\tsx.cmd'
  $betterSqlite3Binary = Join-Path $script:ProjectRoot 'node_modules\better-sqlite3\build\Release\better_sqlite3.node'

  if ((-not (Test-Path -LiteralPath $tsxCmd)) -or (-not (Test-Path -LiteralPath $betterSqlite3Binary))) {
    return $false
  }

  Push-Location $script:ProjectRoot
  try {
    & node -e "require('better-sqlite3');require('express');require('dotenv');console.log('ok')" *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  } finally {
    Pop-Location
  }
}

function Test-WebDependencies() {
  $viteCmd = Join-Path $script:ProjectRoot 'web\node_modules\.bin\vite.cmd'
  return Test-Path -LiteralPath $viteCmd
}

function Install-Dependencies([string]$WorkingDirectory, [string]$Label) {
  $npmExe = Get-NpmExe

  Write-Step "Installing $Label dependencies"
  Push-Location $WorkingDirectory
  try {
    & $npmExe ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
      throw "$Label dependencies installation failed"
    }
  } finally {
    Pop-Location
  }

  Write-Ok "$Label dependencies are ready"
}

function Ensure-RootDependencies() {
  $rootLock = Join-Path $script:ProjectRoot 'package-lock.json'
  $stateDir = Join-Path $script:RuntimeRoot 'state'
  $statePath = Join-Path $stateDir 'root-lock.sha256'
  $currentLockHash = Get-LockHash $rootLock
  $savedLockHash = if (Test-Path -LiteralPath $statePath) { (Get-Content -LiteralPath $statePath -Raw).Trim() } else { $null }
  $hasNodeModules = Test-Path -LiteralPath (Join-Path $script:ProjectRoot 'node_modules')
  $rootDepsReady = Test-RootDependencies

  if ($hasNodeModules -and $rootDepsReady -and (-not $savedLockHash) -and $currentLockHash) {
    Ensure-Directory $stateDir
    $currentLockHash | Set-Content -LiteralPath $statePath -Encoding UTF8
    Write-Ok 'Root dependencies are ready'
    return
  }

  $needsInstall =
    (-not $hasNodeModules) -or
    ($currentLockHash -ne $savedLockHash) -or
    (-not $rootDepsReady)

  if (-not $needsInstall) {
    Write-Ok 'Root dependencies are ready'
    return
  }

  Ensure-Directory $stateDir
  Install-Dependencies -WorkingDirectory $script:ProjectRoot -Label 'root'
  $currentLockHash | Set-Content -LiteralPath $statePath -Encoding UTF8
}

function Get-LatestWriteTimeUtc([string[]]$Paths) {
  $latest = [datetime]::MinValue

  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) {
      continue
    }

    $item = Get-Item -LiteralPath $path

    if ($item.PSIsContainer) {
      $children = Get-ChildItem -LiteralPath $path -Recurse -File -ErrorAction SilentlyContinue
      foreach ($child in $children) {
        if ($child.LastWriteTimeUtc -gt $latest) {
          $latest = $child.LastWriteTimeUtc
        }
      }
    } elseif ($item.LastWriteTimeUtc -gt $latest) {
      $latest = $item.LastWriteTimeUtc
    }
  }

  return $latest
}

function Test-WebBuildNeeded() {
  $distIndex = Join-Path $script:ProjectRoot 'web\dist\index.html'
  if (-not (Test-Path -LiteralPath $distIndex)) {
    return $true
  }

  $latestSourceTime = Get-LatestWriteTimeUtc @(
    (Join-Path $script:ProjectRoot 'web\src'),
    (Join-Path $script:ProjectRoot 'web\public'),
    (Join-Path $script:ProjectRoot 'web\package.json'),
    (Join-Path $script:ProjectRoot 'web\package-lock.json'),
    (Join-Path $script:ProjectRoot 'web\vite.config.ts'),
    (Join-Path $script:ProjectRoot 'web\.env')
  )

  $distTime = (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
  return $latestSourceTime -gt $distTime
}

function Ensure-WebBuild() {
  if (-not (Test-WebBuildNeeded)) {
    Write-Ok 'Frontend static assets are ready'
    return
  }

  $webLock = Join-Path $script:ProjectRoot 'web\package-lock.json'
  $stateDir = Join-Path $script:RuntimeRoot 'state'
  $statePath = Join-Path $stateDir 'web-lock.sha256'
  $currentLockHash = Get-LockHash $webLock
  $savedLockHash = if (Test-Path -LiteralPath $statePath) { (Get-Content -LiteralPath $statePath -Raw).Trim() } else { $null }
  $webDir = Join-Path $script:ProjectRoot 'web'
  $webDepsReady = Test-WebDependencies

  if ($webDepsReady -and (-not $savedLockHash) -and $currentLockHash) {
    Ensure-Directory $stateDir
    $currentLockHash | Set-Content -LiteralPath $statePath -Encoding UTF8
    $savedLockHash = $currentLockHash
  }

  if ((-not $webDepsReady) -or ($currentLockHash -ne $savedLockHash)) {
    Ensure-Directory $stateDir
    Install-Dependencies -WorkingDirectory $webDir -Label 'web'
    $currentLockHash | Set-Content -LiteralPath $statePath -Encoding UTF8
  } else {
    Write-Ok 'Web dependencies are ready'
  }

  $nodeExe = Get-NodeExe
  $viteCli = Join-Path $webDir 'node_modules\vite\bin\vite.js'

  Write-Step 'Building frontend static assets'
  Push-Location $webDir
  try {
    & $nodeExe $viteCli build
    if ($LASTEXITCODE -ne 0) {
      throw 'Frontend build failed'
    }
  } finally {
    Pop-Location
  }

  Write-Ok 'Frontend static assets build completed'
}

function Test-PortAvailable([int]$Port) {
  $listener = $null

  try {
    $activeListeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    if ($activeListeners | Where-Object { $_.Port -eq $Port }) {
      return $false
    }

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, $Port)
    $listener.Server.DualMode = $true
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Get-FreePort([int]$PreferredPort) {
  for ($port = $PreferredPort; $port -lt ($PreferredPort + 50); $port++) {
    if (Test-PortAvailable $port) {
      return $port
    }
  }

  throw "Could not find an available port near $PreferredPort"
}

function Start-Server([int]$Port) {
  $nodeExe = Get-NodeExe
  $tsxCli = Join-Path $script:ProjectRoot 'node_modules\tsx\dist\cli.mjs'
  $serverEntry = Join-Path $script:ProjectRoot 'server\src\server.ts'

  if (-not (Test-Path -LiteralPath $tsxCli)) {
    throw 'tsx runtime was not found'
  }

  $commandParts = @(
    'title Smart Library Server',
    "set APP_ROOT=$script:ProjectRoot",
    "set PORT=$Port",
    'set NODE_ENV=development',
    'set AUTO_SEED=true',
    """$nodeExe"" ""$tsxCli"" ""$serverEntry"""
  )

  $process = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', ($commandParts -join ' && ') -WorkingDirectory $script:ProjectRoot -PassThru
  Write-State -ProcessId $process.Id -Port $Port
  return $process
}

function Wait-ServerReady([int]$Port, [int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-HttpReady -Port $Port -TimeoutSeconds 2) {
      return $true
    }

    Start-Sleep -Seconds 1
  }

  return $false
}

function Open-App([int]$Port) {
  Start-Process "http://127.0.0.1:$Port" | Out-Null
}

function Ensure-Ready() {
  Ensure-Directory $script:RuntimeRoot
  Ensure-Directory $script:RunRoot

  Ensure-ConfigFile -TargetPath (Join-Path $script:ProjectRoot '.env') -ExamplePath (Join-Path $script:ProjectRoot '.env.example') -Label 'root .env'
  Ensure-ConfigFile -TargetPath (Join-Path $script:ProjectRoot 'web\.env') -ExamplePath (Join-Path $script:ProjectRoot 'web\.env.example') -Label 'web .env'
  Ensure-NodeRuntime
  Ensure-RootDependencies
  Ensure-WebBuild
}

Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host '  Smart Library Windows Launcher' -ForegroundColor DarkCyan
Write-Host '========================================' -ForegroundColor DarkCyan

Ensure-Ready

if ($ValidateOnly) {
  Write-Host ''
  Write-Ok 'Launcher prerequisites are ready'
  exit 0
}

$existingState = Read-State
if ($existingState -and $existingState.pid -and (Test-ProcessRunning ([int]$existingState.pid))) {
  if (Wait-ServerReady -Port ([int]$existingState.port) -TimeoutSeconds 5) {
    Write-Info "Existing instance detected: PID $($existingState.pid), port $($existingState.port)"
    if (-not $NoBrowser) {
      Open-App -Port ([int]$existingState.port)
    }
    Write-Host ''
    Write-Host 'Use stop.bat if you want to stop the current instance.' -ForegroundColor Yellow
    exit 0
  }
}

Clear-State

$appPort = Get-FreePort -PreferredPort 3000
Write-Step "Starting app on port $appPort"
$serverProcess = Start-Server -Port $appPort

if (-not (Wait-ServerReady -Port $appPort -TimeoutSeconds 60)) {
  Clear-State
  throw "App startup timed out. Please check the Smart Library Server window."
}

Write-Ok "App started: http://127.0.0.1:$appPort"
Write-Info 'Double-click start.bat again to reuse the current instance.'
Write-Info 'Double-click stop.bat to stop the current instance.'

if (-not $NoBrowser) {
  Open-App -Port $appPort
}

Write-Host ''
Write-Host 'Press any key to stop the app...' -ForegroundColor Yellow
[void][System.Console]::ReadKey($true)

Stop-ServerProcess -Pid $serverProcess.Id
Clear-State
Write-Ok 'App stopped'
