#!/bin/bash

# Dashboard E2E Test Runner
# This script runs the dashboard E2E test with proper setup and cleanup

set -e

echo "🚀 Starting Dashboard E2E Test..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check if web UI is built
if [ ! -d "packages/web-ui/dist" ]; then
    echo "🔨 Building web UI..."
    pnpm run build -w web-ui
fi

# Clean up any existing test containers
echo "🧹 Cleaning up existing test containers..."
docker ps -q --filter "name=test-postgres" | xargs -r docker stop
docker ps -aq --filter "name=test-postgres" | xargs -r docker rm

# Run the dashboard E2E test
echo "🧪 Running dashboard E2E test..."
pnpm test:e2e:dashboard

echo "✅ Dashboard E2E test completed!"

# Optional: Show test results
if [ -d "test-results" ]; then
    echo "📊 Test results available in test-results/"
    echo "📈 HTML report: test-results/html-report/index.html"
fi