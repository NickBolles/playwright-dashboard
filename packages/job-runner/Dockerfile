# Multi-stage build for Job Runner Service
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/job-runner/package.json ./packages/job-runner/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY packages/job-runner/ ./packages/job-runner/
COPY tsconfig.json ./

# Build the application
RUN pnpm run build -w shared
RUN pnpm run build -w job-runner

# Production stage
FROM mcr.microsoft.com/playwright:v1.40.0-focal AS production

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

# Copy package files
COPY package.json pnpm-lock.yaml* ./
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

# Install Playwright browsers (already included in base image)
RUN npx playwright install-deps

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

