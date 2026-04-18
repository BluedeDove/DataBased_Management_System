$ErrorActionPreference = 'Stop'

try {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
} catch {
}

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$stateFile = Join-Path $projectRoot '.runtime\run\launcher-state.json'

function Read-State() {
  if (-not (Test-Path -LiteralPath $stateFile)) {
    return $null
  }

  try {
    return Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Clear-State() {
  if (Test-Path -LiteralPath $stateFile) {
    Remove-Item -LiteralPath $stateFile -Force
  }
}

function Test-ProcessRunning([int]$ProcessId) {
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

$state = Read-State
if (-not $state -or -not $state.pid) {
  Write-Host '[i] No running Smart Library instance was found.'
  Clear-State
  exit 0
}

$processId = [int]$state.pid
if (-not (Test-ProcessRunning $processId)) {
  Write-Host '[i] The recorded process no longer exists. State file cleaned.'
  Clear-State
  exit 0
}

& taskkill /PID $processId /T /F | Out-Null
Clear-State
Write-Host '[OK] Smart Library has been stopped.'
