param([switch]$SkipNpmCi)
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot

Write-Host '=== BUDGET STANDALONE v0.2 Stable / DEV BUILD ===' -ForegroundColor Magenta
if (-not (Get-Command rustc -ErrorAction SilentlyContinue)) { throw 'Rust/rustc was not found.' }
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) { throw 'Cargo was not found.' }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm was not found.' }
Write-Host ('Rust: ' + (& rustc --version))

Write-Host "`n[1/4] Dependencies..." -ForegroundColor Cyan
$tauriCli = Join-Path $PSScriptRoot 'node_modules\.bin\tauri.cmd'
if (-not $SkipNpmCi -and -not (Test-Path -LiteralPath $tauriCli)) {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }
} elseif (Test-Path -LiteralPath $tauriCli) {
  Write-Host 'npm dependencies: cached'
} elseif ($SkipNpmCi) {
  throw 'Tauri CLI is missing while -SkipNpmCi was requested.'
}

Write-Host "`n[2/4] Verifying standalone..." -ForegroundColor Cyan
npm run verify
if ($LASTEXITCODE -ne 0) { throw "verify failed: $LASTEXITCODE" }

Write-Host "`n[3/4] Building DEV EXE..." -ForegroundColor Cyan
npm run build:dev
if ($LASTEXITCODE -ne 0) { throw "build failed: $LASTEXITCODE" }

Write-Host "`n[4/4] Refreshing portable DEV copy..." -ForegroundColor Cyan
$portable = Join-Path $PSScriptRoot 'Portable\Budget_Standalone_v0.2_Stable_DEV'
New-Item -ItemType Directory -Force -Path $portable | Out-Null
$exe = Join-Path $PSScriptRoot 'src-tauri\target\debug\budget.exe'
if (-not (Test-Path $exe)) { throw "EXE not found: $exe" }
Copy-Item $exe (Join-Path $portable 'Budget.exe') -Force
New-Item -ItemType Directory -Force -Path (Join-Path $portable 'seed-data') | Out-Null
Copy-Item 'seed-data\budget.sqlite3' (Join-Path $portable 'seed-data\budget.sqlite3') -Force
$dataDir = Join-Path $portable 'data'
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$portableDb = Join-Path $dataDir 'budget.sqlite3'
if (-not (Test-Path $portableDb)) { Copy-Item 'data\budget.sqlite3' $portableDb -Force }
$size = [math]::Round((Get-Item (Join-Path $portable 'Budget.exe')).Length / 1MB, 2)
Write-Host "Portable: $portable"
Write-Host "EXE:      $size MB"
Write-Host "`n=== DEV BUILD READY ===" -ForegroundColor Green
Write-Host 'Existing portable data/backups were preserved.'
