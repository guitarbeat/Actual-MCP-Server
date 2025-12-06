# Dockerfile for Actual Budget MCP Server
# Use this if Nixpacks doesn't auto-detect Node.js version correctly

# ---- Builder Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies for build)
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source files
COPY . ./

# Build the application
RUN npm run build

# ---- Release Stage ----
FROM node:22-alpine AS release

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copy built application
COPY --from=builder /app/build ./build

# Install only production dependencies
# Skip lifecycle scripts (like 'prepare' which runs husky) since we don't need git hooks in Docker
ENV NODE_ENV=production
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# Expose port
EXPOSE 3000

# Start the server
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-write"]
