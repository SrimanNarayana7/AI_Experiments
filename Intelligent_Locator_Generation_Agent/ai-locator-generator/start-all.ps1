# One-shot start for AI Locator Generator (Windows).
# Starts the backend (:4000) and frontend (:5173) in separate PowerShell windows.
# Requires: Node.js 18+, LangFlow Desktop running with the flow imported.
# Usage:  powershell -ExecutionPolicy Bypass -File .\start-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "AI Locator Generator - starting services" -ForegroundColor Cyan
Write-Host "----------------------------------------"
Write-Host ""

if (-not (Test-Path (Join-Path $root "backend\node_modules"))) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "backend")
    npm install
    Pop-Location
}
if (-not (Test-Path (Join-Path $root "frontend\node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "frontend")
    npm install
    Pop-Location
}

Write-Host "[1/2] Starting backend  -> http://localhost:4000" -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\backend'; npm run dev"

Write-Host "[2/2] Starting frontend -> http://localhost:5173" -ForegroundColor Green
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\frontend'; npm run dev"

Start-Sleep -Seconds 5

$health = try { (Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:4000/api/health" -TimeoutSec 5).Content } catch { $null }
Write-Host ""
if ($health) {
    Write-Host "Backend health: $health" -ForegroundColor Green
} else {
    Write-Host "Backend not reachable yet - give it a few more seconds." -ForegroundColor Yellow
}
Write-Host "Open http://localhost:5173 to use the app." -ForegroundColor Cyan
Write-Host "Stop everything with: powershell -ExecutionPolicy Bypass -File .\stop-all.ps1"
