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

# * Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

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

# * Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# * Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# * Health check to verify server is running
# * Checks if the server responds to HTTP requests on the root endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Start the server
# * Note: Environment variables should be provided via docker run -e or docker-compose
# * Required: ACTUAL_SERVER_URL, ACTUAL_PASSWORD, ACTUAL_BUDGET_SYNC_ID
# * Optional: BEARER_TOKEN (for --enable-bearer), PORT (defaults to 3000)
# * Flags: --sse (SSE transport), --enable-write (write operations), --enable-bearer (bearer auth)
ENTRYPOINT ["node", "build/index.js", "--sse", "--enable-write"]
