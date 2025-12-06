# Dockerfile for Actual Budget MCP Server
# Use this if Nixpacks doesn't auto-detect Node.js version correctly

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "build/index.js", "--sse", "--enable-write"]
