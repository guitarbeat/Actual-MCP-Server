# Development Tools

This directory contains files for local development and Docker-based testing.

## Files

- **`docker-compose.yml`** - Docker Compose configuration for running the MCP server locally with SSE support
- **`Dockerfile.logserver`** - Dockerfile for the log server used with docker-compose
- **`log-server.js`** - Simple Express server for logging in local development

## Usage

These files are only needed for local Docker-based development. For production deployment, use Railway with Nixpacks (see main README).

### Running with Docker Compose

```bash
cd dev
docker-compose up -d
```

The server will be available at `http://localhost:3000/sse`.

