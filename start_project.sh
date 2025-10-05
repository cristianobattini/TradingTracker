#!/bin/bash

# start_project.sh

# Percorsi
BACKEND_PATH="./api"
FRONTEND_PATH="./ui"
VENV_PATH="$BACKEND_PATH/venv"
PYTHON3_PATH="python3"
REQUIREMENTS_FILE="$BACKEND_PATH/requirements.txt"

# Funzione per controllare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Funzione per uscire con errore
exit_with_error() {
    echo "Errore: $1"
    exit 1
}

# Funzione per attendere che un servizio sia pronto
wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo "Attendendo che il servizio sia pronto su $url ..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s --head "$url" >/dev/null; then
            echo "✅ Servizio pronto su $url"
            return 0
        fi
        
        echo "Tentativo $attempt/$max_attempts - servizio non pronto, riprovo tra 2 secondi..."
        sleep 2
        ((attempt++))
    done
    
    echo "❌ Timeout: Il servizio non è diventato pronto su $url dopo $max_attempts tentativi"
    return 1
}

# Funzione per fixare manualmente il client
fix_client_base_url() {
    local frontend_path=$1
    local openapi_file="$frontend_path/src/client/core/OpenAPI.ts"
    
    if [ -f "$openapi_file" ]; then
        echo "Fix manuale dell'URL di base nel client generato..."
        
        # Crea backup
        cp "$openapi_file" "${openapi_file}.backup"
        
        # Determina il comando sed in base al OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's|BASE:.*|BASE: "http://localhost:8000",|' "$openapi_file"
        else
            # Linux
            sed -i 's|BASE:.*|BASE: "http://localhost:8000",|' "$openapi_file"
        fi
        
        echo "✅ URL di base fixato a http://localhost:8000"
        
        # Verifica la modifica
        echo "Verifica:"
        grep "BASE:" "$openapi_file"
    else
        echo "⚠️  File OpenAPI.ts non trovato in src/client/core/"
        echo "   Cercando file alternativi..."
        
        # Cerca altri file OpenAPI.ts
        find "$frontend_path/src/client" -name "OpenAPI.ts" -type f | while read file; do
            echo "Trovato: $file"
            cp "$file" "${file}.backup"
            
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' 's|BASE:.*|BASE: "http://localhost:8000",|' "$file"
            else
                sed -i 's|BASE:.*|BASE: "http://localhost:8000",|' "$file"
            fi
            echo "✅ Fixato: $file"
            
            # Verifica
            echo "Nuovo URL: $(grep "BASE:" "$file")"
        done
    fi
}

# Controllo prerequisiti
if ! command_exists python3; then exit_with_error "Python3 non trovato."; fi
if ! command_exists npm; then exit_with_error "NPM non trovato."; fi
if ! command_exists curl; then exit_with_error "cURL non trovato."; fi

# 1. Crea o attiva ambiente virtuale Python
if [ -d "$VENV_PATH" ]; then
    echo "Attivando ambiente virtuale..."
    source "$VENV_PATH/bin/activate"
else
    echo "Creando ambiente virtuale..."
    python3 -m venv "$VENV_PATH"
    source "$VENV_PATH/bin/activate"
fi

# 2. Installazione dipendenze Python
echo "Installando dipendenze Python..."
if [ -f "$REQUIREMENTS_FILE" ]; then
    "$PYTHON3_PATH" -m pip install --upgrade pip
    "$PYTHON3_PATH" -m pip install -r "$REQUIREMENTS_FILE"
else
    echo "File requirements.txt non trovato. Installazione dipendenze di default..."
    "$PYTHON3_PATH" -m pip install --upgrade pip
    "$PYTHON3_PATH" -m pip install fastapi uvicorn sqlalchemy pydantic python-dotenv bcrypt python-jose cryptography
fi

# 3. Installazione dipendenze frontend
echo "Installando dipendenze frontend..."
cd "$FRONTEND_PATH" || exit_with_error "Directory frontend non trovata"

if ! npm install --legacy-peer-deps; then
    exit_with_error "Errore durante l'installazione delle dipendenze frontend"
fi

cd - > /dev/null

# 4. Controllo DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "Avviso: Variabile DATABASE_URL non trovata. Assicurati di aggiungerla nel file .env"
fi

echo ""
echo "=== AVVIO BACKEND ==="

# 5. Avvia il backend in background
cd "$BACKEND_PATH" || exit_with_error "Directory backend non trovata"
echo "Avviando backend con Python3..."
"$PYTHON3_PATH" main.py &
BACKEND_PID=$!
cd - > /dev/null

echo "Backend PID: $BACKEND_PID"

# 6. Attendi che il backend sia pronto
if wait_for_service "http://localhost:8000/docs"; then
    echo "✅ Backend avviato correttamente"
    # Additional delay to ensure OpenAPI spec is fully generated
    echo "Attendendo che la specifica OpenAPI sia completamente generata..."
    sleep 5
else
    echo "❌ Errore: Backend non avviato correttamente"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 7. Generazione modelli TypeScript
echo ""
echo "=== GENERAZIONE MODELLI TYPESCRIPT ==="
cd "$FRONTEND_PATH" || exit_with_error "Directory frontend non trovata"

# First, let's check if the OpenAPI spec is accessible
echo "Controllando la specifica OpenAPI..."
if curl -s -f "http://localhost:8000/openapi.json" > /dev/null; then
    echo "✅ Specifica OpenAPI accessibile"
else
    echo "❌ Impossibile accedere alla specifica OpenAPI"
fi

echo "Generando modelli TypeScript da OpenAPI..."

rm -rf "./src/client"

# Approach 1: Standard generation
if npx @hey-api/openapi-ts@latest -i "http://localhost:8000/openapi.json" -o "./src/client" --silent; then
    echo "✅ Modelli TypeScript generati con successo"
    
    # Fix manuale dell'URL di base nel client generato
    fix_client_base_url "$FRONTEND_PATH"
else
    echo "⚠️  Primo tentativo fallito, provando approccio alternativo..."
    
    # Approach 2: Download the spec first, then generate
    if curl -s -f "http://localhost:8000/openapi.json" -o "./openapi_temp.json"; then
        echo "✅ Specifica OpenAPI scaricata localmente"
        
        if npx @hey-api/openapi-ts@latest -i "./openapi_temp.json" -o "./src/client" --silent; then
            echo "✅ Modelli TypeScript generati con successo dal file locale"
            
            # Fix manuale dell'URL di base
            fix_client_base_url "$FRONTEND_PATH"
            
            rm -f "./openapi_temp.json"
        else
            echo "❌ Errore nella generazione modelli TypeScript dal file locale"
            rm -f "./openapi_temp.json"
        fi
    else
        echo "❌ Impossibile scaricare la specifica OpenAPI"
    fi
fi

# 8. Verifica finale del client generato
echo ""
echo "=== VERIFICA CLIENT GENERATO ==="
if [ -f "./src/client/core/OpenAPI.ts" ]; then
    echo "✅ Client API generato correttamente"
    echo "URL di base configurato:"
    grep "BASE:" "./src/client/core/OpenAPI.ts"
else
    echo "⚠️  Client API non generato correttamente"
    echo "   Puoi generarlo manualmente con:"
    echo "   cd ui && npx @hey-api/openapi-ts -i http://localhost:8000/openapi.json -o ./src/client"
fi

# 9. Avvio frontend
echo ""
echo "=== AVVIO FRONTEND ==="
echo "Avviando frontend..."
npm run dev &
FRONTEND_PID=$!
cd - > /dev/null

echo "Frontend PID: $FRONTEND_PID"

# Attendi che il frontend sia pronto
if wait_for_service "http://localhost:3039"; then
    echo "✅ Frontend avviato correttamente"
else
    echo "⚠️  Frontend potrebbe non essere pronto. Controlla manualmente."
fi

# Funzione per cleanup
cleanup() {
    echo ""
    echo "=== CHIUSURA SERVER ==="
    echo "Arresto backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    echo "Arresto frontend (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Server arrestati"
    exit 0
}

# Trap per Ctrl+C
trap cleanup SIGINT

echo ""
echo "=== SERVER AVVIATI ==="
echo "✅ Backend:  http://127.0.0.1:8000"
echo "✅ Backend Docs: http://127.0.0.1:8000/docs"
echo "✅ Frontend: http://localhost:3039"
echo ""
echo "Premi Ctrl+C per arrestare entrambi i server"

# Monitora i processi
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend si è arrestato inaspettatamente"
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend si è arrestato inaspettatamente"
        break
    fi
    
    sleep 5
done

cleanup