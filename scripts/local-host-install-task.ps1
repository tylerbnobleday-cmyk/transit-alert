$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "local-host-start.ps1"
$taskName = "TransitAlertHost"
$taskCommand = "`"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`" -NoProfile -ExecutionPolicy Bypass -File `"$startScript`""

schtasks /Create /SC ONLOGON /TN $taskName /TR $taskCommand /F | Out-Null

Write-Output "Scheduled task '$taskName' is installed and will start TransitAlert at logon."
