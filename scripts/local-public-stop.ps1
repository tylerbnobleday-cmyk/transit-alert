$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$publicPidPath = Join-Path $repoRoot ".local-public\cloudflared.pid"
$cloudflaredPath = Join-Path $repoRoot ".local-host\bin\cloudflared.exe"

if (Test-Path $publicPidPath) {
  $pidValue = (Get-Content $publicPidPath | Select-Object -First 1).Trim()
  if ($pidValue) {
    $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $pidValue -Force
    }
  }
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -eq $cloudflaredPath
} | ForEach-Object {
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}

if (!(Test-Path $publicPidPath)) {
  Write-Output "Public tunnel stopped."
  exit 0
  }

Remove-Item $publicPidPath -Force -ErrorAction SilentlyContinue
Write-Output "Public tunnel stopped."
