# Budget Startup Preview: validate the compiled EXE is a Windows GUI application.
# Windows PowerShell 5.1 compatible. Read-only; does not launch or modify the executable.
param([Parameter(Mandatory=$true)][string]$ExePath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) {
  throw "Budget EXE not found: $ExePath"
}
$stream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $ExePath).Path)
try {
  $reader = New-Object System.IO.BinaryReader($stream)
  try {
    if ($stream.Length -lt 512) { throw 'Invalid PE file: too small' }
    $stream.Seek(0, [System.IO.SeekOrigin]::Begin) | Out-Null
    if ($reader.ReadUInt16() -ne 0x5A4D) { throw 'Invalid EXE: MZ header missing' }
    $stream.Seek(0x3C, [System.IO.SeekOrigin]::Begin) | Out-Null
    $peOffset = $reader.ReadInt32()
    if ($peOffset -lt 0x40 -or ([long]$peOffset + 96) -gt $stream.Length) {
      throw 'Invalid EXE: PE header offset outside file'
    }
    $stream.Seek($peOffset, [System.IO.SeekOrigin]::Begin) | Out-Null
    if ($reader.ReadUInt32() -ne 0x00004550) { throw 'Invalid EXE: PE signature missing' }
    $optionalHeader = $peOffset + 24
    $stream.Seek($optionalHeader, [System.IO.SeekOrigin]::Begin) | Out-Null
    $magic = $reader.ReadUInt16()
    if ($magic -ne 0x10B -and $magic -ne 0x20B) {
      throw "Invalid EXE: optional header magic $magic"
    }
    $stream.Seek(($optionalHeader + 68), [System.IO.SeekOrigin]::Begin) | Out-Null
    $subsystem = $reader.ReadUInt16()
    if ($subsystem -ne 2) {
      throw "Budget EXE must use Windows GUI subsystem (2), got $subsystem"
    }
    Write-Host 'BUDGET EXE PE SUBSYSTEM: WINDOWS GUI (2) PASS' -ForegroundColor Green
  } finally { $reader.Dispose() }
} finally { $stream.Dispose() }
