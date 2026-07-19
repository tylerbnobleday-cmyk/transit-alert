$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hostDir = Join-Path $repoRoot ".local-host"
$configPath = Join-Path $hostDir "host-config.ps1"
$pidPath = Join-Path $hostDir "server.pid"
$launcherPath = Join-Path $hostDir "run-server.cmd"

New-Item -ItemType Directory -Path $hostDir -Force | Out-Null

if (!(Test-Path $configPath)) {
  $secret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
  $config = @"
`$HostConfig = @{
  Port = 3000
  AdminUsername = "tyler"
  AdminPassword = "AppleJuice"
  AuthSessionSecret = "$secret"
  AllowedOrigins = @(
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.32:3000",
    "https://tylerbnobleday-cmyk.github.io",
    "https://tylerbnobleday-cmyk.github.io/transit-alert/"
  )
  DatabaseUrl = "pglite://.local-db/transit-alert"
  ApprovedDebugTesters = "Jack Miller,jackmiller"
  PtvSubscriptionKey = ""
  NswTransportApiKey = ""
}
"@
  Set-Content -Path $configPath -Value $config -Encoding UTF8
}

. $configPath

$allowedOrigins = $HostConfig.AllowedOrigins -join ","
$launcher = @"
@echo off
cd /d "$repoRoot"
set PORT=$($HostConfig.Port)
set ADMIN_USERNAME=$($HostConfig.AdminUsername)
set ADMIN_PASSWORD=$($HostConfig.AdminPassword)
set AUTH_SESSION_SECRET=$($HostConfig.AuthSessionSecret)
set ALLOWED_ORIGINS=$allowedOrigins
set DATABASE_URL=$($HostConfig.DatabaseUrl)
set APPROVED_DEBUG_TESTERS=$($HostConfig.ApprovedDebugTesters)
set PTV_SUBSCRIPTION_KEY=$($HostConfig.PtvSubscriptionKey)
set NSW_TRANSPORT_API_KEY=$($HostConfig.NswTransportApiKey)
node .\server\render-server.js 1>> ".\.local-host\server.out.log" 2>> ".\.local-host\server.err.log"
"@
Set-Content -Path $launcherPath -Value $launcher -Encoding ASCII

if (!(Test-Path (Join-Path $repoRoot "dist\\index.html"))) {
  throw "Missing dist\\index.html. Run scripts\\local-host-build.ps1 first."
}

if (Test-Path $pidPath) {
  $existingPid = (Get-Content $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1).Trim()
  if ($existingPid) {
    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existingProcess) {
      Write-Output "TransitAlert host is already running on PID $existingPid."
      exit 0
    }
  }
  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

$process = Start-Process `
  -FilePath "C:\Windows\System32\cmd.exe" `
  -ArgumentList @(
    "/d",
    "/c",
    $launcherPath
  ) `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidPath -Value $process.Id -Encoding ASCII

Write-Output "TransitAlert host started on http://localhost:3000/ with PID $($process.Id)."
