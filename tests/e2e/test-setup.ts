import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'pg';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { setTimeout } from 'timers/promises';

export interface TestEnvironment {
  postgresContainer: StartedTestContainer;
  pgClient: Client;
  orchestratorProcess: ChildProcess;
  webUiProcess: ChildProcess;
  postgresHost: string;
  postgresPort: number;
}

export async function setupTestEnvironment(): Promise<TestEnvironment> {
  console.log('🚀 Setting up test environment...');

  // Start PostgreSQL container
  const postgresContainer = await new GenericContainer('postgres:15-alpine')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: 'playwright_orchestrator_test',
      POSTGRES_USER: 'testuser',
      POSTGRES_PASSWORD: 'testpass'
    })
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  const postgresPort = postgresContainer.getMappedPort(5432);
  const postgresHost = postgresContainer.getHost();

  console.log(`📦 PostgreSQL container started on ${postgresHost}:${postgresPort}`);

  // Connect to PostgreSQL
  const pgClient = new Client({
    host: postgresHost,
    port: postgresPort,
    database: 'playwright_orchestrator_test',
    user: 'testuser',
    password: 'testpass'
  });

  await pgClient.connect();
  console.log('✅ Connected to PostgreSQL');

  // Create database schema
  await createDatabaseSchema(pgClient);
  console.log('✅ Database schema created');

  // Insert test data
  await insertTestData(pgClient);
  console.log('✅ Test data inserted');

  // Start orchestrator service
  const orchestratorProcess = await startOrchestratorService(postgresHost, postgresPort);
  console.log('✅ Orchestrator service started');

  // Start web UI
  const webUiProcess = await startWebUI();
  console.log('✅ Web UI started');

  // Wait for services to be ready
  await waitForServices();
  console.log('✅ All services ready');

  return {
    postgresContainer,
    pgClient,
    orchestratorProcess,
    webUiProcess,
    postgresHost,
    postgresPort
  };
}

export async function teardownTestEnvironment(env: TestEnvironment): Promise<void> {
  console.log('🧹 Cleaning up test environment...');

  // Stop web UI
  if (env.webUiProcess) {
    env.webUiProcess.kill();
  }

  // Stop orchestrator
  if (env.orchestratorProcess) {
    env.orchestratorProcess.kill();
  }

  // Close database connection
  if (env.pgClient) {
    await env.pgClient.end();
  }

  // Stop PostgreSQL container
  if (env.postgresContainer) {
    await env.postgresContainer.stop();
  }

  console.log('✅ Test environment cleaned up');
}

async function createDatabaseSchema(pgClient: Client): Promise<void> {
  // Create tables based on the shared types
  await pgClient.query(`
    CREATE TABLE environments (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      base_url VARCHAR(500) NOT NULL,
      concurrency_limit INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE schedules (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      cron_string VARCHAR(100) NOT NULL,
      environment_id VARCHAR(255) NOT NULL REFERENCES environments(id),
      is_enabled BOOLEAN DEFAULT true,
      test_command TEXT NOT NULL,
      custom_config JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE runs (
      id VARCHAR(255) PRIMARY KEY,
      environment_id VARCHAR(255) NOT NULL REFERENCES environments(id),
      schedule_id VARCHAR(255) REFERENCES schedules(id),
      status VARCHAR(50) NOT NULL DEFAULT 'queued',
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      duration_ms BIGINT,
      error_log TEXT,
      trace_url VARCHAR(500),
      custom_config JSONB DEFAULT '{}',
      test_command TEXT NOT NULL,
      triggered_by VARCHAR(50) NOT NULL DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_runs_environment_id ON runs(environment_id);
    CREATE INDEX idx_runs_status ON runs(status);
    CREATE INDEX idx_runs_created_at ON runs(created_at);
  `);
}

async function insertTestData(pgClient: Client): Promise<void> {
  const testData = {
    environments: [
      {
        id: 'env-1',
        name: 'Staging Environment',
        base_url: 'https://staging.example.com',
        concurrency_limit: 3
      },
      {
        id: 'env-2', 
        name: 'Production Environment',
        base_url: 'https://prod.example.com',
        concurrency_limit: 2
      }
    ],
    runs: [
      {
        id: 'run-1',
        environment_id: 'env-1',
        status: 'success',
        start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        end_time: new Date(Date.now() - 3500000).toISOString(),
        duration_ms: 100000, // 1.67 minutes
        triggered_by: 'manual',
        test_command: 'npx playwright test --grep smoke'
      },
      {
        id: 'run-2',
        environment_id: 'env-1', 
        status: 'failed',
        start_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        end_time: new Date(Date.now() - 7100000).toISOString(),
        duration_ms: 180000, // 3 minutes
        triggered_by: 'schedule',
        test_command: 'npx playwright test --grep regression',
        error_log: 'Test failed due to timeout'
      },
      {
        id: 'run-3',
        environment_id: 'env-2',
        status: 'success', 
        start_time: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        end_time: new Date(Date.now() - 10700000).toISOString(),
        duration_ms: 60000, // 1 minute
        triggered_by: 'webhook',
        test_command: 'npx playwright test --grep critical'
      },
      {
        id: 'run-4',
        environment_id: 'env-1',
        status: 'in_progress',
        start_time: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        triggered_by: 'manual',
        test_command: 'npx playwright test --grep e2e'
      }
    ],
    schedules: [
      {
        id: 'schedule-1',
        name: 'Nightly Tests',
        cron_string: '0 2 * * *',
        environment_id: 'env-1',
        is_enabled: true,
        test_command: 'npx playwright test --grep nightly'
      }
    ]
  };

  // Insert environments
  for (const env of testData.environments) {
    await pgClient.query(`
      INSERT INTO environments (id, name, base_url, concurrency_limit)
      VALUES ($1, $2, $3, $4)
    `, [env.id, env.name, env.base_url, env.concurrency_limit]);
  }

  // Insert schedules
  for (const schedule of testData.schedules) {
    await pgClient.query(`
      INSERT INTO schedules (id, name, cron_string, environment_id, is_enabled, test_command)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [schedule.id, schedule.name, schedule.cron_string, schedule.environment_id, schedule.is_enabled, schedule.test_command]);
  }

  // Insert runs
  for (const run of testData.runs) {
    await pgClient.query(`
      INSERT INTO runs (id, environment_id, status, start_time, end_time, duration_ms, error_log, test_command, triggered_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [run.id, run.environment_id, run.status, run.start_time, run.end_time, run.duration_ms, run.error_log, run.test_command, run.triggered_by]);
  }
}

async function startOrchestratorService(dbHost: string, dbPort: number): Promise<ChildProcess> {
  // Set environment variables for the orchestrator
  const env = {
    ...process.env,
    DB_HOST: dbHost,
    DB_PORT: dbPort.toString(),
    DB_NAME: 'playwright_orchestrator_test',
    DB_USER: 'testuser',
    DB_PASSWORD: 'testpass',
    NODE_ENV: 'test'
  };

  // Start the orchestrator service
  const orchestratorProcess = spawn('npm', ['run', 'start:orchestrator'], {
    cwd: process.cwd(),
    env,
    stdio: 'pipe'
  });

  orchestratorProcess.stdout?.on('data', (data) => {
    console.log(`[Orchestrator] ${data.toString().trim()}`);
  });

  orchestratorProcess.stderr?.on('data', (data) => {
    console.error(`[Orchestrator Error] ${data.toString().trim()}`);
  });

  return orchestratorProcess;
}

async function startWebUI(): Promise<ChildProcess> {
  // Set environment variables for the web UI
  const env = {
    ...process.env,
    NODE_ENV: 'test'
  };

  // Start the web UI service
  const webUiProcess = spawn('npm', ['run', 'dev', '-w', 'web-ui'], {
    cwd: process.cwd(),
    env,
    stdio: 'pipe'
  });

  webUiProcess.stdout?.on('data', (data) => {
    console.log(`[Web UI] ${data.toString().trim()}`);
  });

  webUiProcess.stderr?.on('data', (data) => {
    console.error(`[Web UI Error] ${data.toString().trim()}`);
  });

  return webUiProcess;
}

async function waitForServices(): Promise<void> {
  // Wait for orchestrator to be ready
  let retries = 0;
  while (retries < 30) {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) break;
    } catch (error) {
      // Service not ready yet
    }
    await setTimeout(1000);
    retries++;
  }

  if (retries >= 30) {
    throw new Error('Orchestrator service failed to start within 30 seconds');
  }

  // Wait for web UI to be ready
  retries = 0;
  while (retries < 30) {
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) break;
    } catch (error) {
      // Service not ready yet
    }
    await setTimeout(1000);
    retries++;
  }

  if (retries >= 30) {
    throw new Error('Web UI service failed to start within 30 seconds');
  }
}