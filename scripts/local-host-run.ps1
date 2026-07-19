$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$hostDir = Join-Path $repoRoot ".local-host"
$configPath = Join-Path $hostDir "host-config.ps1"
$stdoutPath = Join-Path $hostDir "server.out.log"
$stderrPath = Join-Path $hostDir "server.err.log"

if (!(Test-Path $configPath)) {
  throw "Missing host config at $configPath. Run scripts\\local-host-start.ps1 first."
}

. $configPath

Set-Location $repoRoot

$env:PORT = [string]$HostConfig.Port
$env:ADMIN_USERNAME = [string]$HostConfig.AdminUsername
$env:ADMIN_PASSWORD = [string]$HostConfig.AdminPassword
$env:AUTH_SESSION_SECRET = [string]$HostConfig.AuthSessionSecret
$env:ALLOWED_ORIGINS = ($HostConfig.AllowedOrigins -join ",")

if ($HostConfig.DatabaseUrl) {
  $env:DATABASE_URL = [string]$HostConfig.DatabaseUrl
}

if ($HostConfig.PtvSubscriptionKey) {
  $env:PTV_SUBSCRIPTION_KEY = [string]$HostConfig.PtvSubscriptionKey
}

if ($HostConfig.NswTransportApiKey) {
  $env:NSW_TRANSPORT_API_KEY = [string]$HostConfig.NswTransportApiKey
}

$stdoutNative = $stdoutPath.Replace("/", "\")
$stderrNative = $stderrPath.Replace("/", "\")
$command = "node .\server\render-server.js 1>> `"$stdoutNative`" 2>> `"$stderrNative`""

cmd.exe /d /c $command | Out-Null
