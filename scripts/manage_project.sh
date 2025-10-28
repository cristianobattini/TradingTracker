#!/bin/bash

# manage_project.sh - Unified management script

CONFIG_FILE="./.project_config"
LOG_DIR="./logs"
PID_DIR="./pids"

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        return 0
    fi
    return 1
}

# Show status
show_status() {
    if ! load_config; then
        echo "❌ Project not configured. Run start script first."
        return 1
    fi
    
    echo "=== PROJECT STATUS ==="
    echo "Environment: $PROJECT_ENV"
    echo "Started: $(date -r "$CONFIG_FILE" '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Backend status
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $pid 2>/dev/null; then
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
    
    # Frontend status
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "✅ Frontend: RUNNING (PID: $pid)"
            echo "   URL: http://localhost:$FRONTEND_PORT"
        else
            echo "❌ Frontend: STOPPED (stale PID)"
            rm -f "$PID_DIR/frontend.pid"
        fi
    else
        echo "❌ Frontend: NOT RUNNING"
    fi
    
    # Log files
    echo ""
    echo "Log Files:"
    ls -la "$LOG_DIR/" 2>/dev/null || echo "No log directory"
}

# Stop services
stop_services() {
    echo "🛑 Stopping services..."
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        echo "Stopping backend (PID: $pid)..."
        kill $pid 2>/dev/null && rm -f "$PID_DIR/backend.pid" && echo "✅ Backend stopped"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        echo "Stopping frontend (PID: $pid)..."
        kill $pid 2>/dev/null && rm -f "$PID_DIR/frontend.pid" && echo "✅ Frontend stopped"
    fi
    
    echo "✅ All services stopped"
}

# Show logs
show_logs() {
    local service=${1:-"backend"}
    local lines=${2:-20}
    
    local log_file="$LOG_DIR/${service}.log"
    
    if [ -f "$log_file" ]; then
        echo "=== Last $lines lines of $service log ==="
        tail -n "$lines" "$log_file"
    else
        echo "❌ Log file not found: $log_file"
    fi
}

# Restart services
restart_services() {
    local env="development"
    
    if load_config; then
        env="$PROJECT_ENV"
    fi
    
    stop_services
    sleep 2
    echo "🔄 Restarting services in $env mode..."
    ./scripts/start_project.sh "$env"
}

# Update project
update_project() {
    echo "🔄 Updating project..."
    
    # Update backend
    if [ -d "./api" ]; then
        echo "Updating backend dependencies..."
        cd ./api && source venv/bin/activate && pip install -r requirements.txt && cd ..
    fi
    
    # Update frontend
    if [ -d "./ui" ]; then
        echo "Updating frontend dependencies..."
        cd ./ui && npm install && cd ..
    fi
    
    echo "✅ Project updated"
}

# Main command handler
case "${1:-}" in
    start)
        ./scripts/start_project.sh "${2:-development}"
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs "${2:-backend}" "${3:-20}"
        ;;
    update)
        update_project
        ;;
    prod|production)
        ./scripts/start_project.sh production
        ;;
    dev|development)
        ./scripts/start_project.sh development
        ;;
    *)
        echo "Project Management Script"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  start [env]     Start services (dev|prod)"
        echo "  stop            Stop all services"
        echo "  status          Show service status"
        echo "  restart         Restart all services"
        echo "  logs [service]  Show logs (backend|frontend)"
        echo "  update          Update dependencies"
        echo "  prod            Start in production mode"
        echo "  dev             Start in development mode"
        echo ""
        echo "Examples:"
        echo "  $0 start prod     # Start production"
        echo "  $0 logs backend   # Show backend logs"
        echo "  $0 status         # Check status"
        exit 1
        ;;
esac