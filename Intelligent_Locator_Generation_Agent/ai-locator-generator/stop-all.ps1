# Stops the AI Locator Generator dev servers (ports 4000 and 5173).
# Usage:  powershell -ExecutionPolicy Bypass -File .\stop-all.ps1

$ErrorActionPreference = "SilentlyContinue"

foreach ($port in @(4000, 5173)) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        Write-Host "Stopping process on port $port (PID $($conn.OwningProcess))"
        Stop-Process -Id $conn.OwningProcess -Force
    }
}

Write-Host "Done. LangFlow Desktop (port 7860) is left running."
