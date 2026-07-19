$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "local-host-start.ps1"
$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$startScript`""

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v TransitAlertHost /t REG_SZ /d $command /f | Out-Null

Write-Output "Startup entry 'TransitAlertHost' is installed for the current Windows user."
