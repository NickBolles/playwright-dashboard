# Playwright Orchestrator & Test Hub

A robust, scalable, and self-hosted Playwright test orchestrator that provides a centralized hub for scheduling, executing, and analyzing end-to-end tests.

## 🚀 Features

- **Centralized Test Orchestration**: Schedule and manage Playwright tests across multiple environments
- **Rate Limiting**: Environment-specific concurrency controls to prevent overloading
- **Multiple Trigger Types**: Manual, scheduled (cron), webhook, and API-triggered test runs
- **Scalable Architecture**: Separate orchestrator and job runner services for horizontal scaling
- **Modern Web Interface**: React-based dashboard with shadcn/ui components
- **Comprehensive API**: RESTful API for all operations
- **Trace Storage**: Automatic upload and storage of Playwright traces to S3
- **Docker Ready**: Complete containerization with Docker Compose

## 🏗️ Architecture

The system consists of four main components:

1. **Orchestrator Service** (Node.js/TypeScript)
   - REST API for managing runs, environments, and schedules
   - Cron-based scheduling system
   - Rate limiting and job queue management
   - Webhook endpoints for external integrations

2. **Job Runner Service** (Node.js/TypeScript)
   - Scalable worker containers that execute Playwright tests
   - Polls job queue and respects environment rate limits
   - Uploads test results and traces to S3

3. **Web UI** (React + shadcn/ui)
   - Dashboard for viewing test runs and results
   - Manual test triggering interface
   - Environment and schedule management

4. **Data Stores**
   - PostgreSQL for structured data (runs, environments, schedules)
   - S3-compatible storage for Playwright trace files

## 📋 Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 12+
- S3-compatible storage (AWS S3, MinIO, etc.)
- Docker and Docker Compose (for containerized deployment)

## 🛠️ Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd playwright-orchestrator
npm install
```

### 2. Configuration

Copy the example configuration file and customize it:

```bash
cp config.example.json config.json
```

Edit `config.json` with your database and S3 settings:

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "playwright_orchestrator",
    "username": "postgres",
    "password": "your_password",
    "ssl": false
  },
  "s3": {
    "endpoint": "http://localhost:9000",
    "region": "us-east-1",
    "bucket": "playwright-traces",
    "access_key_id": "your_access_key",
    "secret_access_key": "your_secret_key",
    "force_path_style": true
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
      "name": "Nightly Tests",
      "cron_string": "0 2 * * *",
      "environment_name": "staging",
      "test_command": "npx playwright test"
    }
  ]
}
```

### 3. Database Setup

Run database migrations:

```bash
npm run db:migrate
```

### 4. Build the Project

```bash
npm run build
```

## 🚀 Running the Services

### Development Mode

Start all services in development mode:

```bash
npm run dev
```

This will start:
- Orchestrator service on port 3001
- Job runner service
- Web UI on port 3000 (when implemented)

### Production Mode

Build and start services:

```bash
npm run build
npm run start
```

### Docker Deployment

Use Docker Compose for a complete deployment:

```bash
npm run docker:build
npm run docker:up
```

## 📚 API Documentation

### Runs API

- `GET /api/runs` - List runs with filtering and pagination
- `POST /api/runs` - Create a new test run
- `GET /api/runs/:id` - Get run details
- `PATCH /api/runs/:id/status` - Update run status
- `POST /api/runs/:id/cancel` - Cancel a queued run
- `GET /api/runs/stats` - Get run statistics

### Environments API

- `GET /api/environments` - List all environments
- `POST /api/environments` - Create a new environment
- `GET /api/environments/:id` - Get environment details
- `PATCH /api/environments/:id` - Update environment
- `DELETE /api/environments/:id` - Delete environment

### Schedules API

- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create a new schedule
- `GET /api/schedules/:id` - Get schedule details
- `PATCH /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `POST /api/schedules/:id/toggle` - Enable/disable schedule

### Webhooks API

- `POST /api/webhooks/github-pr` - GitHub PR webhook
- `POST /api/webhooks/deployment` - Deployment webhook
- `POST /api/webhooks/generic` - Generic webhook

## 🔧 Configuration Options

### Environment Variables

You can override configuration values using environment variables:

- `DATABASE_URL` - Complete database connection string
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Individual database settings
- `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - S3 settings
- `ORCHESTRATOR_PORT` - Orchestrator service port
- `WORKER_ID` - Job runner worker identifier
- `MAX_CONCURRENT_JOBS` - Maximum concurrent jobs per runner

### Cron Scheduling

Schedules use standard cron syntax:

- `0 2 * * *` - Daily at 2 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Weekly on Monday at midnight
- `*/15 * * * *` - Every 15 minutes

## 🐳 Docker Configuration

The project includes Docker configurations for all services:

- `packages/orchestrator/Dockerfile` - Orchestrator service
- `packages/job-runner/Dockerfile` - Job runner service
- `packages/web-ui/Dockerfile` - Web UI
- `docker-compose.yml` - Complete stack with PostgreSQL and MinIO

## 📊 Monitoring and Logging

- Structured logging with Winston
- Health check endpoints on all services
- Queue statistics and environment usage metrics
- Comprehensive error handling and reporting

## 🔒 Security Features

- Helmet.js security headers
- CORS configuration
- Rate limiting on API endpoints
- Input validation with express-validator
- SQL injection prevention with parameterized queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

---

Built with ❤️ using TypeScript, Node.js, React, and PostgreSQL.

