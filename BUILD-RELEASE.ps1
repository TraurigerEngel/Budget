param([switch]$SkipNpmCi)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

function Get-Sha256Hex {
  param([Parameter(Mandatory=$true)][string]$Path)
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { $hash = $sha.ComputeHash($stream) } finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
  return ([System.BitConverter]::ToString($hash) -replace '-', '').ToLowerInvariant()
}

function Replace-DirectorySafely {
  param(
    [Parameter(Mandatory=$true)][string]$Stage,
    [Parameter(Mandatory=$true)][string]$Target
  )
  $old = "$Target.previous-$PID"
  if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force }
  if (Test-Path -LiteralPath $Target) { Move-Item -LiteralPath $Target -Destination $old }
  try {
    Move-Item -LiteralPath $Stage -Destination $Target
    if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Recurse -Force }
  } catch {
    if (Test-Path -LiteralPath $Target) { Remove-Item -LiteralPath $Target -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $old) { Move-Item -LiteralPath $old -Destination $Target -ErrorAction SilentlyContinue }
    throw
  }
}

$releaseName = 'Budget_Standalone_v0.2_Stable'
$releaseRoot = Join-Path $PSScriptRoot 'Release'
$out = Join-Path $releaseRoot $releaseName
$stage = Join-Path $releaseRoot ('.' + $releaseName + '.stage')
if (Test-Path -LiteralPath $out) { throw 'Release already exists; refusing to overwrite Budget data. Use a new release folder.' }
if (Test-Path -LiteralPath $stage) { throw 'Release stage already exists; inspect before rebuilding.' }
$manifestPath = Join-Path $PSScriptRoot 'src-tauri\Cargo.toml'
$lockPath = Join-Path $PSScriptRoot 'src-tauri\Cargo.lock'

Write-Host '=== BUDGET STANDALONE v0.2 Stable / RELEASE BUILD ===' -ForegroundColor Magenta

foreach ($tool in @('rustc','cargo','npm','node')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool was not found." }
}
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'src-tauri\Cargo.toml is required for release builds.' }
if (-not (Test-Path -LiteralPath $lockPath)) { throw 'Cargo.lock is required for release builds.' }

Write-Host "`n[1/6] Locked dependencies..." -ForegroundColor Cyan
if (-not $SkipNpmCi) {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }
} elseif (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
  throw 'node_modules is missing while -SkipNpmCi was requested.'
} else {
  Write-Host 'npm ci skipped; cached node_modules will be used.'
}
cargo metadata --locked --format-version 1 --no-deps --manifest-path $manifestPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw "cargo metadata --locked failed: $LASTEXITCODE" }
$lockBefore = Get-Sha256Hex -Path $lockPath

Write-Host "`n[2/6] Auditing Rust dependencies..." -ForegroundColor Cyan
if (-not (Get-Command cargo-audit -ErrorAction SilentlyContinue)) {
  throw 'cargo-audit was not found. Install once with: cargo install cargo-audit --locked'
}
cargo audit --file $lockPath
if ($LASTEXITCODE -ne 0) { throw "cargo audit failed: $LASTEXITCODE" }

Write-Host "`n[3/6] Verifying source and release guards..." -ForegroundColor Cyan
npm run verify
if ($LASTEXITCODE -ne 0) { throw "verify failed: $LASTEXITCODE" }

Write-Host "`n[4/6] Building release EXE..." -ForegroundColor Cyan
npm run build:release
if ($LASTEXITCODE -ne 0) { throw "build failed: $LASTEXITCODE" }
$lockAfter = Get-Sha256Hex -Path $lockPath
if ($lockBefore -ne $lockAfter) { throw 'Cargo.lock changed during release build.' }

Write-Host "`n[5/6] Creating staged portable directory..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$exe = Join-Path $PSScriptRoot 'src-tauri\target\release\budget.exe'
if (-not (Test-Path -LiteralPath $exe)) { throw "EXE not found: $exe" }
& (Join-Path $PSScriptRoot 'scripts\verify-windows-gui-exe.ps1') -ExePath $exe
if ($LASTEXITCODE -ne 0) { throw 'Windows GUI PE subsystem verification failed' }
Copy-Item -LiteralPath $exe -Destination (Join-Path $stage 'Budget.exe') -Force
foreach ($kind in @('data','seed-data')) {
  $src = Join-Path $PSScriptRoot ($kind + '\budget.sqlite3')
  $dstDir = Join-Path $stage $kind
  New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
  Copy-Item -LiteralPath $src -Destination (Join-Path $dstDir 'budget.sqlite3') -Force
}

Write-Host "`n[6/6] Verifying and publishing portable artifact..." -ForegroundColor Cyan
node --no-warnings scripts\verify-release-artifact.js $stage
if ($LASTEXITCODE -ne 0) { throw "release artifact verification failed: $LASTEXITCODE" }
$exeHash = Get-Sha256Hex -Path (Join-Path $stage 'Budget.exe')
Replace-DirectorySafely -Stage $stage -Target $out

$size = [math]::Round((Get-Item -LiteralPath (Join-Path $out 'Budget.exe')).Length / 1MB, 2)
Write-Host "`n=== RELEASE PORTABLE READY ===" -ForegroundColor Green
Write-Host "Portable: $out"
Write-Host "EXE:      $size MB"
Write-Host "EXE SHA-256: $exeHash"
