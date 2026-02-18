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

# ---- Release ----
FROM node:20-alpine AS release

WORKDIR /app

# Enable pnpm + build tools for native addon compilation
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache python3 make g++

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/build ./build

ENV NODE_ENV=production

# Install prod deps WITH scripts so better-sqlite3 compiles natively
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --prod --frozen-lockfile

# Clean up build tools to reduce image size
RUN apk del python3 make g++

EXPOSE 3000
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
