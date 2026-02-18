# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build

# Reinstall production-only deps (with native addon compilation)
RUN rm -rf node_modules && \
    pnpm install --prod --no-frozen-lockfile

# ---- Release ----
FROM node:20-alpine AS release

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
