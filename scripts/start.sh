#!/bin/bash

# BiitNest Start Script
# Usage: ./scripts/start.sh [prod|dev|test]

# Handle arguments
MODE="dev"
TEST_MODE=false

if [ "$1" = "prod" ]; then
    MODE="prod"
elif [ "$1" = "test" ]; then
    MODE="dev"
    TEST_MODE=true
fi

echo "🚀 Starting BitNest in $MODE mode..."

# Set environment variables
export NODE_ENV=${MODE}
export TEST_MODE=${TEST_MODE}

# Detect environment
if [ -d "/data/data/com.termux" ]; then
    export IS_MOBILE=true
    echo "📱 Running on mobile device (Termux)"
else
    export IS_MOBILE=false
    echo "💻 Running on desktop/server"
fi

# Initialize container registry
STORAGE_PATH=${MEDIA_ROOT:-"/storage/emulated/0/BitNestMedia"}
CONTAINER_REGISTRY="${STORAGE_PATH}/.containers"
mkdir -p "$CONTAINER_REGISTRY"

# Ensure registry.json exists
if [ ! -f "${CONTAINER_REGISTRY}/registry.json" ]; then
    echo "{}" > "${CONTAINER_REGISTRY}/registry.json"
    echo "📁 Created container registry"
fi

# Container settings for test mode
if [ "$TEST_MODE" = true ]; then
    echo "⚠️ Running in TEST MODE with 5GB container limit"
    export MAX_CONTAINER_SIZE_BYTES=5368709120 # 5GB
fi

# Start the application based on mode
if [ "$MODE" = "prod" ]; then
    # Starting in production mode
    echo "👨‍💼 Starting in production mode..."
    
    # Clear NPM cache to free memory
    npm cache clean --force &>/dev/null
    
    # Run with optimized settings
    node server.js
else
    # Start in development mode
    echo "🔧 Starting in development mode..."
    npm run dev
fi 