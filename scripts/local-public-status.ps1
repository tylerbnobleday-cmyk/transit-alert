$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $repoRoot ".local-public"
$hostStatusScript = Join-Path $PSScriptRoot "local-host-status.ps1"
$publicPidPath = Join-Path $publicDir "cloudflared.pid"
$publicUrlPath = Join-Path $publicDir "public-url.txt"

& powershell -NoProfile -ExecutionPolicy Bypass -File $hostStatusScript

$status = "stopped"
$pidValue = ""
if (Test-Path $publicPidPath) {
  $pidValue = (Get-Content $publicPidPath | Select-Object -First 1).Trim()
  if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
    $status = "running"
  }
}

Write-Output "Public tunnel: $status"
if ($pidValue) {
  Write-Output "Tunnel PID: $pidValue"
}
if (Test-Path $publicUrlPath) {
  Write-Output ("Public URL: " + (Get-Content $publicUrlPath | Select-Object -First 1))
}
Write-Output "Tunnel logs: $publicDir"
