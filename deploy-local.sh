#!/bin/bash
# Deploy Actual MCP Server locally using nixpacks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="actual-mcp"
IMAGE_NAME="${PROJECT_NAME}:local"
CONTAINER_NAME="${PROJECT_NAME}-server"

echo "🚀 Building Actual MCP Server with nixpacks..."

# Check if nixpacks is installed
if ! command -v nixpacks &> /dev/null; then
    echo "❌ nixpacks is not installed. Installing..."
    if command -v cargo &> /dev/null; then
        cargo install nixpacks
    else
        echo "Please install nixpacks: https://github.com/railwayapp/nixpacks"
        exit 1
    fi
fi

# Build the Docker image using nixpacks
cd "$SCRIPT_DIR"
nixpacks build . -n "$IMAGE_NAME"

echo "✅ Build complete!"
echo ""
echo "To run the container:"
echo "  docker run -d --name $CONTAINER_NAME \\"
echo "    -p 3000:3000 \\"
echo "    -e ACTUAL_SERVER_URL=\$ACTUAL_SERVER_URL \\"
echo "    -e ACTUAL_PASSWORD=\$ACTUAL_PASSWORD \\"
echo "    -e ACTUAL_BUDGET_SYNC_ID=\$ACTUAL_BUDGET_SYNC_ID \\"
echo "    -e BEARER_TOKEN=\$BEARER_TOKEN \\"
echo "    $IMAGE_NAME"
echo ""
echo "Or use docker-compose (see docker-compose.yml)"

