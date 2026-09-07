# Starts DB, backend, and frontend in one shot.
# Usage:  powershell -ExecutionPolicy Bypass -File .\start.ps1
#
# Stops everything with:  powershell -ExecutionPolicy Bypass -File .\stop.ps1

$ErrorActionPreference = 'Stop'

Write-Host "[1/3] Starting PostgreSQL via Docker..." -ForegroundColor Cyan
docker compose up -d db

Write-Host "[2/3] Waiting for PostgreSQL..." -ForegroundColor Cyan
$dbReady = $false
for ($i = 0; $i -lt 30; $i++) {
    $health = docker inspect --format '{{.State.Health.Status}}' api-code-generator-db 2>$null
    if ($health -eq 'healthy') { $dbReady = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $dbReady) {
    Write-Host "PostgreSQL did not become healthy in time." -ForegroundColor Red
    exit 1
}
Write-Host "PostgreSQL is ready." -ForegroundColor Green

Write-Host "[3/3] Starting backend and frontend..." -ForegroundColor Cyan
$npm = "npm.cmd"
$backend = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory (Join-Path $PSScriptRoot "backend") -PassThru -WindowStyle Minimized
$frontend = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory (Join-Path $PSScriptRoot "frontend") -PassThru -WindowStyle Minimized

Write-Host ""
Write-Host "Application online:" -ForegroundColor Green
Write-Host "  Frontend : http://localhost:5173"
Write-Host "  Backend  : http://localhost:4000/api/health"
Write-Host "  Database : localhost:5432 (api_code_generator)"
Write-Host ""
Write-Host "Backend PID : $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"
Write-Host "Run stop.ps1 to shut everything down." -ForegroundColor Yellow
