$ErrorActionPreference = "Stop"

$startScript = Join-Path $PSScriptRoot "local-public-start.ps1"
$command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$startScript`""

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v TransitAlertPublic /t REG_SZ /d $command /f | Out-Null

Write-Output "Startup entry 'TransitAlertPublic' is installed for the current Windows user."
