$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$pidPath = Join-Path $repoRoot ".local-host\server.pid"

if (!(Test-Path $pidPath)) {
  Write-Output "TransitAlert host is not running."
  exit 0
}

$pidValue = (Get-Content $pidPath | Select-Object -First 1).Trim()
if (!$pidValue) {
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
  Write-Output "TransitAlert host PID file was empty."
  exit 0
}

$process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $pidValue -Force
}

Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
Write-Output "TransitAlert host stopped."
