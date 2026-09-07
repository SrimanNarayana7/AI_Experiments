# Stops the frontend (port 5173) and backend (port 4000), then the database.
# Usage:  powershell -ExecutionPolicy Bypass -File .\stop.ps1

$ErrorActionPreference = 'Continue'

function Stop-Port($port) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Stopping backend (port 4000)..." -ForegroundColor Cyan
Stop-Port 4000

Write-Host "Stopping frontend (port 5173)..." -ForegroundColor Cyan
Stop-Port 5173

Write-Host "Stopping PostgreSQL..." -ForegroundColor Cyan
docker compose down

Write-Host "All stopped." -ForegroundColor Green
