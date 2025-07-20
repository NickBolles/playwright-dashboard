# Multi-stage build for Job Runner Service
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm typescript

# Set working directory
WORKDIR /app

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/job-runner/package.json ./packages/job-runner/

# Install dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/job-runner/ ./packages/job-runner/
COPY tsconfig.json ./

# Build the application
RUN pnpm --filter shared run build
RUN pnpm --filter job-runner run build

# Production stage
FROM mcr.microsoft.com/playwright:v1.54.0-noble AS production

# Install Node.js and pnpm
RUN apt-get update && apt-get install -y \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

# Create app user
RUN groupadd -r nodejs && useradd -r -g nodejs jobrunner

# Set working directory
WORKDIR /app

# Copy package files and workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/job-runner/package.json ./packages/job-runner/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy built application
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/job-runner/dist ./packages/job-runner/dist

# Copy configuration
COPY config.json ./

# Create necessary directories
RUN mkdir -p logs test-results && chown -R jobrunner:nodejs logs test-results

# Playwright browsers and dependencies are already included in base image

# Switch to non-root user
USER jobrunner

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "console.log('Job runner health check - always healthy')"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/job-runner/dist/index.js"]

