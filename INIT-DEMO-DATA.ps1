$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$seed = Join-Path $root 'seed-data\budget.sqlite3'
$live = Join-Path $root 'data\budget.sqlite3'
$expected = '05a4d9c756e72507e0c8ef25d889678a907ce0da27ac6f96aec30a207981e774'
if (-not (Test-Path -LiteralPath $seed -PathType Leaf)) { throw "Demo seed database missing: $seed" }
$actual = (Get-FileHash -LiteralPath $seed -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw 'Demo seed SHA-256 failed; refusing to create local database.' }
if (Test-Path -LiteralPath $live) {
    Write-Host 'Existing local data/budget.sqlite3 was NOT changed.' -ForegroundColor Green
    exit 0
}
New-Item -ItemType Directory -Path (Split-Path -Parent $live) -Force | Out-Null
Copy-Item -LiteralPath $seed -Destination $live -ErrorAction Stop
Write-Host 'Clean demo database created. No financial transactions included.' -ForegroundColor Green
