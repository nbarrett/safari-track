[CmdletBinding()]
param(
    [string]$NodeVersion = "22.21.1"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Info {
    param([string]$Message)
    Write-Host "[run-dev] $Message" -ForegroundColor Green
}

function Throw-Error {
    param([string]$Message)
    throw "[run-dev] $Message"
}

function Use-NodeVersion {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $current = (node -v)
        $normalized = [Version]($current.TrimStart('v'))
        if ($normalized.Major -ge 22) {
            Write-Info "Using system Node $current"
            return
        }
    }
    if (Get-Command nvm -ErrorAction SilentlyContinue) {
        nvm install $NodeVersion | Out-Null
        nvm use $NodeVersion | Out-Null
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        Write-Info "Using Node $(node -v) via nvm-windows"
        return
    }
    Throw-Error "Node.js not detected. Install Node $NodeVersion or nvm-windows."
}

function Ensure-Pnpm {
    if (Get-Command pnpm -ErrorAction SilentlyContinue) { return }
    Write-Info "pnpm not found, installing..."
    try {
        if (Get-Command corepack -ErrorAction SilentlyContinue) {
            corepack enable pnpm 2>$null
            if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { npm install -g pnpm | Out-Null }
        } else {
            npm install -g pnpm | Out-Null
        }
        if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
            Throw-Error "Failed to install pnpm. Please install manually: npm install -g pnpm"
        }
        Write-Info "pnpm installed successfully"
    } catch { Throw-Error "Failed to install pnpm: $_" }
}

function Ensure-EnvFile {
    $envPath = Join-Path $RepoRoot ".env"
    if (-not (Test-Path $envPath)) {
        Throw-Error "Missing $envPath. Copy .env.example and populate DATABASE_URL and AUTH_SECRET before running."
    }
}

function Test-PortInUse {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect("localhost", $Port, $null, $null)
        if ($async.AsyncWaitHandle.WaitOne(200) -and $client.Connected) { $client.EndConnect($async); return $true }
    } catch { return $false } finally { $client.Dispose() }
    return $false
}

function Check-Port {
    $port = if ($env:DEV_PORT) { [int]$env:DEV_PORT } else { 3003 }
    if (Test-PortInUse -Port $port) {
        Throw-Error "Port $port is already in use. Run .\kill-dev.ps1 first or set DEV_PORT to use a different port."
    }
}

function Install-Dependencies {
    Push-Location $RepoRoot
    try {
        Write-Info "Installing dependencies..."
        pnpm install
        Write-Info "Generating Prisma client..."
        pnpm exec prisma generate
    } finally { Pop-Location }
}

function Push-Schema {
    Push-Location $RepoRoot
    try {
        Write-Info "Pushing schema to MongoDB..."
        pnpm exec prisma db push
    } finally { Pop-Location }
}

function Start-DevServer {
    $port = if ($env:DEV_PORT) { $env:DEV_PORT } else { "3003" }

    Write-Info "Clearing Next.js cache..."
    $nextDir = Join-Path $RepoRoot ".next"
    $cacheDir = Join-Path $RepoRoot "node_modules\.cache"
    if (Test-Path $nextDir) { Remove-Item -Recurse -Force $nextDir }
    if (Test-Path $cacheDir) { Remove-Item -Recurse -Force $cacheDir }

    $null = New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "logs") -ErrorAction SilentlyContinue

    $job = Start-Job -Name "safari-track-dev" -ScriptBlock {
        param($WorkingDir, $Port)
        Set-Location $WorkingDir
        pnpm dev --port $Port
    } -ArgumentList $RepoRoot, $port

    Write-Info "Safari Track dev server -> http://localhost:$port"
    Write-Info "Press Ctrl+C to stop."

    try {
        while ($true) {
            $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
            if ($output) { $output | Write-Host }
            if ($job.State -ne 'Running') { break }
            Start-Sleep -Milliseconds 250
        }
        Receive-Job -Job $job -ErrorAction SilentlyContinue | Out-Null
        Wait-Job -Job $job | Out-Null
    } finally {
        if ($job.State -eq 'Running') { Stop-Job -Job $job -Force }
        Remove-Job -Job $job -Force
    }
}

Use-NodeVersion
Ensure-Pnpm
Ensure-EnvFile
Check-Port
Install-Dependencies
Push-Schema
Start-DevServer
