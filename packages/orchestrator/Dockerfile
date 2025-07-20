# Multi-stage build for Orchestrator Service
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm typescript

# Set working directory
WORKDIR /app

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/

# Install dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/orchestrator/ ./packages/orchestrator/
COPY tsconfig.json ./

# Build the application
RUN pnpm --filter shared run build
RUN pnpm --filter orchestrator run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init and pnpm
RUN apk add --no-cache dumb-init && npm install -g pnpm

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S orchestrator -u 1001

# Set working directory
WORKDIR /app

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/orchestrator/package.json ./packages/orchestrator/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist && pnpm store prune

# Copy built application
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/orchestrator/dist ./packages/orchestrator/dist

# Copy configuration
COPY config.json ./

# Create logs directory
RUN mkdir -p logs && chown -R orchestrator:nodejs logs

# Switch to non-root user
USER orchestrator

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/orchestrator/dist/server.js"]

