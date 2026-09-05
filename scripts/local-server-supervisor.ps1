$ErrorActionPreference = "Continue"

$mutex = New-Object System.Threading.Mutex($false, "Local\TransitAlertServerSupervisor")
$ownsMutex = $false

try {
  $ownsMutex = $mutex.WaitOne(0)
  if (!$ownsMutex) {
    exit 0
  }

  $startAll = Join-Path $PSScriptRoot "local-server-start-all.ps1"
  $supervisorLog = Join-Path (Split-Path -Parent $PSScriptRoot) ".local-public\supervisor.log"
  Add-Content -LiteralPath $supervisorLog -Value "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK') Server watchdog started."

  while ($true) {
    try {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $startAll
    } catch {
      $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
      Add-Content -LiteralPath $supervisorLog -Value "$timestamp $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 15
  }
} finally {
  if ($ownsMutex) {
    $mutex.ReleaseMutex()
  }
  $mutex.Dispose()
}
