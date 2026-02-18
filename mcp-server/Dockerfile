# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build

# ---- Release ----
FROM node:20-alpine AS release

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/build ./build

ENV NODE_ENV=production

RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

EXPOSE 3000
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
