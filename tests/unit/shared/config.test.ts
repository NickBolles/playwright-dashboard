import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Import after mocking
import { loadConfig, initializeConfig } from '@shared/config';

describe('Configuration Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any cached config
    vi.resetModules();
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

      // Mock file system
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = loadConfig();

      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.s3.bucket).toBe('test-bucket');
      expect(config.orchestrator.port).toBe(3001);
      expect(config.environments).toHaveLength(1);
      expect(config.schedules).toHaveLength(1);
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

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = loadConfig();

      expect(config.database.host).toBe('override-host');
      expect(config.database.port).toBe(5433);
      expect(config.orchestrator.port).toBe(3002);
      expect(config.s3.bucket).toBe('override-bucket');

      // Clean up
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.ORCHESTRATOR_PORT;
      delete process.env.S3_BUCKET;
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

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config = loadConfig();

      expect(config.database.host).toBe('dbhost');
      expect(config.database.port).toBe(5434);
      expect(config.database.database).toBe('dbname');
      expect(config.database.username).toBe('dbuser');
      expect(config.database.password).toBe('dbpass');
      expect(config.database.ssl).toBe(true);

      // Clean up
      delete process.env.DATABASE_URL;
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig = {
        database: {
          // Missing required password field
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should throw error when config file not found', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => loadConfig()).toThrow(/Configuration file not found/);
    });

    it('should throw error for invalid JSON', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json {');

      expect(() => loadConfig()).toThrow(/Failed to load configuration file/);
    });
  });

  describe('Configuration validation', () => {
    it('should validate database configuration', () => {
      const configWithInvalidDb = {
        database: {
          host: 'localhost',
          port: 'invalid-port', // Should be number
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
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

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithInvalidDb));

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should validate environment configuration', () => {
      const configWithInvalidEnv = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          username: 'test_user',
          password: 'test_pass',
        },
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
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
        environments: [
          {
            name: 'staging',
            base_url: 'invalid-url', // Should be valid URL
            concurrency_limit: 3,
          },
        ],
        schedules: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithInvalidEnv));

      expect(() => loadConfig()).toThrow(/Configuration validation failed/);
    });

    it('should apply default values', () => {
      const minimalConfig = {
        database: {
          password: 'test_pass',
        },
        s3: {
          bucket: 'test-bucket',
          access_key_id: 'test-key',
          secret_access_key: 'test-secret',
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(minimalConfig));

      const config = loadConfig();

      // Check default values are applied
      expect(config.database.host).toBe('localhost');
      expect(config.database.port).toBe(5432);
      expect(config.database.database).toBe('playwright_orchestrator');
      expect(config.orchestrator.port).toBe(3001);
      expect(config.job_runner.max_concurrent_jobs).toBe(3);
      expect(config.environments).toEqual([]);
      expect(config.schedules).toEqual([]);
    });
  });
});

