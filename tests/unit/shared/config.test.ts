import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@playwright-orchestrator/shared', async () => {
  const actual = await vi.importActual('@playwright-orchestrator/shared');
  return {
    ...actual,
    loadConfig: vi.fn(),
    initializeConfig: vi.fn(),
  };
});

// Import after mocking
import { loadConfig, initializeConfig } from '@playwright-orchestrator/shared';

const mockLoadConfig = vi.mocked(loadConfig);
const mockInitializeConfig = vi.mocked(initializeConfig);

describe('Configuration Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadConfig.mockReset();
    mockInitializeConfig.mockReset();
    
    // Reset environment variables
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.ORCHESTRATOR_PORT;
    delete process.env.S3_BUCKET;
    delete process.env.DATABASE_URL;
  });

  describe('loadConfig', () => {
    it('should load configuration from JSON file', () => {
      const mockConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3001,
          cors_origins: ['http://localhost:3000'],
          rate_limit: {
            window_ms: 900000,
            max_requests: 100,
          },
          job_polling: {
            interval_ms: 5000,
            batch_size: 10,
          },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [
          {
            name: 'staging',
            base_url: 'https://staging.example.com',
            concurrency_limit: 3,
          },
        ],
        schedules: [
          {
            name: 'nightly',
            cron_string: '0 2 * * *',
            environment_name: 'staging',
            is_enabled: true,
            test_command: 'npx playwright test',
            custom_config: {},
          },
        ],
      };

      // Set environment variables
      process.env.DB_HOST = 'override-host';
      process.env.DB_PORT = '5433';
      process.env.ORCHESTRATOR_PORT = '3002';
      process.env.S3_BUCKET = 'override-bucket';

      const expectedConfig = {
        database: {
          host: 'override-host',
          port: 5433,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'override-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3002,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [],
        schedules: [],
      };

      mockLoadConfig.mockReturnValueOnce(expectedConfig);

      const config = loadConfig();

      expect(config.database.host).toBe('override-host');
      expect(config.database.port).toBe(5433);
      expect(config.s3.bucket).toBe('override-bucket');
      expect(config.orchestrator.port).toBe(3002);
      expect(config.environments).toHaveLength(0);
      expect(config.schedules).toHaveLength(0);
    });

    it('should apply environment variable overrides', () => {
      const mockConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3001,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [],
        schedules: [],
      };

      // Set environment variables
      process.env.DB_HOST = 'override-host';
      process.env.DB_PORT = '5433';
      process.env.ORCHESTRATOR_PORT = '3002';
      process.env.S3_BUCKET = 'override-bucket';

      const expectedConfig = {
        database: {
          host: 'override-host',
          port: 5433,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'override-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3002,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [],
        schedules: [],
      };

      mockLoadConfig.mockReturnValueOnce(expectedConfig);

      const config = loadConfig();

      expect(config.database.host).toBe('override-host');
      expect(config.database.port).toBe(5433);
      expect(config.orchestrator.port).toBe(3002);
      expect(config.s3.bucket).toBe('override-bucket');
    });

    it('should handle DATABASE_URL environment variable', () => {
      const mockConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3001,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [],
        schedules: [],
      };

      // Set DATABASE_URL
      process.env.DATABASE_URL = 'postgresql://dbuser:dbpass@dbhost:5434/dbname?sslmode=require';

      const expectedConfig = {
        database: {
          host: 'dbhost',
          port: 5434,
          database: 'dbname',
          username: 'dbuser',
          password: 'dbpass',
          ssl: true,
          max_connections: 20,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        orchestrator: {
          port: 3001,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        environments: [],
        schedules: [],
      };

      mockLoadConfig.mockReturnValueOnce(expectedConfig);

      const config = loadConfig();

      expect(config.database.host).toBe('dbhost');
      expect(config.database.port).toBe(5434);
      expect(config.database.database).toBe('dbname');
      expect(config.database.username).toBe('dbuser');
      expect(config.database.password).toBe('dbpass');
      expect(config.database.ssl).toBe(true);
    });

    it('should throw error for invalid configuration', () => {
      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error('Configuration validation failed');
      });

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should throw error when config file not found', () => {
      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error('Configuration file not found');
      });

      expect(() => loadConfig()).toThrow(/Configuration file not found/);
    });

    it('should throw error for invalid JSON', () => {

      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error('Failed to load configuration');
      });

      expect(() => loadConfig()).toThrow(/Failed to load configuration/);
    });
  });

  describe('Configuration validation', () => {
    it('should validate database configuration', () => {
      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error('Configuration validation failed: Invalid database configuration');
      });

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should validate environment configuration', () => {
      mockLoadConfig.mockImplementationOnce(() => {
        throw new Error('Configuration validation failed: Invalid environment configuration');
      });

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should apply default values', () => {
      const expectedConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'playwright_orchestrator',
          username: 'test_user',
          password: 'test_pass',
          ssl: false,
          max_connections: 20,
        },
        orchestrator: {
          port: 3001,
          cors_origins: ['http://localhost:3000'],
          rate_limit: { window_ms: 900000, max_requests: 100 },
          job_polling: { interval_ms: 5000, batch_size: 10 },
        },
        job_runner: {
          worker_id: 'test-worker',
          polling_interval_ms: 3000,
          max_concurrent_jobs: 3,
          test_timeout_ms: 1800000,
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
          force_path_style: false,
        },
        environments: [],
        schedules: [],
      };

      mockLoadConfig.mockReturnValueOnce(expectedConfig);

      const config = loadConfig();

      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.database.database).toBe('playwright_orchestrator');
      expect(config.orchestrator.port).toBe(3001);
      expect(config.job_runner.max_concurrent_jobs).toBe(3);
    });
  });
});

