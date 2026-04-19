param(
  [int]$Cycles = 1,
  [int]$PreferredPort = 3100,
  [switch]$SkipBuild,
  [switch]$SkipTypeCheck,
  [switch]$SkipLauncherValidate,
  [switch]$KeepArtifacts
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false) } catch {}
$script:ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:RuntimeRoot = Join-Path $script:ProjectRoot '.runtime'
$script:SmokeRoot = Join-Path $script:RuntimeRoot 'smoke'
$script:HistoryRoot = Join-Path $script:SmokeRoot 'history'
$script:JsonReportPath = Join-Path $script:SmokeRoot 'latest-smoke-report.json'
$script:MarkdownReportPath = Join-Path $script:SmokeRoot 'latest-smoke-report.md'
$script:Results = New-Object System.Collections.Generic.List[object]
$script:CurrentCycle = 0
$script:RunStartedAt = Get-Date

function Write-Step([string]$Message) { Write-Host ''; Write-Host ('[>] ' + $Message) -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host ('[OK] ' + $Message) -ForegroundColor Green }
function Write-Warn([string]$Message) { Write-Host ('[WARN] ' + $Message) -ForegroundColor Yellow }
function Write-Fail([string]$Message) { Write-Host ('[FAIL] ' + $Message) -ForegroundColor Red }
function Ensure-Directory([string]$Path) { if (-not (Test-Path -LiteralPath $Path)) { New-Item -ItemType Directory -Path $Path -Force | Out-Null } }

function Add-Result(
  [string]$Name,
  [ValidateSet('pass', 'fail', 'warn', 'skip')][string]$Status,
  [object]$Details = $null
) {
  $cycleValue = if ($script:CurrentCycle -gt 0) { $script:CurrentCycle } else { $null }
  $script:Results.Add([pscustomobject][ordered]@{
    name = $Name
    status = $Status
    cycle = $cycleValue
    details = $Details
    timestamp = (Get-Date).ToString('o')
  }) | Out-Null
  switch ($Status) {
    'pass' { Write-Ok $Name }
    'warn' { Write-Warn $Name }
    'skip' { Write-Warn ('SKIP: ' + $Name) }
    default { Write-Fail $Name }
  }
}

function Assert-True([string]$Name, [bool]$Condition, [object]$Details = $null) {
  if ($Condition) { Add-Result -Name $Name -Status 'pass' -Details $Details; return }
  Add-Result -Name $Name -Status 'fail' -Details $Details
}

function Invoke-CommandChecked([string]$Name, [scriptblock]$ScriptBlock) {
  Write-Step $Name
  & $ScriptBlock
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE" }
  Add-Result -Name $Name -Status 'pass'
}

function Get-FreePort([int]$StartPort) {
  $activeListeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
  for ($port = $StartPort; $port -lt ($StartPort + 80); $port++) {
    if (-not ($activeListeners | Where-Object { $_.Port -eq $port })) { return $port }
  }
  throw "No free port found near $StartPort"
}

function Invoke-WebStatus([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15
    return @{ ok = $true; status = [int]$response.StatusCode; content = [string]$response.Content }
  } catch {
    $statusCode = 0
    $content = ''
    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $content = $reader.ReadToEnd()
          $reader.Close()
        }
      } catch {}
    }
    return @{ ok = $false; status = $statusCode; content = $content; error = $_.Exception.Message }
  }
}

function Invoke-ApiJson([string]$Method, [string]$Url, [string]$Token = '', [object]$Body = $null) {
  $headers = @{}
  if ($Token) { $headers.Authorization = "Bearer $Token" }
  $parameters = @{ Method = $Method; Uri = $Url; Headers = $headers; TimeoutSec = 15 }
  if ($null -ne $Body) {
    $parameters.ContentType = 'application/json'
    $parameters.Body = ($Body | ConvertTo-Json -Depth 10)
  }
  try {
    return @{ ok = $true; status = 200; body = Invoke-RestMethod @parameters }
  } catch {
    $statusCode = 0
    if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
    return @{ ok = $false; status = $statusCode; error = $_.ErrorDetails.Message; exception = $_.Exception.Message }
  }
}

function Login-User([string]$BaseUrl, [string]$Username, [string]$Password) {
  $response = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/auth/login" -Body @{ username = $Username; password = $Password }
  if (-not $response.ok -or -not $response.body.success) { throw "Login failed for ${Username}: $($response.error)" }
  return $response.body.data
}

function Try-Login-User([string]$BaseUrl, [string]$Username, [string]$Password) {
  $response = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/auth/login" -Body @{ username = $Username; password = $Password }
  if (-not $response.ok -or -not $response.body.success) { return $null }
  return $response.body.data
}

function Register-SmokeStudent([string]$BaseUrl, [string]$Suffix) {
  $username = "smk$Suffix"
  $password = 'Smoke123456'
  $response = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/auth/register" -Body @{
    username = $username; password = $password; name = "Smoke Student $Suffix"; identity = 'student'
    phone = ('139' + (Get-Random -Minimum 10000000 -Maximum 99999999)); email = "$username@example.local"
  }
  if (-not $response.ok -or -not $response.body.success) { throw "Smoke student registration failed: $($response.error)" }
  return Login-User -BaseUrl $BaseUrl -Username $username -Password $password
}

function Set-BorrowPin([string]$BaseUrl, [string]$Token, [string]$LoginPassword, [string]$BorrowPin) {
  return Invoke-ApiJson -Method 'Put' -Url "$BaseUrl/api/v1/auth/borrow-pin" -Token $Token -Body @{ loginPassword = $LoginPassword; borrowPin = $BorrowPin }
}

function Wait-Health([string]$BaseUrl, [int]$TimeoutSeconds = 45) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $response = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/health"
    if ($response.ok -and $response.body.success) { return $true }
    Start-Sleep -Milliseconds 800
  }
  return $false
}

function Start-SmokeServer([string]$DatabasePath, [int]$Port, [string]$LogPath, [string]$ErrorPath) {
  $nodeExe = (Get-Command node -ErrorAction Stop).Source
  $previousAppRoot = $env:APP_ROOT
  $previousDatabasePath = $env:DATABASE_PATH
  $previousPort = $env:PORT
  $previousNodeEnv = $env:NODE_ENV
  $previousAutoSeed = $env:AUTO_SEED
  $env:APP_ROOT = $script:ProjectRoot
  $env:DATABASE_PATH = $DatabasePath
  $env:PORT = [string]$Port
  $env:NODE_ENV = 'development'
  $env:AUTO_SEED = 'true'
  $process = Start-Process -FilePath $nodeExe -ArgumentList 'node_modules\tsx\dist\cli.mjs', 'server\src\server.ts' -WorkingDirectory $script:ProjectRoot -RedirectStandardOutput $LogPath -RedirectStandardError $ErrorPath -PassThru
  $env:APP_ROOT = $previousAppRoot
  $env:DATABASE_PATH = $previousDatabasePath
  $env:PORT = $previousPort
  $env:NODE_ENV = $previousNodeEnv
  $env:AUTO_SEED = $previousAutoSeed
  return $process
}

function Stop-SmokeServer([System.Diagnostics.Process]$Process) {
  if ($null -eq $Process) { return }
  try {
    $runningProcess = Get-Process -Id $Process.Id -ErrorAction SilentlyContinue
    if ($runningProcess) { & taskkill /PID $Process.Id /T /F | Out-Null }
  } catch {}
}

function New-SmokeDatabase([int]$Cycle) {
  Ensure-Directory $script:SmokeRoot
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $databasePath = Join-Path $script:SmokeRoot "library-smoke-cycle$Cycle-$timestamp.db"
  $sourceDatabase = Join-Path $script:ProjectRoot 'data\library.db'
  if (Test-Path -LiteralPath $sourceDatabase) { Copy-Item -LiteralPath $sourceDatabase -Destination $databasePath -Force }
  else { Write-Warn 'Source data/library.db was not found; the smoke server will seed an empty database.' }
  return $databasePath
}

function Get-SmokeSamples([string]$DatabasePath) {
  $sampleScriptPath = Join-Path $script:SmokeRoot 'collect-smoke-samples.cjs'
@'
const Database = require('better-sqlite3')
const db = new Database(process.argv[2])
function one(sql) { try { return db.prepare(sql).get() || null } catch (error) { return { error: error.message } } }
const samples = {
  healthyReader: one(`SELECT * FROM (SELECT r.id, r.reader_no, r.name, r.status, rc.max_borrow_count,(SELECT COUNT(*) FROM borrowing_records br WHERE br.reader_id = r.id AND br.status IN ('borrowed','overdue')) AS current_borrowing_count,(SELECT COUNT(*) FROM borrowing_records br WHERE br.reader_id = r.id AND br.status = 'overdue') AS overdue_count FROM readers r JOIN reader_categories rc ON rc.id = r.category_id WHERE r.is_deleted = 0) t WHERE t.status = 'active' AND t.current_borrowing_count < t.max_borrow_count AND t.overdue_count = 0 ORDER BY t.current_borrowing_count ASC, t.id ASC LIMIT 1`),
  blockedReader: one(`SELECT * FROM (SELECT r.id, r.reader_no, r.name, r.status, rc.max_borrow_count,(SELECT COUNT(*) FROM borrowing_records br WHERE br.reader_id = r.id AND br.status IN ('borrowed','overdue')) AS current_borrowing_count,(SELECT COUNT(*) FROM borrowing_records br WHERE br.reader_id = r.id AND br.status = 'overdue') AS overdue_count FROM readers r JOIN reader_categories rc ON rc.id = r.category_id WHERE r.is_deleted = 0) t WHERE t.status <> 'active' OR t.current_borrowing_count >= t.max_borrow_count OR t.overdue_count > 0 ORDER BY t.overdue_count DESC, t.current_borrowing_count DESC, t.id ASC LIMIT 1`),
  availableCopy: one(`SELECT bc.barcode, bc.id AS copy_id, b.id AS book_id, b.title FROM book_copies bc JOIN books b ON b.id = bc.book_id WHERE bc.is_deleted = 0 AND b.is_deleted = 0 AND bc.status = 'available' AND b.status = 'normal' ORDER BY bc.id ASC LIMIT 1`)
}
console.log(JSON.stringify(samples))
'@ | Set-Content -LiteralPath $sampleScriptPath -Encoding UTF8
  $raw = & node $sampleScriptPath $DatabasePath
  if ($LASTEXITCODE -ne 0) { throw 'Failed to collect smoke database samples.' }
  return $raw | ConvertFrom-Json
}

function Test-CodeBoundaries() {
  $homeRouteText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'web\src\utils\homeRoute.ts') -Raw -Encoding UTF8
  $borrowingRoutesText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'server\src\routes\borrowing.routes.ts') -Raw -Encoding UTF8
  $machineRoutesText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'server\src\routes\machine.routes.ts') -Raw -Encoding UTF8
  $machineViewText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'web\src\views\MachineTerminal.vue') -Raw -Encoding UTF8
  $booksViewText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'web\src\views\Books.vue') -Raw -Encoding UTF8
  $aiViewText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'web\src\views\AIAssistant.vue') -Raw -Encoding UTF8
  $borrowingViewText = Get-Content -LiteralPath (Join-Path $script:ProjectRoot 'web\src\views\Borrowing.vue') -Raw -Encoding UTF8
  $hasReaderAutocomplete = $machineViewText.Contains('queryReaderSuggestions')
  $hasCopyAutocomplete = $machineViewText.Contains('queryCopySuggestions')
  $hasVerifyAction = $machineViewText.Contains('verifyReader()')
  $hasBorrowPinGate = $machineViewText.Contains('borrowPin') -and $machineViewText.Contains('verificationToken')
  Assert-True -Name 'Static: student and teacher default route is ai-assistant' -Condition ($homeRouteText.Contains("case 'teacher':") -and $homeRouteText.Contains("case 'student':") -and $homeRouteText.Contains("return '/ai-assistant'"))
  Assert-True -Name 'Static: machine default route is machine-terminal' -Condition ($homeRouteText.Contains("case 'machine':") -and $homeRouteText.Contains("return '/machine-terminal'"))
  Assert-True -Name 'Static: borrow and return APIs stay staff-only' -Condition ($borrowingRoutesText.Contains("const staffBorrowOnly = requireRole('admin', 'librarian')") -and $borrowingRoutesText.Contains("router.post('/', staffBorrowOnly") -and $borrowingRoutesText.Contains("router.put('/:id/return', staffBorrowOnly") -and $borrowingRoutesText.Contains("router.put('/:id/renew', staffBorrowOnly"))
  Assert-True -Name 'Static: machine APIs stay behind machine role gate' -Condition ($machineRoutesText.Contains("router.use(requireRole('machine', 'admin', 'librarian'))"))
  Assert-True -Name 'Static: machine terminal requires PIN and removes reader autocomplete' -Condition ((-not $hasReaderAutocomplete) -and $hasCopyAutocomplete -and $hasVerifyAction -and $hasBorrowPinGate) -Details @{ hasReaderAutocomplete = $hasReaderAutocomplete; hasCopyAutocomplete = $hasCopyAutocomplete; hasVerifyAction = $hasVerifyAction; hasBorrowPinGate = $hasBorrowPinGate }
  Assert-True -Name 'Static: status helper is reused across main book views' -Condition ($booksViewText.Contains('getBookStatusMeta') -and $aiViewText.Contains('getBookStatusMeta') -and $borrowingViewText.Contains('getBookStatusMeta'))
}

function Write-ReportArtifacts() {
  Ensure-Directory $script:SmokeRoot
  Ensure-Directory $script:HistoryRoot
  $durationSeconds = [Math]::Round(((Get-Date) - $script:RunStartedAt).TotalSeconds, 2)
  $summary = [ordered]@{
    generatedAt = (Get-Date).ToString('o'); projectRoot = $script:ProjectRoot; cycles = $Cycles; durationSeconds = $durationSeconds
    total = $script:Results.Count
    passed = @($script:Results | Where-Object { $_.status -eq 'pass' }).Count
    failed = @($script:Results | Where-Object { $_.status -eq 'fail' }).Count
    warnings = @($script:Results | Where-Object { $_.status -eq 'warn' }).Count
    skipped = @($script:Results | Where-Object { $_.status -eq 'skip' }).Count
    results = $script:Results
  }
  $summary | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $script:JsonReportPath -Encoding UTF8
  $reportLines = New-Object System.Collections.Generic.List[string]
  foreach ($line in @(
    '# Smart Library Smoke Report','',
    "- Generated: $($summary.generatedAt)","- DurationSeconds: $durationSeconds","- Cycles: $Cycles",
    "- Passed: $($summary.passed)","- Failed: $($summary.failed)","- Warnings: $($summary.warnings)","- Skipped: $($summary.skipped)",''
  )) { $reportLines.Add($line) | Out-Null }
  $failedItems = @($script:Results | Where-Object { $_.status -eq 'fail' })
  if ($failedItems.Count -gt 0) {
    $reportLines.Add('## Failures') | Out-Null
    foreach ($item in $failedItems) {
      $cyclePrefix = if ($item.cycle) { "[cycle $($item.cycle)] " } else { '' }
      $detailText = if ($null -ne $item.details) { ($item.details | ConvertTo-Json -Compress -Depth 8) } else { '{}' }
      $reportLines.Add("- $cyclePrefix$($item.name) :: $detailText") | Out-Null
    }
    $reportLines.Add('') | Out-Null
  }
  $warningItems = @($script:Results | Where-Object { $_.status -eq 'warn' })
  if ($warningItems.Count -gt 0) {
    $reportLines.Add('## Warnings') | Out-Null
    foreach ($item in $warningItems) {
      $cyclePrefix = if ($item.cycle) { "[cycle $($item.cycle)] " } else { '' }
      $detailText = if ($null -ne $item.details) { ($item.details | ConvertTo-Json -Compress -Depth 8) } else { '{}' }
      $reportLines.Add("- $cyclePrefix$($item.name) :: $detailText") | Out-Null
    }
    $reportLines.Add('') | Out-Null
  }
  foreach ($line in @(
    '## Rerun',
    '- Run the same command again after fixing failures to confirm the gate is stable.',
    '- Recommended full gate command: `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\smoke-smart-library.ps1 -Cycles 2`',
    '- Fast debug command: `powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\smoke-smart-library.ps1 -Cycles 1 -SkipBuild -SkipTypeCheck -SkipLauncherValidate`'
  )) { $reportLines.Add($line) | Out-Null }
  Set-Content -LiteralPath $script:MarkdownReportPath -Value $reportLines -Encoding UTF8
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -LiteralPath $script:JsonReportPath -Destination (Join-Path $script:HistoryRoot "smoke-$stamp.json") -Force
  Copy-Item -LiteralPath $script:MarkdownReportPath -Destination (Join-Path $script:HistoryRoot "smoke-$stamp.md") -Force
  return $summary
}

function Test-CoreFlow([string]$BaseUrl, [string]$DatabasePath, [string]$CycleSuffix) {
  $adminSession = Login-User -BaseUrl $BaseUrl -Username 'admin' -Password 'admin123'
  Add-Result -Name 'Auth: admin login works' -Status 'pass' -Details @{ user = $adminSession.user.username }
  $machineSession = Login-User -BaseUrl $BaseUrl -Username 'machine01' -Password 'machine123'
  Add-Result -Name 'Auth: machine login works' -Status 'pass' -Details @{ user = $machineSession.user.username }
  $seedStudentSession = Try-Login-User -BaseUrl $BaseUrl -Username 'student001' -Password '123456'
  if ($seedStudentSession) { Add-Result -Name 'Auth: seed student login works' -Status 'pass' -Details @{ user = $seedStudentSession.user.username } }
  else { Add-Result -Name 'Auth: seed student account not present, blocked-reader online test will be partial' -Status 'warn' }
  $healthyStudentSession = Register-SmokeStudent -BaseUrl $BaseUrl -Suffix $CycleSuffix
  Add-Result -Name 'Auth: smoke student registration works' -Status 'pass' -Details @{ user = $healthyStudentSession.user.username }
  $lockoutStudentSession = Register-SmokeStudent -BaseUrl $BaseUrl -Suffix ($CycleSuffix + 'lock')
  Add-Result -Name 'Auth: lockout-test student registration works' -Status 'pass' -Details @{ user = $lockoutStudentSession.user.username }
  $healthResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/health"
  Assert-True -Name 'Runtime: health endpoint responds successfully' -Condition ($healthResponse.ok -and $healthResponse.body.success)
  $rootPage = Invoke-WebStatus -Url $BaseUrl
  Assert-True -Name 'Runtime: root path serves the SPA shell' -Condition ($rootPage.status -eq 200)
  $loginPage = Invoke-WebStatus -Url "$BaseUrl/login"
  Assert-True -Name 'Runtime: login route serves the SPA shell' -Condition ($loginPage.status -eq 200)
  $studentValidate = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/auth/validate" -Token $healthyStudentSession.token
  Assert-True -Name 'Auth: smoke student validate returns bound reader' -Condition ($studentValidate.ok -and $studentValidate.body.success -and [int]$studentValidate.body.data.reader_id -eq [int]$healthyStudentSession.user.reader_id)
  $machineValidate = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/auth/validate" -Token $machineSession.token
  Assert-True -Name 'Auth: machine validate preserves machine role' -Condition ($machineValidate.ok -and $machineValidate.body.success -and [string]$machineValidate.body.data.role -eq 'machine')
  $initialBorrowPinStatus = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/auth/borrow-pin/status" -Token $healthyStudentSession.token
  Assert-True -Name 'Borrow PIN: new reader starts without a configured PIN' -Condition ($initialBorrowPinStatus.ok -and $initialBorrowPinStatus.body.success -and -not $initialBorrowPinStatus.body.data.configured)
  $borrowPin = '246810'
  $setBorrowPinResponse = Set-BorrowPin -BaseUrl $BaseUrl -Token $healthyStudentSession.token -LoginPassword 'Smoke123456' -BorrowPin $borrowPin
  Assert-True -Name 'Borrow PIN: reader can set a machine verification PIN' -Condition ($setBorrowPinResponse.ok -and $setBorrowPinResponse.body.success -and $setBorrowPinResponse.body.data.configured)
  $borrowPinStatusAfterSet = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/auth/borrow-pin/status" -Token $healthyStudentSession.token
  Assert-True -Name 'Borrow PIN: status reports configured after save' -Condition ($borrowPinStatusAfterSet.ok -and $borrowPinStatusAfterSet.body.success -and $borrowPinStatusAfterSet.body.data.configured)
  $lockoutBorrowPin = '135790'
  $setLockoutPinResponse = Set-BorrowPin -BaseUrl $BaseUrl -Token $lockoutStudentSession.token -LoginPassword 'Smoke123456' -BorrowPin $lockoutBorrowPin
  Assert-True -Name 'Borrow PIN: lockout-test reader can set a PIN' -Condition ($setLockoutPinResponse.ok -and $setLockoutPinResponse.body.success -and $setLockoutPinResponse.body.data.configured)
  $booksResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/books" -Token $healthyStudentSession.token
  $bookItems = if ($booksResponse.ok -and $booksResponse.body.success) { @($booksResponse.body.data) } else { @() }
  Assert-True -Name 'Books: reader can load the catalog list' -Condition ($booksResponse.ok -and $booksResponse.body.success -and $bookItems.Count -gt 0)
  $samples = Get-SmokeSamples -DatabasePath $DatabasePath
  $reservationCandidate = $null
  if ($samples.availableCopy -and -not $samples.availableCopy.error) { $reservationCandidate = $bookItems | Where-Object { [int]$_.id -eq [int]$samples.availableCopy.book_id } | Select-Object -First 1 }
  if (-not $reservationCandidate) { $reservationCandidate = $bookItems | Where-Object { $_.status -eq 'normal' -and [int]$_.available_quantity -gt 0 } | Select-Object -First 1 }
  $zeroBook = $bookItems | Where-Object { $_.status -eq 'normal' -and [int]$_.available_quantity -le 0 } | Select-Object -First 1
  $abnormalBook = $bookItems | Where-Object { $_.status -ne 'normal' } | Select-Object -First 1
  $studentBookId = if ($reservationCandidate) { [int]$reservationCandidate.id } else { 1 }
  $studentBorrowAttempt = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/borrowings" -Token $healthyStudentSession.token -Body @{ reader_id = $healthyStudentSession.user.reader_id; book_id = $studentBookId }
  Assert-True -Name 'Permission: students cannot borrow physical books online' -Condition ($studentBorrowAttempt.status -eq 403) -Details @{ status = $studentBorrowAttempt.status; error = $studentBorrowAttempt.error }
  $studentMachineAccess = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/readers/suggest?keyword=STU" -Token $healthyStudentSession.token
  Assert-True -Name 'Permission: students cannot access machine-only APIs' -Condition ($studentMachineAccess.status -eq 403) -Details @{ status = $studentMachineAccess.status; error = $studentMachineAccess.error }
  if ($reservationCandidate) {
    $machineReservationAttempt = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $machineSession.token -Body @{ bookId = $reservationCandidate.id }
    Assert-True -Name 'Permission: machine account cannot create reader reservations' -Condition (-not $machineReservationAttempt.ok) -Details @{ status = $machineReservationAttempt.status; error = $machineReservationAttempt.error }
  } else { Add-Result -Name 'Permission: no reservable book sample for machine-reservation boundary test' -Status 'skip' }
  $borrowingResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/borrowings/my" -Token $healthyStudentSession.token
  Assert-True -Name 'Borrowing center: student can load personal borrowing data' -Condition ($borrowingResponse.ok -and $borrowingResponse.body.success)
  $notesResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/notes/my" -Token $healthyStudentSession.token
  Assert-True -Name 'Notes: student can load personal notes list' -Condition ($notesResponse.ok -and $notesResponse.body.success)
  $aiAvailableResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/ai/available" -Token $healthyStudentSession.token
  Assert-True -Name 'AI: availability endpoint responds successfully' -Condition ($aiAvailableResponse.ok -and $aiAvailableResponse.body.success)
  $machineReaderSuggestResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/readers/suggest?keyword=R2024" -Token $machineSession.token
  Assert-True -Name 'Machine privacy: public terminal cannot list reader suggestions' -Condition ($machineReaderSuggestResponse.status -eq 403) -Details @{ status = $machineReaderSuggestResponse.status; error = $machineReaderSuggestResponse.error }
  $copySuggestResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/copies/suggest?keyword=BK" -Token $machineSession.token
  $copySuggestions = if ($copySuggestResponse.ok -and $copySuggestResponse.body.success) { @($copySuggestResponse.body.data) } else { @() }
  Assert-True -Name 'Machine autocomplete: copy suggestions are available' -Condition ($copySuggestResponse.ok -and $copySuggestResponse.body.success -and $copySuggestions.Count -gt 0)
  if ($reservationCandidate) {
    $reserveResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $healthyStudentSession.token -Body @{ bookId = $reservationCandidate.id }
    Assert-True -Name 'Reservation: healthy reader can reserve an available normal book' -Condition ($reserveResponse.ok -and $reserveResponse.body.success) -Details @{ book = $reservationCandidate.title }
    $reservationsAfterCreate = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/reservations/my" -Token $healthyStudentSession.token
    $reservationItems = if ($reservationsAfterCreate.ok -and $reservationsAfterCreate.body.success) { @($reservationsAfterCreate.body.data) } else { @() }
    $createdReservation = $reservationItems | Where-Object { [int]$_.book_id -eq [int]$reservationCandidate.id -and $_.status -eq 'pending' } | Select-Object -First 1
    Assert-True -Name 'Reservation: pending reservation appears in my reservations' -Condition ($null -ne $createdReservation)
    $duplicateResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $healthyStudentSession.token -Body @{ bookId = $reservationCandidate.id }
    Assert-True -Name 'Reservation: duplicate reservation is rejected' -Condition (-not $duplicateResponse.ok) -Details @{ status = $duplicateResponse.status; error = $duplicateResponse.error }
  } else { Add-Result -Name 'Reservation: no reservable normal book sample' -Status 'skip' }
  if ($zeroBook) {
    $zeroReserveResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $healthyStudentSession.token -Body @{ bookId = $zeroBook.id }
    Assert-True -Name 'Reservation boundary: zero-stock book is rejected' -Condition (-not $zeroReserveResponse.ok) -Details @{ book = $zeroBook.title; status = $zeroReserveResponse.status; error = $zeroReserveResponse.error }
  } else { Add-Result -Name 'Reservation boundary: no zero-stock normal book sample' -Status 'skip' }
  if ($abnormalBook) {
    $abnormalReserveResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $healthyStudentSession.token -Body @{ bookId = $abnormalBook.id }
    Assert-True -Name 'Reservation boundary: abnormal catalog status is rejected' -Condition (-not $abnormalReserveResponse.ok) -Details @{ book = $abnormalBook.title; bookStatus = $abnormalBook.status; status = $abnormalReserveResponse.status }
  } else { Add-Result -Name 'Reservation boundary: no abnormal catalog sample' -Status 'skip' }
  if ($seedStudentSession -and $reservationCandidate) {
    $readerCheck = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/readers/$($seedStudentSession.user.reader_id)/can-borrow" -Token $adminSession.token
    if ($readerCheck.ok -and $readerCheck.body.success -and -not $readerCheck.body.data.canBorrow) {
      $blockedReserveResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/reservations" -Token $seedStudentSession.token -Body @{ bookId = $reservationCandidate.id }
      Assert-True -Name 'Reservation boundary: blocked reader cannot keep reserving' -Condition (-not $blockedReserveResponse.ok) -Details @{ reason = $readerCheck.body.data.reason; status = $blockedReserveResponse.status; error = $blockedReserveResponse.error }
    } else { Add-Result -Name 'Reservation boundary: seed student is currently borrowable, blocked-reader online test skipped' -Status 'skip' }
  } else { Add-Result -Name 'Reservation boundary: blocked-reader online test skipped due to missing sample' -Status 'skip' }
  if (-not ($samples.availableCopy -and -not $samples.availableCopy.error)) { Add-Result -Name 'Machine flow: no available copy sample for borrow-return loop' -Status 'skip'; return }
  $copySummary = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/copy/$($samples.availableCopy.barcode)" -Token $machineSession.token
  Assert-True -Name 'Machine flow: available copy suggests borrow action' -Condition ($copySummary.ok -and $copySummary.body.data.suggested_action -eq 'borrow') -Details @{ barcode = $samples.availableCopy.barcode }
  $smokeReaderResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/readers/$($healthyStudentSession.user.reader_id)" -Token $adminSession.token
  Assert-True -Name 'Reader lookup: admin can resolve smoke student profile' -Condition ($smokeReaderResponse.ok -and $smokeReaderResponse.body.success -and $smokeReaderResponse.body.data.reader_no)
  if (-not ($smokeReaderResponse.ok -and $smokeReaderResponse.body.success -and $smokeReaderResponse.body.data.reader_no)) { return }
  $smokeReaderNo = [string]$smokeReaderResponse.body.data.reader_no
  $adminReaderSuggestResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/readers/suggest?keyword=$smokeReaderNo" -Token $adminSession.token
  Assert-True -Name 'Machine admin support: staff can still list reader suggestions' -Condition ($adminReaderSuggestResponse.ok -and $adminReaderSuggestResponse.body.success) -Details @{ status = $adminReaderSuggestResponse.status; error = $adminReaderSuggestResponse.error; keyword = $smokeReaderNo }
  $readerSummary = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/reader/$smokeReaderNo" -Token $machineSession.token
  Assert-True -Name 'Machine flow: smoke student can be resolved in terminal' -Condition ($readerSummary.ok -and $readerSummary.body.success -and -not $readerSummary.body.data.has_overdue_books -and $readerSummary.body.data.borrow_pin_configured) -Details @{ readerNo = $smokeReaderNo }
  Assert-True -Name 'Machine privacy: unresolved reader summary masks identity' -Condition ($readerSummary.ok -and $readerSummary.body.success -and -not $readerSummary.body.data.is_verified -and [string]$readerSummary.body.data.display_name -ne [string]$smokeReaderResponse.body.data.name) -Details @{ displayName = if ($readerSummary.ok) { $readerSummary.body.data.display_name } else { $null } }
  $wrongPinResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/reader/verify" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; borrowPin = '0000' }
  Assert-True -Name 'Machine security: wrong reader PIN is rejected' -Condition (-not $wrongPinResponse.ok) -Details @{ status = $wrongPinResponse.status; error = $wrongPinResponse.error }
  $verificationResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/reader/verify" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; borrowPin = $borrowPin }
  $verificationToken = if ($verificationResponse.ok -and $verificationResponse.body.success) { [string]$verificationResponse.body.data.verification_token } else { '' }
  Assert-True -Name 'Machine security: correct reader PIN returns short-lived token' -Condition ($verificationResponse.ok -and $verificationResponse.body.success -and $verificationToken.Length -ge 16 -and $verificationResponse.body.data.reader.is_verified) -Details @{ readerNo = $smokeReaderNo }
  $lockoutReaderResponse = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/readers/$($lockoutStudentSession.user.reader_id)" -Token $adminSession.token
  $lockoutReaderNo = if ($lockoutReaderResponse.ok -and $lockoutReaderResponse.body.success) { [string]$lockoutReaderResponse.body.data.reader_no } else { '' }
  Assert-True -Name 'Reader lookup: admin can resolve lockout-test reader' -Condition ($lockoutReaderNo.Length -gt 0)
  if ($lockoutReaderNo.Length -gt 0) {
    $lastLockoutFailure = $null
    for ($attempt = 1; $attempt -le 5; $attempt++) {
      $lastLockoutFailure = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/reader/verify" -Token $machineSession.token -Body @{ readerNo = $lockoutReaderNo; borrowPin = '0000' }
    }
    Assert-True -Name 'Machine security: five wrong PIN attempts trigger lockout' -Condition (-not $lastLockoutFailure.ok) -Details @{ status = $lastLockoutFailure.status; error = $lastLockoutFailure.error }
    $correctPinDuringLockout = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/reader/verify" -Token $machineSession.token -Body @{ readerNo = $lockoutReaderNo; borrowPin = $lockoutBorrowPin }
    Assert-True -Name 'Machine security: locked reader cannot bypass with correct PIN' -Condition (-not $correctPinDuringLockout.ok) -Details @{ status = $correctPinDuringLockout.status; error = $correctPinDuringLockout.error }
  }
  $legacyBeforeReturn = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/notes" -Token $healthyStudentSession.token -Body @{ title = "Smoke legacy pre-return $CycleSuffix"; content = 'This note should be rejected before any return record exists.'; book_id = $samples.availableCopy.book_id; visibility = 'legacy' }
  Assert-True -Name 'Notes boundary: legacy note requires a returned borrowing first' -Condition (-not $legacyBeforeReturn.ok) -Details @{ status = $legacyBeforeReturn.status; error = $legacyBeforeReturn.error }
  $borrowWithoutToken = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/borrow" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; barcode = $samples.availableCopy.barcode }
  Assert-True -Name 'Machine security: borrow without verification token is rejected' -Condition (-not $borrowWithoutToken.ok) -Details @{ status = $borrowWithoutToken.status; error = $borrowWithoutToken.error }
  $borrowWithFakeToken = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/borrow" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; barcode = $samples.availableCopy.barcode; verificationToken = 'fake-verification-token-0000' }
  Assert-True -Name 'Machine security: borrow with invalid token is rejected' -Condition (-not $borrowWithFakeToken.ok) -Details @{ status = $borrowWithFakeToken.status; error = $borrowWithFakeToken.error }
  $borrowResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/borrow" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; barcode = $samples.availableCopy.barcode; verificationToken = $verificationToken }
  Assert-True -Name 'Machine flow: verified reader can borrow by barcode' -Condition ($borrowResponse.ok -and $borrowResponse.body.success) -Details @{ readerNo = $smokeReaderNo; barcode = $samples.availableCopy.barcode }
  Assert-True -Name 'Machine flow: borrow response copy status is refreshed to borrowed' -Condition ($borrowResponse.ok -and $borrowResponse.body.data.copy.status -eq 'borrowed') -Details @{ returnedStatus = if ($borrowResponse.ok) { $borrowResponse.body.data.copy.status } else { $null } }
  $afterBorrowSummary = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/copy/$($samples.availableCopy.barcode)" -Token $machineSession.token
  Assert-True -Name 'Machine flow: borrowed copy now suggests return action' -Condition ($afterBorrowSummary.ok -and $afterBorrowSummary.body.data.suggested_action -eq 'return')
  if ($reservationCandidate -and ([int]$reservationCandidate.id -eq [int]$samples.availableCopy.book_id)) {
    $reservationsAfterBorrow = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/reservations/my" -Token $healthyStudentSession.token
    $reservationItemsAfterBorrow = if ($reservationsAfterBorrow.ok -and $reservationsAfterBorrow.body.success) { @($reservationsAfterBorrow.body.data) } else { @() }
    $fulfilledReservation = $reservationItemsAfterBorrow | Where-Object { [int]$_.book_id -eq [int]$reservationCandidate.id } | Sort-Object id -Descending | Select-Object -First 1
    Assert-True -Name 'Reservation flow: machine pickup fulfills the pending reservation' -Condition ($null -ne $fulfilledReservation -and $fulfilledReservation.status -eq 'fulfilled') -Details @{ status = if ($fulfilledReservation) { $fulfilledReservation.status } else { $null } }
  } else { Add-Result -Name 'Reservation flow: reserved book and machine sample differ, fulfillment check skipped' -Status 'skip' }
  $doubleBorrowResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/borrow" -Token $machineSession.token -Body @{ readerNo = $smokeReaderNo; barcode = $samples.availableCopy.barcode; verificationToken = $verificationToken }
  Assert-True -Name 'Machine boundary: an already-borrowed copy cannot be borrowed again' -Condition (-not $doubleBorrowResponse.ok) -Details @{ status = $doubleBorrowResponse.status; error = $doubleBorrowResponse.error }
  $returnResponse = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/return" -Token $machineSession.token -Body @{ barcode = $samples.availableCopy.barcode }
  Assert-True -Name 'Machine flow: borrowed copy can be returned by barcode' -Condition ($returnResponse.ok -and $returnResponse.body.success)
  Assert-True -Name 'Machine flow: return response copy status is refreshed to available' -Condition ($returnResponse.ok -and $returnResponse.body.data.copy.status -eq 'available') -Details @{ returnedStatus = if ($returnResponse.ok) { $returnResponse.body.data.copy.status } else { $null } }
  $afterReturnSummary = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/machine/copy/$($samples.availableCopy.barcode)" -Token $machineSession.token
  Assert-True -Name 'Machine flow: returned copy suggests borrow action again' -Condition ($afterReturnSummary.ok -and $afterReturnSummary.body.data.suggested_action -eq 'borrow')
  $secondReturn = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/machine/return" -Token $machineSession.token -Body @{ barcode = $samples.availableCopy.barcode }
  Assert-True -Name 'Machine boundary: an available copy cannot be returned twice' -Condition (-not $secondReturn.ok) -Details @{ status = $secondReturn.status; error = $secondReturn.error }
  $legacyAfterReturn = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/notes" -Token $healthyStudentSession.token -Body @{ title = "Smoke legacy note $CycleSuffix"; content = "Legacy note created after the borrow-return loop for cycle $CycleSuffix."; book_id = $samples.availableCopy.book_id; visibility = 'legacy' }
  Assert-True -Name 'Notes flow: legacy note can be created after return' -Condition ($legacyAfterReturn.ok -and $legacyAfterReturn.body.success)
  if ($legacyAfterReturn.ok -and $legacyAfterReturn.body.success) {
    $legacyNoteId = [int]$legacyAfterReturn.body.data.id
    $legacyFetch = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/notes/$legacyNoteId" -Token $healthyStudentSession.token
    Assert-True -Name 'Notes flow: created legacy note is readable by its author' -Condition ($legacyFetch.ok -and $legacyFetch.body.success -and [int]$legacyFetch.body.data.id -eq $legacyNoteId)
    $legacyByBook = Invoke-ApiJson -Method 'Get' -Url "$BaseUrl/api/v1/notes/legacy/$($samples.availableCopy.book_id)" -Token $healthyStudentSession.token
    Assert-True -Name 'Notes flow: legacy note can be resolved by book id' -Condition ($legacyByBook.ok -and $legacyByBook.body.success -and [int]$legacyByBook.body.data.id -eq $legacyNoteId)
    $duplicateLegacy = Invoke-ApiJson -Method 'Post' -Url "$BaseUrl/api/v1/notes" -Token $healthyStudentSession.token -Body @{ title = "Smoke duplicate legacy $CycleSuffix"; content = 'This second legacy note for the same returned borrowing should be rejected.'; book_id = $samples.availableCopy.book_id; visibility = 'legacy' }
    Assert-True -Name 'Notes boundary: one returned borrowing yields only one legacy note' -Condition (-not $duplicateLegacy.ok) -Details @{ status = $duplicateLegacy.status; error = $duplicateLegacy.error }
  }
}

function Invoke-SmokeCycle([int]$Cycle) {
  Write-Step "Smoke cycle $Cycle/$Cycles"
  $script:CurrentCycle = $Cycle
  $databasePath = New-SmokeDatabase -Cycle $Cycle
  $port = Get-FreePort -StartPort ($PreferredPort + $Cycle - 1)
  $baseUrl = "http://127.0.0.1:$port"
  $logPath = Join-Path $script:SmokeRoot "server-cycle$Cycle.log"
  $errorPath = Join-Path $script:SmokeRoot "server-cycle$Cycle.err.log"
  $serverProcess = $null
  try {
    $serverProcess = Start-SmokeServer -DatabasePath $databasePath -Port $port -LogPath $logPath -ErrorPath $errorPath
    if (-not (Wait-Health -BaseUrl $baseUrl -TimeoutSeconds 45)) {
      Add-Result -Name "Startup: cycle $Cycle server failed health check" -Status 'fail' -Details @{ port = $port; log = $logPath; errorLog = $errorPath }
      return
    }
    Add-Result -Name "Startup: cycle $Cycle server health check passed" -Status 'pass' -Details @{ port = $port }
    Test-CoreFlow -BaseUrl $baseUrl -DatabasePath $databasePath -CycleSuffix ("$Cycle" + (Get-Date -Format 'HHmmss'))
  } finally {
    Stop-SmokeServer -Process $serverProcess
    if (-not $KeepArtifacts) { Remove-Item -LiteralPath $databasePath -Force -ErrorAction SilentlyContinue }
    $script:CurrentCycle = 0
  }
}

Ensure-Directory $script:SmokeRoot
Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host '  Smart Library Release Smoke Gate' -ForegroundColor DarkCyan
Write-Host '========================================' -ForegroundColor DarkCyan
if ($Cycles -lt 1) { throw 'Cycles must be greater than 0.' }
if (-not $SkipLauncherValidate) {
  Invoke-CommandChecked -Name 'Launcher validate: start-smart-library.ps1 -ValidateOnly' -ScriptBlock {
    & powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File '.\scripts\windows\start-smart-library.ps1' -ValidateOnly -NoBrowser
  }
}
if (-not $SkipTypeCheck) {
  Invoke-CommandChecked -Name 'Typecheck: server TypeScript noEmit' -ScriptBlock {
    & volta run --node 20.20.2 npx tsc -p server/tsconfig.json --noEmit
  }
}
if (-not $SkipBuild) {
  Invoke-CommandChecked -Name 'Build: web production build' -ScriptBlock {
    & volta run --node 20.20.2 npm --prefix web run build
  }
}
Test-CodeBoundaries
for ($cycleIndex = 1; $cycleIndex -le $Cycles; $cycleIndex++) { Invoke-SmokeCycle -Cycle $cycleIndex }
$summary = Write-ReportArtifacts
Write-Host ''
Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host '  Smoke Summary' -ForegroundColor DarkCyan
Write-Host '========================================' -ForegroundColor DarkCyan
Write-Host "JSON Report: $script:JsonReportPath"
Write-Host "Markdown Report: $script:MarkdownReportPath"
Write-Host "Passed: $($summary.passed), Failed: $($summary.failed), Warnings: $($summary.warnings), Skipped: $($summary.skipped)"
if ($summary.failed -gt 0) {
  Write-Fail 'Release smoke gate failed. Fix the failed items, then rerun the same command.'
  exit 1
}
Write-Ok 'Release smoke gate passed.'
