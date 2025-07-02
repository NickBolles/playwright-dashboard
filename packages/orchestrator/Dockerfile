# Multi-stage build for Orchestrator Service
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/orchestrator/package*.json ./packages/orchestrator/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/orchestrator/ ./packages/orchestrator/
COPY tsconfig.json ./

# Build the application
RUN npm run build -w shared
RUN npm run build -w orchestrator

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S orchestrator -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/orchestrator/package*.json ./packages/orchestrator/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

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
CMD ["node", "packages/orchestrator/dist/index.js"]

