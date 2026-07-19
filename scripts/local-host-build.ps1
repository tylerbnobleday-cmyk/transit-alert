$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$env:BASE_PATH = "/"

node .\node_modules\vite\bin\vite.js build --configLoader native --config vite.config.ts
