# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build

# ---- Release ----
FROM node:20-alpine AS release

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/build ./build

ENV NODE_ENV=production

RUN pnpm install --prod --frozen-lockfile

EXPOSE 3000
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-bearer", "--enable-write"]
