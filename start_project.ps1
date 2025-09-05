# start_project.ps1

# Percorsi
$backendPath = ".\api"
$frontendPath = ".\ui"
$venvPath = "$backendPath\.venv\Scripts\Activate.ps1"
$pythonPath = "$backendPath\.venv\Scripts\python.exe"

# Funzione per controllare se un comando esiste
function Command-Exists($cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

# Controllo prerequisiti
if (!(Command-Exists python)) { Write-Error "Python non trovato."; exit 1 }
if (!(Command-Exists npm)) { Write-Error "NPM non trovato."; exit 1 }

# 1. Attiva o crea ambiente virtuale Python
if (Test-Path $venvPath) {
    Write-Host "Attivando ambiente virtuale..."
    & $venvPath
} else {
    Write-Host "Creando ambiente virtuale..."
    python -m venv "$backendPath\.venv"
    & $venvPath
}

# 2. Installazione dipendenze Python
Write-Host "Installando dipendenze Python..."
try {
    & $pythonPath -m pip install --upgrade pip
    & $pythonPath -m pip install fastapi uvicorn sqlalchemy pydantic python-dotenv
} catch {
    Write-Error "Errore durante l'installazione delle dipendenze Python: $_"
    exit 1
}

# 3. Installazione dipendenze frontend
Write-Host "Installando dipendenze frontend..."
Push-Location $frontendPath
try {
    npm install --legacy-peer-deps
    if (!(Command-Exists json2ts)) { npm install -g json-schema-to-typescript }
} catch {
    Write-Error "Errore durante l'installazione delle dipendenze frontend: $_"
    exit 1
} finally {
    Pop-Location
}

# 4. Controllo DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Warning "Variabile DATABASE_URL non trovata. Assicurati di aggiungerla nel file .env"
}

# 5 Avvia backend e frontend in parallelo
Write-Host "Avviando backend e frontend..."

## 5.1 Avvio backend
$backendProcess = Start-Process -PassThru -FilePath $pythonPath -ArgumentList "main.py" -WorkingDirectory $backendPath 

## 5.2 Generazione modelli TypeScript da Pydantic
Write-Host "Convertendo i modelli..."
npx @hey-api/openapi-ts -i http://localhost:8000/openapi.json -o "$frontendPath/src/client"

## 5.3 Avvio frontend
$frontendProcess = Start-Process -PassThru -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $frontendPath 

Write-Host "Progetti avviati."
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:3039"

# Attendere che l'utente prema Ctrl+C per chiudere tutto
Write-Host "Premi Ctrl+C per chiudere backend e frontend..."
try {
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
} catch {
    Write-Host "Chiusura dei processi..."
    Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
}
