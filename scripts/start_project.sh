#!/bin/bash

# =====================================================
# start_project.sh - Versatile script for dev/production
# =====================================================

# ------------------------
# Base configuration paths
# ------------------------
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
CONFIG_FILE="$BASE_DIR/.project_config"
DEFAULT_ENV="development"

# ------------------------
# Project structure
# ------------------------
BACKEND_PATH="$BASE_DIR/api"
FRONTEND_PATH="$BASE_DIR/ui"
VENV_PATH="$BACKEND_PATH/venv"
LOG_DIR="$BASE_DIR/logs"
PID_DIR="$BASE_DIR/pids"
SCRIPTS_DIR="$BASE_DIR/scripts"

# ------------------------
# Utility functions
# ------------------------

command_exists() { command -v "$1" >/dev/null 2>&1; }

exit_with_error() {
    echo "❌ Error: $1"
    exit 1
}

create_directories() {
    mkdir -p "$LOG_DIR" "$PID_DIR" "$SCRIPTS_DIR"
    echo "✅ Created support directories"
}

# ------------------------
# Environment configuration
# ------------------------

load_environment() {
    local env=${1:-$DEFAULT_ENV}

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

    if [ -f "$BASE_DIR/.env.$PROJECT_ENV" ]; then
        export ENV_FILE="$BASE_DIR/.env.$PROJECT_ENV"
    else
        export ENV_FILE="$BASE_DIR/.env"
    fi

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
# Python environment setup
# ------------------------

setup_python_environment() {
    local env=$1

    deactivate 2>/dev/null || true

    if [ -d "$VENV_PATH" ]; then
        echo "🔧 Activating existing virtual environment..."
        source "$VENV_PATH/bin/activate"
    else
        echo "🔧 Creating new virtual environment..."
        python3 -m venv "$VENV_PATH" || exit_with_error "Failed to create virtual environment"
        source "$VENV_PATH/bin/activate"
        pip install --upgrade pip
    fi

    echo "📦 Installing Python dependencies for $env..."
    if [ -f "$BACKEND_PATH/requirements/base.txt" ]; then
        pip install -r "$BACKEND_PATH/requirements/base.txt"
    fi

    case $env in
        production)
            if [ -f "$BACKEND_PATH/requirements/production.txt" ]; then
                pip install -r "$BACKEND_PATH/requirements/production.txt"
            else
                echo "⚠️  Production requirements not found, using base only"
            fi
            ;;
        development|*)
            if [ -f "$BACKEND_PATH/requirements/development.txt" ]; then
                pip install -r "$BACKEND_PATH/requirements/development.txt"
            elif [ -f "$BACKEND_PATH/requirements.txt" ]; then
                pip install -r "$BACKEND_PATH/requirements.txt"
            else
                echo "⚠️  No requirements found, installing defaults..."
                pip install fastapi uvicorn sqlalchemy pydantic python-dotenv bcrypt python-jose cryptography
            fi
            ;;
    esac

    echo "✅ Python environment setup completed for $env"
}

# ------------------------
# Frontend setup and deploy
# ------------------------

setup_frontend_environment() {
    local env=$1
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"

    echo "📦 Installing frontend dependencies..."
    npm install --legacy-peer-deps || exit_with_error "Failed to install frontend dependencies"

    if [ "$env" = "production" ]; then
        echo "🏗️  Building frontend for production..."
        npm run build || exit_with_error "Frontend build failed"
    fi

    cd - > /dev/null
}

deploy_frontend_files() {
    local env=$1
    if [ "$env" = "production" ]; then
        echo "📁 Deploying frontend to /var/www/tradingtracker ..."
        if ! sudo mkdir -p /var/www/tradingtracker/dist; then
            echo "⚠️  Could not create target directory"; return
        fi
        if [ -d "$FRONTEND_PATH/dist" ]; then
            sudo cp -r "$FRONTEND_PATH/dist/"* "/var/www/tradingtracker/dist/" || echo "⚠️  Copy failed"
            sudo chown -R www-data:www-data /var/www/tradingtracker
            sudo chmod -R 755 /var/www/tradingtracker
            echo "✅ Frontend files deployed"
        else
            echo "⚠️  No dist files found, skipping deployment"
        fi
    fi
}

# ------------------------
# Backend and Frontend start
# ------------------------

# Start backend service
start_backend() {
    local env=$1
    
    cd "$BACKEND_PATH" || exit_with_error "Backend directory not found"
    
    # Set up environment symlink
    if [ -f "../$ENV_FILE" ] && [ ! -f ".env" ]; then
        ln -sf "../$ENV_FILE" ".env"
    fi
    
    source "$VENV_PATH/bin/activate"
    
    echo "🚀 Starting backend ($env mode)..."
    
    if [ "$env" = "production" ]; then
        nohup python3 main.py > "../$LOG_DIR/backend.log" 2>&1 &
        BACKEND_PID=$!
        echo "$BACKEND_PID" > "../$PID_DIR/backend.pid"
        echo "✅ Backend started in background (PID: $BACKEND_PID, Port: $BACKEND_PORT)"
    else
        echo "🔧 Running backend in a separate terminal..."
        
        # macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && source ./venv/bin/activate && python3 main.py\""
        
        # Linux GNOME or fallback
        elif command_exists gnome-terminal; then
            gnome-terminal -- bash -c "cd $(pwd) && source ./venv/bin/activate && python3 main.py; exec bash"
        elif command_exists x-terminal-emulator; then
            x-terminal-emulator -e bash -c "cd $(pwd) && source ./venv/bin/activate && python3 main.py; exec bash"
        else
            echo "⚠️ Could not open new terminal, running backend here..."
            python3 main.py
        fi
    fi
    
    cd - > /dev/null
}

# Start frontend service
start_frontend() {
    local env=$1
    
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"
    
    echo "🚀 Starting frontend ($env mode)..."
    
    if [ "$env" = "production" ]; then
        if command_exists serve; then
            nohup serve -s dist -p "$FRONTEND_PORT" > "../$LOG_DIR/frontend.log" 2>&1 &
        else
            echo "⚠️  'serve' command not found, installing..."
            npm install -g serve
            nohup serve -s dist -p "$FRONTEND_PORT" > "../$LOG_DIR/frontend.log" 2>&1 &
        fi
        FRONTEND_PID=$!
        echo "$FRONTEND_PID" > "../$PID_DIR/frontend.pid"
        echo "✅ Frontend started (PID: $FRONTEND_PID, Port: $FRONTEND_PORT)"
    else
        echo "🔧 Running frontend in a separate terminal..."
        
        # macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && npm run dev -- --port $FRONTEND_PORT\""
        
        # Linux GNOME or fallback
        elif command_exists gnome-terminal; then
            gnome-terminal -- bash -c "cd $(pwd) && npm run dev -- --port $FRONTEND_PORT; exec bash"
        elif command_exists x-terminal-emulator; then
            x-terminal-emulator -e bash -c "cd $(pwd) && npm run dev -- --port $FRONTEND_PORT; exec bash"
        else
            echo "⚠️ Could not open new terminal, running frontend here..."
            npm run dev -- --port "$FRONTEND_PORT"
        fi
    fi
    
    cd - > /dev/null
}

# ------------------------
# Health check utilities
# ------------------------

wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for service at $url ..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s --head "$url" >/dev/null; then
            echo "✅ Service ready at $url"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        ((attempt++))
    done
    echo "❌ Timeout waiting for service at $url"
    return 1
}

generate_typescript_client() {
    local env=$1
    [ "$env" != "development" ] && { echo "⏭️  Skipping TS client generation"; return; }

    echo "🔧 Generating TypeScript client..."
    if wait_for_service "http://localhost:$BACKEND_PORT/docs"; then
        cd "$FRONTEND_PATH" || return 1
        if npx @hey-api/openapi-ts@latest -i "http://localhost:$BACKEND_PORT/openapi.json" -o "./src/client" --silent; then
            echo "✅ TypeScript client generated"
        else
            echo "⚠️  TypeScript client generation failed"
        fi
        cd - > /dev/null
    else
        echo "⚠️  Backend not ready for client generation"
    fi
}

# ------------------------
# Main execution
# ------------------------

main() {
    local environment=${1:-$DEFAULT_ENV}
    echo "🎯 Starting project in $environment mode..."

    load_environment "$environment"
    create_directories

    for cmd in python3 npm curl; do
        command_exists "$cmd" || exit_with_error "$cmd not found"
    done

    setup_python_environment "$PROJECT_ENV"
    setup_frontend_environment "$PROJECT_ENV"
    deploy_frontend_files "$PROJECT_ENV"

    start_backend "$PROJECT_ENV"

    if [ "$PROJECT_ENV" = "development" ]; then
        generate_typescript_client "$PROJECT_ENV"
        echo ""
        echo "💡 Backend running in foreground."
        echo "💡 Start frontend in another terminal with: ./scripts/start_project.sh dev-frontend"
        exit 0
    else
        wait_for_service "http://localhost:$BACKEND_PORT/docs"
        generate_typescript_client "$PROJECT_ENV"
        start_frontend "$PROJECT_ENV"
        save_config
        echo ""
        echo "🎉 Project started successfully in production mode!"
        echo "💡 Use './scripts/manage_project.sh status' to check status"
        echo "💡 Use './scripts/manage_project.sh stop' to stop services"
    fi
}

# ------------------------
# CLI argument parsing
# ------------------------

case "${1:-}" in
    prod|production) main "production" ;;
    dev|development|"") main "development" ;;
    dev-frontend)
        load_environment "development"
        start_frontend "development"
        ;;
    *) echo "Usage: $0 {dev|prod|dev-frontend}"; exit 1 ;;
esac
