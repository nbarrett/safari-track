# Kill Safari Track development processes (Windows PowerShell)

Write-Host "Stopping Safari Track development server..." -ForegroundColor Yellow

# Kill processes on the dev port (default 3003)
$port = if ($env:DEV_PORT) { [int]$env:DEV_PORT } else { 3003 }
$connections = netstat -ano | Select-String ":$port.*LISTENING"
foreach ($conn in $connections) {
    $procId = $conn.ToString().Split()[-1]
    if ($procId -match '^\d+$') {
        Write-Host "  Killing process $procId on port $port" -ForegroundColor Gray
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}

# Kill any node processes running next dev
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = $_.CommandLine
    if ($cmd -and ($cmd -like "*next*dev*")) {
        Write-Host "  Killing node process $($_.ProcessId): $($cmd.Substring(0, [Math]::Min(80, $cmd.Length)))..." -ForegroundColor Gray
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Clear Next.js cache to prevent lock issues
$nextDir = Join-Path $PSScriptRoot ".next"
if (Test-Path $nextDir) {
    Write-Host "  Clearing .next cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue
}

Write-Host "All development processes stopped" -ForegroundColor Green
