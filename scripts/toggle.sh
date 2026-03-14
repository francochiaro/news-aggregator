#!/bin/bash

# Newsletter Aggregator Toggle Script
# - If server is off: starts it and opens browser
# - If server is on: stops it

# Load shell profile so npm is available (needed for Automator)
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
[ -f ~/.zshrc ] && source ~/.zshrc 2>/dev/null
[ -f ~/.bash_profile ] && source ~/.bash_profile 2>/dev/null

APP_DIR="$(dirname "$0")/.."
cd "$APP_DIR/web"

# Function to show macOS notification
notify() {
    osascript -e "display notification \"$1\" with title \"Newsletter Aggregator\""
}

# Check if server is running on port 3000
if lsof -i :3000 > /dev/null 2>&1; then
    # Server is running - stop it
    PID=$(lsof -ti :3000)
    kill $PID 2>/dev/null

    # Wait a moment and verify it stopped
    sleep 1
    if ! lsof -i :3000 > /dev/null 2>&1; then
        notify "Server stopped"
    else
        notify "Failed to stop server"
    fi
else
    # Server is not running - start it
    notify "Starting server..."

    # Start server in background
    LOG_FILE="$APP_DIR/server.log"
    npm run dev > "$LOG_FILE" 2>&1 &

    # Wait for server to be ready (check every 0.5s, timeout after 30s)
    for i in {1..60}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            open http://localhost:3000
            notify "Server running at localhost:3000"
            exit 0
        fi
        sleep 0.5
    done

    notify "Server failed to start. Check server.log"
    exit 1
fi
