# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
# Reason: Pin pnpm to the workspace/CI version so Render builds are reproducible.
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mcp-server/package.json ./mcp-server/package.json
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . ./
RUN pnpm --filter actual-mcp build

# ---- Release ----
FROM node:20-alpine AS release

WORKDIR /app

# Copy root node_modules so that package-level builds can find dependencies
# and dependencies of dependencies correctly in the monorepo.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/mcp-server/package.json ./mcp-server/package.json
COPY --from=builder /app/mcp-server/build ./mcp-server/build

WORKDIR /app/mcp-server

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
