<#
.SYNOPSIS
  Start the TradingTracker project (backend + frontend) on Windows PowerShell (or PowerShell Core).

DESCRIPTION
  This script mirrors the behavior of `start_project.sh` and is written for PowerShell. It:
    - Creates/activates a Python virtual environment under api\venv
    - Installs Python dependencies from api\requirements.txt
    - Installs frontend dependencies in ui\
    - Starts the backend (python main.py) and frontend (npm run dev)
    - Attempts to generate TypeScript client code from the running backend OpenAPI

  Run this script from the repository root using an elevated shell if required for setting execution policy.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendPath = Join-Path $RepoRoot 'api'
$FrontendPath = Join-Path $RepoRoot 'ui'
$VenvPath = Join-Path $BackendPath 'venv'

function Test-CommandExists {
    param([string]$Name)
    return (Get-Command $Name -ErrorAction SilentlyContinue) -ne $null
}

function Exit-WithError {
    param([string]$Message)
    Write-Error $Message
    exit 1
}

function Wait-ForService {
    param([string]$Url, [int]$MaxAttempts = 30)
    Write-Host "Waiting for service $Url ..."
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -Method Head -TimeoutSec 5
            if ($resp.StatusCode -lt 400) {
                Write-Host "✅ Service ready at $Url"
                return $true
            }
        } catch {
            # ignore and retry
        }
        Write-Host "Attempt $i/$MaxAttempts - not ready, retrying in 2s..."
        Start-Sleep -Seconds 2
    }
    Write-Host "❌ Timeout: service not ready at $Url after $MaxAttempts attempts"
    return $false
}

Write-Host "=== Preflight checks ==="
if (-not (Test-CommandExists 'python')) { Exit-WithError 'Python not found in PATH.' }
if (-not (Test-CommandExists 'npm')) { Exit-WithError 'npm not found in PATH.' }
if (-not (Test-CommandExists 'curl')) { Write-Host 'Note: curl not found; using PowerShell web requests for health checks.' }

# Create or activate venv
if (-not (Test-Path $VenvPath)) {
    Write-Host 'Creating Python venv...'
    & python -m venv $VenvPath
} else {
    Write-Host 'Using existing venv at api\venv'
}

$VenvPython = Join-Path $VenvPath 'Scripts\python.exe'
if (Test-Path $VenvPython) {
    $PythonExe = $VenvPython
} else {
    $PythonExe = 'python'
}

Write-Host 'Upgrading pip and installing Python dependencies...'
& $PythonExe -m pip install --upgrade pip
$ReqFile = Join-Path $BackendPath 'requirements.txt'
if (Test-Path $ReqFile) {
    & $PythonExe -m pip install -r $ReqFile
} else {
    Write-Host 'requirements.txt not found; installing default set.'
    & $PythonExe -m pip install fastapi uvicorn sqlalchemy pydantic python-dotenv bcrypt python-jose cryptography
}

Write-Host 'Installing frontend dependencies...'
Push-Location $FrontendPath
try {
    $npmInstall = Start-Process -FilePath 'npm' -ArgumentList 'install','--legacy-peer-deps' -NoNewWindow -Wait -PassThru
    if ($npmInstall.ExitCode -ne 0) { Exit-WithError 'npm install failed in ui\' }
} finally {
    Pop-Location
}

Write-Host 'Starting backend...'
Push-Location $BackendPath
try {
    # Start backend with the venv python if available
    $backendProc = Start-Process -FilePath $PythonExe -ArgumentList 'main.py' -WorkingDirectory $BackendPath -NoNewWindow -PassThru
    Write-Host "Backend PID: $($backendProc.Id)"
} finally {
    Pop-Location
}

if (-not (Wait-ForService 'http://localhost:8000/docs')) {
    Write-Host 'Backend did not start correctly. Stopping.'
    if ($backendProc) { Stop-Process -Id $backendProc.Id -Force }
    exit 1
}

Write-Host 'Generating TypeScript client from OpenAPI (if available)...'
Push-Location $FrontendPath
try {
    # Remove old client if present
    if (Test-Path './src/client') { Remove-Item -Recurse -Force './src/client' }

    $npxArgs = @('@hey-api/openapi-ts@latest','-i','http://localhost:8000/openapi.json','-o','./src/client','--silent')
    $npx = Start-Process -FilePath 'npx' -ArgumentList $npxArgs -NoNewWindow -Wait -PassThru -ErrorAction SilentlyContinue
    if ($npx -and $npx.ExitCode -eq 0) {
        Write-Host '✅ TypeScript client generated successfully.'
    } else {
        Write-Host 'First client generation attempt failed; trying download-and-generate approach.'
        try {
            Invoke-WebRequest -Uri 'http://localhost:8000/openapi.json' -OutFile './openapi_temp.json' -UseBasicParsing -ErrorAction Stop
            $npx2 = Start-Process -FilePath 'npx' -ArgumentList '@hey-api/openapi-ts@latest','-i','./openapi_temp.json','-o','./src/client','--silent' -NoNewWindow -Wait -PassThru
            if ($npx2.ExitCode -eq 0) { Write-Host '✅ Client generated from local spec'; Remove-Item './openapi_temp.json' -Force }
            else { Write-Host '❌ Generation from local spec failed' }
        } catch {
            Write-Host '❌ Could not download openapi.json: ' $_.Exception.Message
        }
    }

    # Fix base URL in generated client if found
    $openapiFile = Join-Path $FrontendPath 'src\client\core\OpenAPI.ts'
    if (Test-Path $openapiFile) {
        (Get-Content $openapiFile) -replace 'BASE:.*', 'BASE: "http://localhost:8000",' | Set-Content $openapiFile
        Write-Host '✅ Patched BASE URL in generated client to http://localhost:8000'
    } else {
        Write-Host '⚠️ OpenAPI.ts not found in src/client/core — skipping patch.'
    }
} finally {
    Pop-Location
}

Write-Host 'Starting frontend...'
Push-Location $FrontendPath
try {
    $frontendProc = Start-Process -FilePath 'npm' -ArgumentList 'run','dev' -WorkingDirectory $FrontendPath -NoNewWindow -PassThru
    Write-Host "Frontend PID: $($frontendProc.Id)"
} finally {
    Pop-Location
}

if (-not (Wait-ForService 'http://localhost:3039')) {
    Write-Host '⚠️ Frontend might not be ready. Check logs.'
}

Write-Host "\n=== Servers started ==="
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Backend Docs: http://127.0.0.1:8000/docs"
Write-Host "Frontend: http://127.0.0.1:3039"
Write-Host "Press Ctrl+C to stop both servers."

try {
    while ($true) {
        Start-Sleep -Seconds 5
        if ($backendProc -and -not (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) {
            Write-Host '❌ Backend terminated unexpectedly'
            break
        }
        if ($frontendProc -and -not (Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue)) {
            Write-Host '❌ Frontend terminated unexpectedly'
            break
        }
    }
} finally {
    Write-Host 'Shutting down processes...'
    if ($backendProc -and (Get-Process -Id $backendProc.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $backendProc.Id -Force }
    if ($frontendProc -and (Get-Process -Id $frontendProc.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $frontendProc.Id -Force }
    Write-Host '✅ Servers stopped'
}
