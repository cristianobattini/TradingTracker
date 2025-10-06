#!/bin/bash

# start_project.sh - Versatile script for dev/production

# Configuration
CONFIG_FILE="./.project_config"
DEFAULT_ENV="development"

# Paths
BACKEND_PATH="./api"
FRONTEND_PATH="./ui"
VENV_PATH="$BACKEND_PATH/venv"
LOG_DIR="./logs"
PID_DIR="./pids"
SCRIPTS_DIR="./scripts"

# Load environment
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
    
    # Set environment file
    if [ -f ".env.$PROJECT_ENV" ]; then
        export ENV_FILE=".env.$PROJECT_ENV"
    else
        export ENV_FILE=".env"
    fi
    
    echo "✅ Environment: $PROJECT_ENV"
    echo "📁 Config file: $ENV_FILE"
}

# Save configuration
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

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        echo "📋 Loaded existing configuration: $PROJECT_ENV"
        return 0
    fi
    return 1
}

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to exit with error
exit_with_error() {
    echo "❌ Error: $1"
    exit 1
}

# Create necessary directories
create_directories() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$PID_DIR"
    mkdir -p "$SCRIPTS_DIR"
    echo "✅ Created support directories"
}

# Setup Python environment
setup_python_environment() {
    local env=$1
    
    if [ -d "$VENV_PATH" ]; then
        echo "🔧 Activating existing virtual environment..."
        source "$VENV_PATH/bin/activate"
    else
        echo "🔧 Creating new virtual environment..."
        python3 -m venv "$VENV_PATH"
        source "$VENV_PATH/bin/activate"
        
        # Upgrade pip sempre
        pip install --upgrade pip
    fi

    echo "📦 Installing Python dependencies for $env..."
    
    # Installa le dipendenze base prima
    if [ -f "$BACKEND_PATH/requirements/base.txt" ]; then
        echo "Installing base dependencies..."
        pip install -r "$BACKEND_PATH/requirements/base.txt"
    fi

    # Installa le dipendenze specifiche per l'ambiente
    case $env in
        production)
            if [ -f "$BACKEND_PATH/requirements/production.txt" ]; then
                echo "Installing production dependencies..."
                pip install -r "$BACKEND_PATH/requirements/production.txt"
            else
                echo "⚠️  Production requirements not found, using base only"
            fi
            ;;
        development|*)
            if [ -f "$BACKEND_PATH/requirements/development.txt" ]; then
                echo "Installing development dependencies..."
                pip install -r "$BACKEND_PATH/requirements/development.txt"
            elif [ -f "$BACKEND_PATH/requirements.txt" ]; then
                echo "Installing from legacy requirements.txt..."
                pip install -r "$BACKEND_PATH/requirements.txt"
            else
                echo "⚠️  No requirements found, installing default packages..."
                pip install fastapi uvicorn sqlalchemy pydantic python-dotenv bcrypt python-jose cryptography
            fi
            ;;
    esac
    
    echo "✅ Python environment setup completed for $env"
}

# Setup frontend environment
setup_frontend_environment() {
    local env=$1
    
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"

    echo "📦 Installing frontend dependencies..."
    if ! npm install --legacy-peer-deps; then
        exit_with_error "Failed to install frontend dependencies"
    fi

    # Environment-specific setup
    if [ "$env" = "production" ]; then
        echo "🏗️  Building frontend for production..."
        if ! npm run build; then
            exit_with_error "Frontend build failed"
        fi
    fi

    cd - > /dev/null
}

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
        # Production: use multiple workers and better settings
        nohup uvicorn main:app \
            --host "$BACKEND_HOST" \
            --port "$BACKEND_PORT" \
            --workers 2 \
            > "../$LOG_DIR/backend.log" 2>&1 &
    else
        # Development: single worker with reload
        nohup uvicorn main:app \
            --host "$BACKEND_HOST" \
            --port "$BACKEND_PORT" \
            --reload \
            > "../$LOG_DIR/backend.log" 2>&1 &
    fi
    
    BACKEND_PID=$!
    cd - > /dev/null
    
    echo "$BACKEND_PID" > "$PID_DIR/backend.pid"
    echo "✅ Backend started (PID: $BACKEND_PID, Port: $BACKEND_PORT)"
}

# Start frontend service
start_frontend() {
    local env=$1
    
    cd ..
    cd "$FRONTEND_PATH" || exit_with_error "Frontend directory not found"
    
    echo "🚀 Starting frontend ($env mode)..."
    
    if [ "$env" = "production" ]; then
        # Production: serve built files
        if command_exists serve; then
            nohup serve -s dist -p "$FRONTEND_PORT" > "../$LOG_DIR/frontend.log" 2>&1 &
        else
            echo "⚠️  'serve' command not found, installing..."
            npm install -g serve
            nohup serve -s dist -p "$FRONTEND_PORT" > "../$LOG_DIR/frontend.log" 2>&1 &
        fi
    else
        # Development: use dev server
        nohup npm run dev -- --port "$FRONTEND_PORT" > "../$LOG_DIR/frontend.log" 2>&1 &
    fi
    
    FRONTEND_PID=$!
    cd - > /dev/null
    
    echo "$FRONTEND_PID" > "$PID_DIR/frontend.pid"
    echo "✅ Frontend started (PID: $FRONTEND_PID, Port: $FRONTEND_PORT)"
}

# Wait for service to be ready
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

# Generate TypeScript client (development only)
generate_typescript_client() {
    local env=$1
    
    if [ "$env" != "development" ]; then
        echo "⏭️  Skipping TypeScript client generation in $env mode"
        return 0
    fi
    
    echo "🔧 Generating TypeScript client..."
    cd "$FRONTEND_PATH" || return 1

    # Wait for backend to be ready
    if wait_for_service "http://localhost:$BACKEND_PORT/docs"; then
        if npx @hey-api/openapi-ts@latest -i "http://localhost:$BACKEND_PORT/openapi.json" -o "./src/client" --silent; then
            echo "✅ TypeScript client generated"
        else
            echo "⚠️  TypeScript client generation failed"
        fi
    else
        echo "⚠️  Backend not ready for client generation"
    fi

    cd - > /dev/null
}

# Show status
show_status() {
    echo ""
    echo "=== PROJECT STATUS ==="
    echo "Environment: $PROJECT_ENV"
    echo "Backend: http://$BACKEND_HOST:$BACKEND_PORT"
    echo "Backend Docs: http://$BACKEND_HOST:$BACKEND_PORT/docs"
    echo "Frontend: http://localhost:$FRONTEND_PORT"
    echo ""
    echo "Logs: $LOG_DIR/"
    echo "PIDs: $PID_DIR/"
    
    if [ -f "$PID_DIR/backend.pid" ]; then
        local pid=$(cat "$PID_DIR/backend.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "✅ Backend: RUNNING (PID: $pid)"
        else
            echo "❌ Backend: STOPPED"
        fi
    else
        echo "❌ Backend: NOT STARTED"
    fi
    
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local pid=$(cat "$PID_DIR/frontend.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "✅ Frontend: RUNNING (PID: $pid)"
        else
            echo "❌ Frontend: STOPPED"
        fi
    else
        echo "❌ Frontend: NOT STARTED"
    fi
}

# Main execution
main() {
    local environment=${1:-$DEFAULT_ENV}
    
    echo "🎯 Starting project in $environment mode..."
    
    # Load configuration
    load_environment "$environment"
    create_directories
    
    # Check prerequisites
    if ! command_exists python3; then exit_with_error "Python3 not found"; fi
    if ! command_exists npm; then exit_with_error "NPM not found"; fi
    
    # Setup environments
    setup_python_environment "$PROJECT_ENV"
    setup_frontend_environment "$PROJECT_ENV"
    
    # Start services
    start_backend "$PROJECT_ENV"
    
    # Wait for backend before generating client
    sleep 3
    generate_typescript_client "$PROJECT_ENV"
    
    start_frontend "$PROJECT_ENV"
    
    # Save configuration
    save_config
    
    # Show final status
    sleep 2
    show_status
    
    echo ""
    echo "🎉 Project started successfully in $PROJECT_ENV mode!"
    echo "💡 Use './scripts/manage_project.sh status' to check status"
    echo "💡 Use './scripts/manage_project.sh stop' to stop services"
}

# Parse command line arguments
case "${1:-}" in
    prod|production)
        main "production"
        ;;
    dev|development|"")
        main "development"
        ;;
    *)
        echo "Usage: $0 {dev|prod}"
        echo "  dev  - Start in development mode (default)"
        echo "  prod - Start in production mode"
        exit 1
        ;;
esac