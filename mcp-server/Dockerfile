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

WORKDIR /app/mcp-server

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/mcp-server/node_modules ./node_modules
COPY --from=builder /app/mcp-server/package.json ./package.json
COPY --from=builder /app/mcp-server/build ./build

# Polyfill browser globals required by @actual-app/api at module load time.
# navigator.platform is referenced at the top level of bundle.api.js; Node.js
# has no navigator global so the process crashes on startup without this.
RUN echo 'if (typeof globalThis.navigator === "undefined") { globalThis.navigator = { platform: process.platform, userAgent: "node" }; }' > polyfill.cjs

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["node", "--require", "./polyfill.cjs", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
