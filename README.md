# Playwright Orchestrator & Test Hub

A robust, scalable, and self-hosted Playwright test orchestrator that provides a centralized hub for scheduling, executing, and analyzing end-to-end tests.

## 🚀 Features

- **Test Orchestration**: Schedule and execute Playwright tests across multiple environments
- **Rate Limiting**: Prevent environment overload with configurable concurrency limits
- **Trace Storage**: Automatic upload and storage of Playwright traces to S3-compatible storage
- **Web Dashboard**: Modern React-based UI for viewing test results and managing runs
- **API & Webhooks**: REST API and webhook support for CI/CD integration
- **Scalable Architecture**: Horizontally scalable job runners with Docker support
- **Real-time Monitoring**: Live status updates and comprehensive logging

## 🏗️ Architecture

The system consists of four main components:

1. **Orchestrator Service** (Node.js/TypeScript) - REST API, scheduling, and job management
2. **Job Runner Service** (Node.js/TypeScript) - Scalable test execution workers
3. **Web UI** (React) - Dashboard for viewing results and managing tests
4. **Data Stores** - PostgreSQL for metadata, S3 for artifacts

## 📋 Prerequisites

- **Node.js** 18+ and npm 9+
- **Docker** and Docker Compose (for containerized deployment)
- **PostgreSQL** 15+ (or use Docker)
- **S3-compatible storage** (AWS S3, MinIO, etc.)

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone and configure**:
   ```bash
   git clone <repository-url>
   cd playwright-orchestrator
   cp config.example.json config.json
   # Edit config.json with your settings
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Web UI: http://localhost:3000
   - API: http://localhost:3001
   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

### Option 2: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up database**:
   ```bash
   # Start PostgreSQL (or use Docker)
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
   
   # Run migrations
   npm run db:migrate
   ```

3. **Set up MinIO (S3 storage)**:
   ```bash
   docker run -d --name minio -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"
   ```

4. **Start services**:
   ```bash
   # Terminal 1: Start orchestrator
   npm run dev:orchestrator
   
   # Terminal 2: Start job runner
   npm run dev:job-runner
   
   # Terminal 3: Start web UI (when implemented)
   npm run dev:web-ui
   ```

## ⚙️ Configuration

Configuration is managed through `config.json` and environment variables. Environment variables take precedence.

### Example Configuration

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "playwright_orchestrator",
    "username": "postgres",
    "password": "postgres",
    "ssl": false,
    "max_connections": 20
  },
  "s3": {
    "endpoint": "http://localhost:9000",
    "region": "us-east-1",
    "bucket": "playwright-traces",
    "access_key_id": "minioadmin",
    "secret_access_key": "minioadmin",
    "force_path_style": true
  },
  "orchestrator": {
    "port": 3001,
    "cors_origins": ["http://localhost:3000"],
    "rate_limit": {
      "window_ms": 900000,
      "max_requests": 100
    }
  },
  "job_runner": {
    "worker_id": "worker-1",
    "polling_interval_ms": 3000,
    "max_concurrent_jobs": 3,
    "test_timeout_ms": 1800000
  },
  "environments": [
    {
      "name": "staging",
      "base_url": "https://staging.example.com",
      "concurrency_limit": 3
    }
  ],
  "schedules": [
    {
      "name": "nightly",
      "cron_string": "0 2 * * *",
      "environment_name": "staging",
      "is_enabled": true,
      "test_command": "npx playwright test",
      "custom_config": {}
    }
  ]
}
```

### Environment Variables

Key environment variables that override config.json:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playwright_orchestrator
DB_USER=postgres
DB_PASSWORD=postgres

# S3 Storage
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=playwright-traces
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin

# Services
ORCHESTRATOR_PORT=3001
WORKER_ID=worker-1
POLLING_INTERVAL_MS=3000
MAX_CONCURRENT_JOBS=3
```

## 🔌 API Reference

### Runs

- `GET /api/runs` - List test runs
- `POST /api/runs` - Create a new test run
- `GET /api/runs/:id` - Get run details
- `PATCH /api/runs/:id/status` - Update run status
- `POST /api/runs/:id/cancel` - Cancel a run
- `GET /api/runs/stats` - Get run statistics

### Environments

- `GET /api/environments` - List environments
- `POST /api/environments` - Create environment
- `GET /api/environments/:id` - Get environment details
- `PUT /api/environments/:id` - Update environment
- `DELETE /api/environments/:id` - Delete environment

### Schedules

- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `GET /api/schedules/:id` - Get schedule details
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Webhooks

- `POST /api/webhooks/github-pr` - GitHub PR webhook

### Example: Create a Test Run

```bash
curl -X POST http://localhost:3001/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "environment_id": "env-123",
    "custom_config": {
      "BASE_URL": "https://staging.example.com",
      "TEST_SUITE": "smoke"
    },
    "test_command": "npx playwright test --grep smoke",
    "triggered_by": "manual"
  }'
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode
npm test
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Test Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── main-workflow.spec.ts
│   ├── global-setup.ts
│   └── global-teardown.ts
└── unit/                   # Vitest unit tests
    ├── shared/
    ├── orchestrator/
    └── job-runner/
```

## 🐳 Docker Deployment

### Production Deployment

1. **Build images**:
   ```bash
   docker-compose build
   ```

2. **Start services**:
   ```bash
   docker-compose up -d
   ```

3. **Scale job runners**:
   ```bash
   docker-compose up -d --scale job-runner=3
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f
   ```

### Environment-specific Overrides

Create `docker-compose.override.yml` for environment-specific settings:

```yaml
version: '3.8'
services:
  orchestrator:
    environment:
      NODE_ENV: production
      DB_HOST: your-prod-db-host
      S3_ENDPOINT: https://your-s3-endpoint
```

## 📊 Monitoring & Logging

### Health Checks

- Orchestrator: `GET /health`
- Database connectivity and S3 access are verified

### Logging

Structured JSON logging with different levels:
- `error` - Errors and exceptions
- `warn` - Warnings and recoverable issues  
- `info` - General information
- `debug` - Detailed debugging information

### Metrics

Key metrics to monitor:
- Test run success/failure rates
- Average test execution time
- Queue depth and processing time
- Environment utilization

## 🔧 Development

### Project Structure

```
playwright-orchestrator/
├── packages/
│   ├── shared/             # Shared utilities and types
│   ├── orchestrator/       # API server and scheduler
│   ├── job-runner/         # Test execution workers
│   └── web-ui/            # React dashboard
├── tests/                  # Test suites
├── docker/                 # Docker configurations
├── config.json            # Application configuration
└── docker-compose.yml     # Container orchestration
```

### Development Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Adding New Features

1. **Shared types/utilities**: Add to `packages/shared/`
2. **API endpoints**: Add to `packages/orchestrator/src/routes/`
3. **Job processing**: Add to `packages/job-runner/src/`
4. **UI components**: Add to `packages/web-ui/src/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify PostgreSQL is running
   - Check connection string in config
   - Ensure database exists

2. **S3 upload errors**
   - Verify MinIO/S3 credentials
   - Check bucket exists and is accessible
   - Verify network connectivity

3. **Tests not executing**
   - Check job runner logs
   - Verify Playwright installation
   - Check environment configuration

4. **Port conflicts**
   - Ensure ports 3000, 3001, 5432, 9000 are available
   - Modify ports in docker-compose.yml if needed

### Getting Help

- Check the [Issues](https://github.com/your-org/playwright-orchestrator/issues) page
- Review logs in `logs/` directory
- Enable debug logging: `NODE_ENV=development`

## 🗺️ Roadmap

- [ ] **Web UI Implementation** - React dashboard for test management
- [ ] **Authentication & Authorization** - User management and RBAC
- [ ] **Advanced Analytics** - Test flakiness analysis and performance metrics
- [ ] **Dynamic Scaling** - Auto-scaling job runners based on queue depth
- [ ] **Notification System** - Slack/email notifications for test results
- [ ] **Test Parallelization** - Smart test splitting and parallel execution
- [ ] **Plugin System** - Extensible architecture for custom integrations

