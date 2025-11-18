#!/bin/bash

# =====================================================
# start_project.sh - Start project in dev/production
# =====================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
CONFIG_FILE="$BASE_DIR/.project_config"
DEFAULT_ENV="development"

BACKEND_PATH="$BASE_DIR/api"
FRONTEND_PATH="$BASE_DIR/ui"
VENV_PATH="$BACKEND_PATH/venv"
LOG_DIR="$BASE_DIR/logs"
PID_DIR="$BASE_DIR/pids"

# ------------------------
# Utils
# ------------------------
command_exists() { command -v "$1" >/dev/null 2>&1; }

exit_with_error() {
    echo "❌ Error: $1"
    exit 1
}

create_directories() {
    mkdir -p "$LOG_DIR" "$PID_DIR"
    echo "✅ Created support directories"
}

# ------------------------
# Environment
# ------------------------
load_environment() {
    env=${1:-$DEFAULT_ENV}
    case $env in
        prod|production)
            export PROJECT_ENV="production"
            export BACKEND_PORT=8000
            export FRONTEND_PORT=3000
            export BACKEND_HOST="0.0.0.0"
            ;;
        dev|development|*)
            export PROJECT_ENV="development"
            export BACKEND_PORT=8000
            export FRONTEND_PORT=3039
            export BACKEND_HOST="127.0.0.1"
            ;;
    esac

    ENV_FILE="$BASE_DIR/.env.$PROJECT_ENV"
    [ ! -f "$ENV_FILE" ] && ENV_FILE="$BASE_DIR/.env"

    echo "✅ Environment: $PROJECT_ENV"
    echo "📁 Config file: $ENV_FILE"
}

save_config() {
    cat > "$CONFIG_FILE" << EOF
PROJECT_ENV=$PROJECT_ENV
BACKEND_PORT=$BACKEND_PORT
FRONTEND_PORT=$FRONTEND_PORT
BACKEND_HOST=$BACKEND_HOST
ENV_FILE=$ENV_FILE
STARTED_AT=$(date +%s)
EOF
}

# ------------------------
# Python environment
# ------------------------
setup_python_environment() {
    deactivate 2>/dev/null || true

    if [ -d "$VENV_PATH" ]; then
        echo "🔧 Activating existing virtual environment..."
        source "$VENV_PATH/bin/activate"
    else
        echo "🔧 Creating new virtual environment..."
        python3 -m venv "$VENV_PATH" || exit_with_error "Failed to create venv"
        source "$VENV_PATH/bin/activate"
        pip install --upgrade pip
    fi

    if [ -f "$BACKEND_PATH/requirements/base.txt" ]; then
        pip install -r "$BACKEND_PATH/requirements/base.txt"
    fi

    if [ "$PROJECT_ENV" = "production" ]; then
        [ -f "$BACKEND_PATH/requirements/production.txt" ] && pip install -r "$BACKEND_PATH/requirements/production.txt"
    else
        [ -f "$BACKEND_PATH/requirements/development.txt" ] && pip install -r "$BACKEND_PATH/requirements/development.txt"
    fi

    echo "✅ Python environment ready"
}

# ------------------------
# Frontend
# ------------------------
setup_frontend_environment() {
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"
    npm install --legacy-peer-deps
    [ "$PROJECT_ENV" = "production" ] && npm run build
    cd - > /dev/null
}

deploy_frontend_files() {
    if [ "$PROJECT_ENV" = "production" ] && [ -d "$FRONTEND_PATH/dist" ]; then
        sudo mkdir -p /var/www/tradingtracker/dist
        sudo cp -r "$FRONTEND_PATH/dist/"* /var/www/tradingtracker/dist/
        sudo chown -R www-data:www-data /var/www/tradingtracker
        sudo chmod -R 755 /var/www/tradingtracker
        echo "✅ Frontend deployed"
    fi
}

# ------------------------
# Start backend
# ------------------------
start_backend() {
    local env=$1
    cd "$BACKEND_PATH" || exit_with_error "Backend directory not found"

    # Set up .env symlink
    [ -f "../$ENV_FILE" ] && [ ! -f ".env" ] && ln -sf "../$ENV_FILE" ".env"

    source "$VENV_PATH/bin/activate"

    echo "🚀 Starting backend ($env mode)..."

    if [ "$env" = "production" ]; then
        # Run Uvicorn via CLI for proper workers handling
        nohup uvicorn api:app \
            --host "$BACKEND_HOST" \
            --port "$BACKEND_PORT" \
            --workers 2 \
            --log-level info \
            > "../$LOG_DIR/backend.log" 2>&1 &

        BACKEND_PID=$!
        echo "$BACKEND_PID" > "../$PID_DIR/backend.pid"
        echo "✅ Backend started in background (PID: $BACKEND_PID, Port: $BACKEND_PORT)"
    else
        # Development mode with reload
        uvicorn api:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
    fi

    cd - > /dev/null
}


# ------------------------
# Start frontend
# ------------------------
start_frontend() {
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"
    echo "🚀 Starting frontend ($PROJECT_ENV)..."
    if [ "$PROJECT_ENV" = "production" ]; then
        command_exists serve || npm install -g serve
        nohup serve -s dist -p "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &
        FRONTEND_PID=$!
        echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
        echo "✅ Frontend started (PID: $FRONTEND_PID)"
    else
        npm run dev -- --port "$FRONTEND_PORT"
    fi
    cd - > /dev/null
}

# ------------------------
# Main
# ------------------------
main() {
    env=${1:-$DEFAULT_ENV}
    echo "🎯 Starting project in $env mode..."
    load_environment "$env"
    create_directories
    setup_python_environment
    setup_frontend_environment
    deploy_frontend_files
    start_backend
    start_frontend
    save_config
    echo "🎉 Project started successfully!"
}

# ------------------------
# CLI
# ------------------------
case "${1:-}" in
    prod|production) main "production" ;;
    dev|development|"") main "development" ;;
    *) echo "Usage: $0 {dev|prod}"; exit 1 ;;
esac
