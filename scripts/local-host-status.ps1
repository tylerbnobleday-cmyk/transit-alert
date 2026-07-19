$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hostDir = Join-Path $repoRoot ".local-host"
$pidPath = Join-Path $hostDir "server.pid"
$configPath = Join-Path $hostDir "host-config.ps1"

if (!(Test-Path $configPath)) {
  Write-Output "Host config has not been created yet."
  exit 0
}

. $configPath

$status = "stopped"
$pidValue = ""
if (Test-Path $pidPath) {
  $pidValue = (Get-Content $pidPath | Select-Object -First 1).Trim()
  if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
    $status = "running"
  }
}

Write-Output "Status: $status"
Write-Output "Port: $($HostConfig.Port)"
Write-Output "Local URL: http://localhost:$($HostConfig.Port)/"
Write-Output "LAN URL: http://192.168.1.32:$($HostConfig.Port)/"
if ($pidValue) {
  Write-Output "PID: $pidValue"
}
Write-Output "Logs: $hostDir"
