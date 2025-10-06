#!/bin/bash
# manage_project.sh

LOG_DIR="./logs"
PID_DIR="./pids"

show_status() {
    echo "=== STATO SERVER ==="
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        BACKEND_PID=$(cat "$PID_DIR/backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo "✅ Backend in esecuzione (PID: $BACKEND_PID)"
            echo "   Log: $LOG_DIR/backend.log"
        else
            echo "❌ Backend non in esecuzione"
            rm -f "$PID_DIR/backend.pid"
        fi
    else
        echo "❌ Backend non avviato"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "✅ Frontend in esecuzione (PID: $FRONTEND_PID)"
            echo "   Log: $LOG_DIR/frontend.log"
        else
            echo "❌ Frontend non in esecuzione"
            rm -f "$PID_DIR/frontend.pid"
        fi
    else
        echo "❌ Frontend non avviato"
    fi
}

stop_services() {
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

show_logs() {
    local service=$1
    local log_file="$LOG_DIR/${service}.log"
    
    if [ -f "$log_file" ]; then
        echo "=== ULTIME RIGHE DEL LOG $service ==="
        tail -20 "$log_file"
    else
        echo "Log file non trovato: $log_file"
    fi
}

case "${1:-}" in
    start)
        ./start_project.sh
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    restart)
        stop_services
        sleep 2
        ./start_project.sh
        ;;
    logs)
        show_logs "${2:-backend}"
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart|logs [backend|frontend]}"
        echo ""
        echo "Comandi:"
        echo "  start   - Avvia i server in background"
        echo "  stop    - Arresta i server"
        echo "  status  - Mostra stato dei server"
        echo "  restart - Riavvia i server"
        echo "  logs    - Mostra logs (backend o frontend)"
        exit 1
        ;;
esac