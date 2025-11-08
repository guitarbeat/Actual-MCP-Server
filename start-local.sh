#!/bin/bash
# Start Actual MCP Server locally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Please create a .env file with your Actual Budget configuration"
    echo ""
    echo "Required variables:"
    echo "  ACTUAL_SERVER_URL=https://your-actual-server.com"
    echo "  ACTUAL_PASSWORD=your-password"
    echo "  ACTUAL_BUDGET_SYNC_ID=your-budget-sync-id (optional but recommended)"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if build exists
if [ ! -f build/index.js ]; then
    echo "🔨 Building server..."
    npm run build
fi

# Parse command line arguments
MODE="${1:-stdio}"

case "$MODE" in
    stdio)
        echo "🚀 Starting Actual MCP Server in stdio mode..."
        echo "   This mode is for MCP clients like Cursor"
        echo ""
        node build/index.js --enable-write
        ;;
    sse|http)
        PORT="${PORT:-3000}"
        echo "🚀 Starting Actual MCP Server in SSE/HTTP mode..."
        echo "   Server will be available at http://localhost:${PORT}"
        echo ""
        node build/index.js --sse --enable-write --enable-bearer --port "$PORT"
        ;;
    *)
        echo "Usage: $0 [stdio|sse|http]"
        echo ""
        echo "Modes:"
        echo "  stdio  - Standard I/O mode for MCP clients (default)"
        echo "  sse    - Server-Sent Events mode for HTTP clients"
        echo "  http   - Same as sse"
        exit 1
        ;;
esac

