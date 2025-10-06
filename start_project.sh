#!/bin/bash

# start_project.sh

# Percorsi
BACKEND_PATH="./api"
FRONTEND_PATH="./ui"
VENV_PATH="$BACKEND_PATH/venv"
PYTHON3_PATH="python3"
REQUIREMENTS_FILE="$BACKEND_PATH/requirements.txt"
LOG_DIR="./logs"
PID_DIR="./pids"

# Funzione per controllare se un comando esiste
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Funzione per uscire con errore
exit_with_error() {
    echo "Errore: $1"
    exit 1
}

# Funzione per creare directory necessarie
create_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
    echo "✅ Directory di supporto create"
}

# Funzione per scrivere PID nei file
write_pid() {
    local service=$1
    local pid=$2
    echo "$pid" > "$PID_DIR/${service}.pid"
    echo "✅ PID $pid scritto in $PID_DIR/${service}.pid"
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

# Funzione per avviare backend in background
start_backend() {
    echo "=== AVVIO BACKEND ==="
    
    cd "$BACKEND_PATH" || exit_with_error "Directory backend non trovata"
    
    # Attiva ambiente virtuale
    source "$VENV_PATH/bin/activate"
    
    echo "Avviando backend con Python3..."
    nohup "$PYTHON3_PATH" main.py > "../$LOG_DIR/backend.log" 2>&1 &
    BACKEND_PID=$!
    
    cd - > /dev/null
    
    write_pid "backend" $BACKEND_PID
    echo "Backend PID: $BACKEND_PID"
    echo "Logs: $LOG_DIR/backend.log"
    
    # Attendi che il backend sia pronto
    if wait_for_service "http://localhost:8000/docs"; then
        echo "✅ Backend avviato correttamente"
        # Additional delay to ensure OpenAPI spec is fully generated
        echo "Attendendo che la specifica OpenAPI sia completamente generata..."
        sleep 5
        return 0
    else
        echo "❌ Errore: Backend non avviato correttamente"
        return 1
    fi
}

# Funzione per generare client TypeScript
generate_typescript_client() {
    echo ""
    echo "=== GENERAZIONE MODELLI TYPESCRIPT ==="
    cd "$FRONTEND_PATH" || exit_with_error "Directory frontend non trovata"

    # First, let's check if the OpenAPI spec is accessible
    echo "Controllando la specifica OpenAPI..."
    if curl -s -f "http://localhost:8000/openapi.json" > /dev/null; then
        echo "✅ Specifica OpenAPI accessibile"
    else
        echo "❌ Impossibile accedere alla specifica OpenAPI"
        return 1
    fi

    echo "Generando modelli TypeScript da OpenAPI..."

    rm -rf "./src/client"

    # Approach 1: Standard generation
    if npx @hey-api/openapi-ts@latest -i "http://localhost:8000/openapi.json" -o "./src/client" --silent; then
        echo "✅ Modelli TypeScript generati con successo"
        
        # Fix manuale dell'URL di base nel client generato
        fix_client_base_url "$FRONTEND_PATH"
        return 0
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
                return 0
            else
                echo "❌ Errore nella generazione modelli TypeScript dal file locale"
                rm -f "./openapi_temp.json"
                return 1
            fi
        else
            echo "❌ Impossibile scaricare la specifica OpenAPI"
            return 1
        fi
    fi
}

# Funzione per avviare frontend in background
start_frontend() {
    echo ""
    echo "=== AVVIO FRONTEND ==="
    cd "$FRONTEND_PATH" || exit_with_error "Directory frontend non trovata"
    
    echo "Avviando frontend..."
    nohup npm run dev > "../$LOG_DIR/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    
    cd - > /dev/null
    
    write_pid "frontend" $FRONTEND_PID
    echo "Frontend PID: $FRONTEND_PID"
    echo "Logs: $LOG_DIR/frontend.log"
    
    # Attendi brevemente che il frontend inizi
    sleep 10
    
    # Verifica se il frontend è in esecuzione
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "✅ Frontend avviato correttamente"
        return 0
    else
        echo "❌ Frontend non si è avviato correttamente"
        return 1
    fi
}

# Funzione per mostrare lo stato dei servizi
show_status() {
    echo ""
    echo "=== STATO SERVER ==="
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo "✅ Backend in esecuzione (PID: $BACKEND_PID)"
        else
            echo "❌ Backend non in esecuzione"
        fi
    else
        echo "❌ File PID backend non trovato"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "✅ Frontend in esecuzione (PID: $FRONTEND_PID)"
        else
            echo "❌ Frontend non in esecuzione"
        fi
    else
        echo "❌ File PID frontend non trovato"
    fi
    
    echo ""
    echo "Logs disponibili in: $LOG_DIR/"
    echo "Backend:  http://127.0.0.1:8000"
    echo "Backend Docs: http://127.0.0.1:8000/docs" 
    echo "Frontend: http://localhost:3039"
}

# Funzione per arrestare i servizi
stop_services() {
    echo ""
    echo "=== ARRESTO SERVER ==="
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/backend.pid")
        echo "Arresto backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null && rm -f "$PID_DIR/backend.pid"
        echo "✅ Backend arrestato"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
        echo "Arresto frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null && rm -f "$PID_DIR/frontend.pid"
        echo "✅ Frontend arrestato"
    fi
}

# Funzione per cleanup
cleanup() {
    stop_services
    exit 0
}

# Gestione dei parametri
case "${1:-}" in
    stop)
        stop_services
        exit 0
        ;;
    status)
        show_status
        exit 0
        ;;
    restart)
        stop_services
        sleep 2
        # Continua con l'avvio
        ;;
    *)
        # Continua con l'avvio normale
        ;;
esac

# Controllo prerequisiti
if ! command_exists python3; then exit_with_error "Python3 non trovato."; fi
if ! command_exists npm; then exit_with_error "NPM non trovato."; fi
if ! command_exists curl; then exit_with_error "cURL non trovato."; fi

# Crea directory di supporto
create_directories

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

# 5. Avvia backend
if ! start_backend; then
    exit_with_error "Impossibile avviare il backend"
fi

# 6. Genera client TypeScript
generate_typescript_client

# 7. Avvia frontend
if ! start_frontend; then
    echo "⚠️  Frontend non avviato correttamente, ma il backend è in esecuzione"
fi

# Mostra stato finale
show_status

echo ""
echo "✅ Server avviati in background!"
echo ""
echo "Comandi utili:"
echo "  ./start_project.sh status  - Mostra stato server"
echo "  ./start_project.sh stop    - Arresta i server"
echo "  ./start_project.sh restart - Riavvia i server"
echo ""
echo "I server continueranno a funzionare anche dopo la chiusura del terminale."
echo "Usa './start_project.sh stop' per arrestarli."

# Esci senza mantenere lo script in esecuzione
exit 0