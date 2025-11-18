#!/bin/bash

# =====================================================
# manage_project.sh - Unified project management script
# =====================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
CONFIG_FILE="$BASE_DIR/.project_config"
LOG_DIR="$BASE_DIR/logs"
PID_DIR="$BASE_DIR/pids"

# ------------------------
# Load saved configuration
# ------------------------
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        return 0
    fi
    return 1
}

# ------------------------
# Show status
# ------------------------
show_status() {
    if ! load_config; then
        echo "❌ Project not configured. Run start script first."
        return 1
    fi

    echo "=== PROJECT STATUS ==="
    echo "Environment: $PROJECT_ENV"
    echo "Started: $(date -r "$CONFIG_FILE" '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # Backend
    if [ -f "$PID_DIR/backend.pid" ]; then
        pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ Backend: RUNNING (PID: $pid)"
            echo "   URL: http://$BACKEND_HOST:$BACKEND_PORT"
            echo "   Docs: http://$BACKEND_HOST:$BACKEND_PORT/docs"
        else
            echo "❌ Backend: STOPPED (stale PID)"
            rm -f "$PID_DIR/backend.pid"
        fi
    else
        echo "❌ Backend: NOT RUNNING"
    fi

    # Frontend
    if [ -f "$PID_DIR/frontend.pid" ]; then
        pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 "$pid" 2>/dev/null; then
            echo "✅ Frontend: RUNNING (PID: $pid)"
            echo "   URL: http://localhost:$FRONTEND_PORT"
        else
            echo "❌ Frontend: STOPPED (stale PID)"
            rm -f "$PID_DIR/frontend.pid"
        fi
    else
        echo "❌ Frontend: NOT RUNNING"
    fi

    # Logs
    echo ""
    echo "Log files:"
    ls -la "$LOG_DIR" 2>/dev/null || echo "No log directory"
}

# ------------------------
# Stop services
# ------------------------
stop_services() {
    echo "🛑 Stopping services..."

    for service in backend frontend; do
        pid_file="$PID_DIR/${service}.pid"
        if [ -f "$pid_file" ]; then
            pid=$(cat "$pid_file")
            echo "Stopping $service (PID: $pid)..."
            kill "$pid" 2>/dev/null && rm -f "$pid_file" && echo "✅ $service stopped"
        fi
    done

    echo "✅ All services stopped"
}

# ------------------------
# Show logs
# ------------------------
show_logs() {
    service=${1:-backend}
    lines=${2:-20}
    log_file="$LOG_DIR/${service}.log"

    if [ -f "$log_file" ]; then
        echo "=== Last $lines lines of $service log ==="
        tail -n "$lines" "$log_file"
    else
        echo "❌ Log file not found: $log_file"
    fi
}

# ------------------------
# Restart services
# ------------------------
restart_services() {
    env="development"
    load_config && env="$PROJECT_ENV"

    stop_services
    sleep 2
    echo "🔄 Restarting services in $env mode..."
    ./scripts/start_project.sh "$env"
}

# ------------------------
# Update dependencies
# ------------------------
update_project() {
    echo "🔄 Updating project..."

    if [ -d "$BASE_DIR/api" ]; then
        echo "Updating backend..."
        cd "$BASE_DIR/api" || return
        [ -d venv ] && source venv/bin/activate
        pip install -r requirements.txt
        cd - > /dev/null
    fi

    if [ -d "$BASE_DIR/ui" ]; then
        echo "Updating frontend..."
        cd "$BASE_DIR/ui" || return
        npm install --legacy-peer-deps
        cd - > /dev/null
    fi

    echo "✅ Project updated"
}

# ------------------------
# CLI command handler
# ------------------------
case "${1:-}" in
    start)      ./scripts/start_project.sh "${2:-development}" ;;
    stop)       stop_services ;;
    status)     show_status ;;
    restart)    restart_services ;;
    logs)       show_logs "${2:-backend}" "${3:-20}" ;;
    update)     update_project ;;
    prod)       ./scripts/start_project.sh production ;;
    dev)        ./scripts/start_project.sh development ;;
    *) 
        echo "Project Management Script"
        echo ""
        echo "Usage: $0 {start|stop|status|restart|logs|update|prod|dev}"
        exit 1
        ;;
esac
