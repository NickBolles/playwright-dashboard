# Dashboard E2E Test with Testcontainers

This directory contains end-to-end tests for the Playwright Orchestrator dashboard, including a comprehensive test that uses Testcontainers to set up a real PostgreSQL database with test data.

## Overview

The dashboard E2E test verifies that:

1. **Dashboard loads correctly** - All UI components render properly
2. **Data displays accurately** - Statistics and charts show correct values from the database
3. **Real-time updates work** - Dashboard responds to data changes
4. **Error handling is graceful** - UI handles API failures appropriately
5. **Navigation works** - Users can move between different sections
6. **Responsive design** - Dashboard works on different screen sizes

## Test Architecture

### Testcontainers Setup

The test uses Testcontainers to:

- **Start a PostgreSQL container** with a clean database
- **Create the database schema** based on the shared types
- **Insert realistic test data** including environments, runs, and schedules
- **Start the orchestrator service** connected to the test database
- **Start the web UI** for testing
- **Clean up everything** after tests complete

### Test Data

The test inserts the following data:

- **2 Environments**: Staging and Production with different concurrency limits
- **4 Test Runs**: Mix of successful, failed, and in-progress runs
- **1 Schedule**: Nightly test schedule
- **Various timestamps**: Runs spread across different time periods

## Running the Tests

### Prerequisites

1. **Docker** must be running (for Testcontainers)
2. **Node.js 18+** and **pnpm** installed
3. All dependencies installed: `pnpm install`

### Quick Start

```bash
# Run the dashboard E2E test
pnpm test:e2e:dashboard

# Run with UI mode (interactive)
pnpm test:e2e:dashboard:ui

# Run all E2E tests
pnpm test:e2e

# Run all E2E tests with UI
pnpm test:e2e:ui
```

### Manual Setup (for debugging)

If you want to run the test environment manually:

1. **Start PostgreSQL container**:
   ```bash
   docker run -d --name test-postgres \
     -e POSTGRES_DB=playwright_orchestrator_test \
     -e POSTGRES_USER=testuser \
     -e POSTGRES_PASSWORD=testpass \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Start the orchestrator**:
   ```bash
   DB_HOST=localhost \
   DB_PORT=5432 \
   DB_NAME=playwright_orchestrator_test \
   DB_USER=testuser \
   DB_PASSWORD=testpass \
   npm run start:orchestrator
   ```

3. **Start the web UI**:
   ```bash
   npm run dev -w web-ui
   ```

4. **Run the test**:
   ```bash
   pnpm test:e2e:dashboard
   ```

## Test Structure

### `dashboard.spec.ts`

Main test file that:

- **Sets up the test environment** using Testcontainers
- **Tests dashboard functionality** with real data
- **Verifies real-time updates** by inserting new data
- **Tests error handling** by breaking database connections
- **Cleans up** all resources

### `test-setup.ts`

Helper module that:

- **Manages Testcontainers lifecycle**
- **Creates database schema**
- **Inserts test data**
- **Starts and stops services**
- **Provides cleanup utilities**

## What the Test Verifies

### Dashboard Components

1. **Header and Navigation**
   - Dashboard title and description
   - Sidebar navigation links
   - Theme toggle functionality

2. **Statistics Cards**
   - Total runs count (should be 4)
   - Success rate (should be 75%)
   - Failed runs count (should be 1)
   - Average duration (should be ~1m)

3. **Charts and Visualizations**
   - Test execution trends chart
   - Environment status display
   - Recent test runs list

4. **System Health**
   - API status indicators
   - Database connection status
   - Job runner status
   - Storage availability

5. **Quick Actions**
   - Run smoke tests button
   - Deploy to staging button
   - View analytics button

### Data Accuracy

The test verifies that:

- **Statistics match database data**: Total runs, success rates, etc.
- **Environment information is correct**: Names, URLs, concurrency limits
- **Recent runs display properly**: Status, duration, timestamps
- **Real-time updates work**: Dashboard reflects new data

### Error Handling

The test verifies graceful handling of:

- **Database connection failures**
- **API errors**
- **Missing data**
- **Network timeouts**

## Debugging

### Common Issues

1. **Docker not running**: Testcontainers requires Docker to be running
2. **Port conflicts**: Ensure ports 3000, 3001, and 5432 are available
3. **Service startup timeouts**: Increase timeout values in test setup
4. **Database connection issues**: Check PostgreSQL container logs

### Debug Commands

```bash
# Check Docker containers
docker ps

# View PostgreSQL logs
docker logs test-postgres

# Check service health
curl http://localhost:3001/health
curl http://localhost:3000

# Run test with debug output
DEBUG=* pnpm test:e2e:dashboard
```

### Manual Database Inspection

```bash
# Connect to test database
psql -h localhost -p 5432 -U testuser -d playwright_orchestrator_test

# View test data
SELECT * FROM environments;
SELECT * FROM runs;
SELECT * FROM schedules;
```

## Extending the Test

### Adding New Test Cases

1. **Add new test data** in `test-setup.ts`
2. **Create new test functions** in `dashboard.spec.ts`
3. **Update assertions** to match expected behavior

### Testing New Features

1. **Add new database tables** in `createDatabaseSchema()`
2. **Insert relevant test data** in `insertTestData()`
3. **Add UI assertions** for new components
4. **Test error scenarios** for new features

### Performance Testing

The test can be extended to:

- **Load testing** with large datasets
- **Performance monitoring** of dashboard rendering
- **Memory usage** tracking
- **Response time** measurements

## CI/CD Integration

The test is designed to work in CI/CD environments:

- **Docker-in-Docker** support
- **Automatic cleanup** of resources
- **Parallel execution** support
- **Failure reporting** with screenshots and videos

## Contributing

When adding new dashboard features:

1. **Update test data** to include relevant scenarios
2. **Add UI assertions** for new components
3. **Test error states** for new features
4. **Update documentation** with new test cases
5. **Ensure tests pass** in CI environment