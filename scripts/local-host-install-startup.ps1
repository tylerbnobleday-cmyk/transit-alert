$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot "local-server-supervisor.ps1"
$command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$startScript`""

$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Set-ItemProperty -Path $runKey -Name "TransitAlertHost" -Value $command

Write-Output "Startup entry 'TransitAlertHost' is installed for the current Windows user and will supervise both the TransitAlert host and public tunnel."
