import { beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Mock configuration for tests
const mockConfig = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'playwright_orchestrator_test',
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'test',
    ssl: false,
    max_connections: 5,
  },
  s3: {
    endpoint: 'http://localhost:9000',
    region: 'us-east-1',
    bucket: 'test-bucket',
    access_key_id: 'testkey',
    secret_access_key: 'testsecret',
    force_path_style: true,
  },
  orchestrator: {
    port: 3001,
    cors_origins: ['http://localhost:3000'],
    rate_limit: {
      window_ms: 15 * 60 * 1000,
      max_requests: 100,
    },
    job_polling: {
      interval_ms: 5000,
      batch_size: 10,
    },
  },
  job_runner: {
    worker_id: 'test-worker',
    polling_interval_ms: 1000,
    max_concurrent_jobs: 2,
    test_timeout_ms: 10000,
  },
  environments: [],
  schedules: [],
};

// Mock the shared package at the top level
vi.mock('@playwright-orchestrator/shared', async () => {
  const actual = await vi.importActual('@playwright-orchestrator/shared');
  return {
    ...actual,
    getConfig: () => mockConfig,
    initializeConfig: vi.fn(),
    getDatabase: vi.fn(() => ({
      query: vi.fn(),
      transaction: vi.fn(),
      close: vi.fn(),
    })),
  };
});

// Global test setup
beforeAll(async () => {
  // Set up test environment
  process.env.NODE_ENV = 'test';
});

// Clean up after all tests
afterAll(async () => {
  // Clean up any global resources
});

// Reset state before each test
beforeEach(async () => {
  // Clear any mocks or reset state as needed
  vi.clearAllMocks();
});

