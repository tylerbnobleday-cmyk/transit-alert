$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $repoRoot ".local-public"
$publicConfigPath = Join-Path $publicDir "public-config.ps1"
$publicPidPath = Join-Path $publicDir "cloudflared.pid"
$publicLogPath = Join-Path $publicDir "cloudflared.out.log"
$publicErrPath = Join-Path $publicDir "cloudflared.err.log"
$publicUrlPath = Join-Path $publicDir "public-url.txt"
$cloudflaredPath = Join-Path $repoRoot ".local-host\bin\cloudflared.exe"
$hostConfigPath = Join-Path $repoRoot ".local-host\host-config.ps1"

New-Item -ItemType Directory -Path $publicDir -Force | Out-Null

if (!(Test-Path $cloudflaredPath)) {
  throw "Missing $cloudflaredPath. Download cloudflared first."
}

if (!(Test-Path $publicConfigPath)) {
$config = @"
`$PublicConfig = @{
  LocalUrl = "http://127.0.0.1:3000"
  StartupDelaySeconds = 2
  Protocol = "http2"
}
"@
  Set-Content -Path $publicConfigPath -Value $config -Encoding UTF8
}

. $publicConfigPath

if (-not $PublicConfig.Protocol) {
  $PublicConfig.Protocol = "http2"
}

$existingTunnels = Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object {
  $_.Path -eq $cloudflaredPath
}
foreach ($existingTunnel in $existingTunnels) {
  Stop-Process -Id $existingTunnel.Id -Force -ErrorAction SilentlyContinue
}

if (Test-Path $hostConfigPath) {
  . $hostConfigPath
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "local-host-start.ps1") | Out-Null
Start-Sleep -Seconds $PublicConfig.StartupDelaySeconds

$statusCode = & {
  try {
    return (Invoke-WebRequest -Uri $PublicConfig.LocalUrl -UseBasicParsing -TimeoutSec 10).StatusCode
  } catch {
    return $null
  }
}

if ($statusCode -ne 200) {
  throw "TransitAlert local server did not answer on $($PublicConfig.LocalUrl)."
}

Remove-Item $publicPidPath -Force -ErrorAction SilentlyContinue

Remove-Item $publicLogPath -Force -ErrorAction SilentlyContinue
Remove-Item $publicErrPath -Force -ErrorAction SilentlyContinue
Remove-Item $publicUrlPath -Force -ErrorAction SilentlyContinue

$process = Start-Process `
  -FilePath $cloudflaredPath `
  -ArgumentList @("tunnel", "--url", $PublicConfig.LocalUrl, "--protocol", $PublicConfig.Protocol, "--no-autoupdate") `
  -WorkingDirectory $repoRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $publicLogPath `
  -RedirectStandardError $publicErrPath `
  -PassThru

Set-Content -Path $publicPidPath -Value $process.Id -Encoding ASCII

$publicUrl = $null
for ($index = 0; $index -lt 40; $index += 1) {
  Start-Sleep -Milliseconds 500
  if (!(Get-Process -Id $process.Id -ErrorAction SilentlyContinue)) {
    break
  }
  $logFiles = @($publicLogPath, $publicErrPath) | Where-Object { Test-Path $_ }
  if ($logFiles.Count -gt 0) {
    $match = Select-String -Path $logFiles -Pattern 'https://[-a-z0-9]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
      Select-Object -Last 1
    if ($match) {
      $publicUrl = $match.Matches.Value | Select-Object -Last 1
      break
    }
  }
}

if (!$publicUrl) {
  throw "Cloudflare tunnel started but no public URL was detected yet. Check $publicLogPath."
}

Set-Content -Path $publicUrlPath -Value $publicUrl -Encoding ASCII

Write-Output "TransitAlert public URL: $publicUrl"
