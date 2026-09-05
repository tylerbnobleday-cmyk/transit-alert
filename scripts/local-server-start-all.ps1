$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hostStart = Join-Path $PSScriptRoot "local-host-start.ps1"
$cloudflaredPath = Join-Path $repoRoot ".local-host\bin\cloudflared.exe"
$publicDir = Join-Path $repoRoot ".local-public"
$tokenPath = Join-Path $publicDir "tunnel-token.txt"
$configPath = Join-Path $publicDir "config.yml"
$pidPath = Join-Path $publicDir "cloudflared.pid"
$outLog = Join-Path $publicDir "cloudflared.out.log"
$errLog = Join-Path $publicDir "cloudflared.err.log"
$healthLog = Join-Path $publicDir "supervisor.log"

function Write-HealthLog([string]$Message) {
  Add-Content -LiteralPath $healthLog -Value "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK') $Message"
}

# Run the host check in this process. Spawning a nested PowerShell here could
# leave the watchdog waiting indefinitely after Windows logon, so the tunnel
# startup below was never reached.
& $hostStart | Out-Null

if (!(Test-Path -LiteralPath $cloudflaredPath)) {
  throw "Cloudflare connector is missing: $cloudflaredPath"
}
if (!(Test-Path -LiteralPath $tokenPath)) {
  throw "Cloudflare tunnel token is missing: $tokenPath"
}
if (!(Test-Path -LiteralPath $configPath)) {
  throw "Cloudflare tunnel config is missing: $configPath"
}

New-Item -ItemType Directory -Path $publicDir -Force | Out-Null

$running = $null
if (Test-Path -LiteralPath $pidPath) {
  $savedPid = (Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($savedPid) {
    $candidate = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.ProcessName -eq "cloudflared") {
      $running = $candidate
    }
  }
}
if (-not $running) {
  $running = Get-Process cloudflared -ErrorAction SilentlyContinue | Select-Object -First 1
}

if ($running) {
  Set-Content -LiteralPath $pidPath -Value $running.Id -Encoding ASCII
  exit 0
}

Write-HealthLog "Cloudflare connector was offline; starting a replacement using HTTP/2."
$process = Start-Process `
  -FilePath $cloudflaredPath `
  -ArgumentList @("--config", $configPath, "tunnel", "--protocol", "http2", "--no-autoupdate", "run", "--token-file", $tokenPath) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -PassThru

Set-Content -LiteralPath $pidPath -Value $process.Id -Encoding ASCII
Start-Sleep -Seconds 3
if (-not (Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
  Write-HealthLog "Cloudflare connector exited during startup. See cloudflared.err.log."
  throw "Cloudflare connector exited during startup."
}
Write-HealthLog "Cloudflare connector started successfully on PID $($process.Id)."
