import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Zod schemas for configuration validation
const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().default(5432),
  database: z.string().default('playwright_orchestrator'),
  username: z.string().default('postgres'),
  password: z.string(),
  ssl: z.boolean().default(false),
  max_connections: z.number().default(20),
});

const S3ConfigSchema = z.object({
  endpoint: z.string().optional(),
  region: z.string().default('us-east-1'),
  bucket: z.string(),
  access_key_id: z.string(),
  secret_access_key: z.string(),
  force_path_style: z.boolean().default(false),
});

const OrchestratorConfigSchema = z.object({
  port: z.number().default(3001),
  cors_origins: z.array(z.string()).default(['http://localhost:3000']),
  rate_limit: z.object({
    window_ms: z.number().default(15 * 60 * 1000), // 15 minutes
    max_requests: z.number().default(100),
  }),
  job_polling: z.object({
    interval_ms: z.number().default(5000), // 5 seconds
    batch_size: z.number().default(10),
  }),
});

const JobRunnerConfigSchema = z.object({
  worker_id: z
    .string()
    .default(
      () => `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    ),
  polling_interval_ms: z.number().default(3000), // 3 seconds
  max_concurrent_jobs: z.number().default(3),
  playwright_config_path: z.string().optional(),
  test_timeout_ms: z.number().default(30 * 60 * 1000), // 30 minutes
});

const EnvironmentConfigSchema = z.object({
  name: z.string(),
  base_url: z.string().url(),
  concurrency_limit: z.number().min(1).default(1),
});

const ScheduleConfigSchema = z.object({
  name: z.string(),
  cron_string: z.string(),
  environment_name: z.string(),
  is_enabled: z.boolean().default(true),
  test_command: z.string().default('npx playwright test'),
  custom_config: z.record(z.any()).default({}),
});

const AppConfigSchema = z.object({
  database: DatabaseConfigSchema,
  s3: S3ConfigSchema,
  orchestrator: OrchestratorConfigSchema,
  job_runner: JobRunnerConfigSchema,
  environments: z.array(EnvironmentConfigSchema).default([]),
  schedules: z.array(ScheduleConfigSchema).default([]),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type S3Config = z.infer<typeof S3ConfigSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;
export type JobRunnerConfig = z.infer<typeof JobRunnerConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

class ConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.findConfigFile();
  }

  private findConfigFile(): string {
    const possiblePaths = [
      process.env.CONFIG_PATH,
      path.join(process.cwd(), 'config.json'),
      path.join(process.cwd(), 'config.yaml'),
      path.join(process.cwd(), 'config.yml'),
      path.join(__dirname, '../../../config.json'),
      path.join(__dirname, '../../../config.yaml'),
    ].filter(Boolean) as string[];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    throw new Error(
      `Configuration file not found. Searched paths: ${possiblePaths.join(', ')}`
    );
  }

  private loadConfigFile(): any {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const ext = path.extname(this.configPath).toLowerCase();

      switch (ext) {
        case '.json':
          return JSON.parse(configContent);
        case '.yaml':
        case '.yml':
          // For now, we'll require JSON. YAML support can be added later with js-yaml
          throw new Error(
            'YAML configuration files are not yet supported. Please use JSON.'
          );
        default:
          throw new Error(`Unsupported configuration file format: ${ext}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to load configuration file ${this.configPath}: ${error.message}`
        );
      }
      throw error;
    }
  }

  private applyEnvironmentOverrides(config: any): any {
    const overrides: any = {};

    // Database overrides
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      overrides.database = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1),
        username: url.username,
        password: url.password,
        ssl: url.searchParams.get('sslmode') === 'require',
      };
    } else {
      if (process.env.DB_HOST)
        overrides.database = {
          ...overrides.database,
          host: process.env.DB_HOST,
        };
      if (process.env.DB_PORT)
        overrides.database = {
          ...overrides.database,
          port: parseInt(process.env.DB_PORT),
        };
      if (process.env.DB_NAME)
        overrides.database = {
          ...overrides.database,
          database: process.env.DB_NAME,
        };
      if (process.env.DB_USER)
        overrides.database = {
          ...overrides.database,
          username: process.env.DB_USER,
        };
      if (process.env.DB_PASSWORD)
        overrides.database = {
          ...overrides.database,
          password: process.env.DB_PASSWORD,
        };
      if (process.env.DB_SSL)
        overrides.database = {
          ...overrides.database,
          ssl: process.env.DB_SSL === 'true',
        };
    }

    // S3 overrides
    if (process.env.S3_ENDPOINT)
      overrides.s3 = { ...overrides.s3, endpoint: process.env.S3_ENDPOINT };
    if (process.env.S3_REGION)
      overrides.s3 = { ...overrides.s3, region: process.env.S3_REGION };
    if (process.env.S3_BUCKET)
      overrides.s3 = { ...overrides.s3, bucket: process.env.S3_BUCKET };
    if (process.env.S3_ACCESS_KEY_ID)
      overrides.s3 = {
        ...overrides.s3,
        access_key_id: process.env.S3_ACCESS_KEY_ID,
      };
    if (process.env.S3_SECRET_ACCESS_KEY)
      overrides.s3 = {
        ...overrides.s3,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
      };
    if (process.env.S3_FORCE_PATH_STYLE)
      overrides.s3 = {
        ...overrides.s3,
        force_path_style: process.env.S3_FORCE_PATH_STYLE === 'true',
      };

    // Orchestrator overrides
    if (process.env.ORCHESTRATOR_PORT)
      overrides.orchestrator = {
        ...overrides.orchestrator,
        port: parseInt(process.env.ORCHESTRATOR_PORT),
      };
    if (process.env.CORS_ORIGINS)
      overrides.orchestrator = {
        ...overrides.orchestrator,
        cors_origins: process.env.CORS_ORIGINS.split(','),
      };

    // Job runner overrides
    if (process.env.WORKER_ID)
      overrides.job_runner = {
        ...overrides.job_runner,
        worker_id: process.env.WORKER_ID,
      };
    if (process.env.POLLING_INTERVAL_MS)
      overrides.job_runner = {
        ...overrides.job_runner,
        polling_interval_ms: parseInt(process.env.POLLING_INTERVAL_MS),
      };
    if (process.env.MAX_CONCURRENT_JOBS)
      overrides.job_runner = {
        ...overrides.job_runner,
        max_concurrent_jobs: parseInt(process.env.MAX_CONCURRENT_JOBS),
      };
    if (process.env.PLAYWRIGHT_CONFIG_PATH)
      overrides.job_runner = {
        ...overrides.job_runner,
        playwright_config_path: process.env.PLAYWRIGHT_CONFIG_PATH,
      };

    return this.deepMerge(config, overrides);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  public load(): AppConfig {
    if (this.config) {
      return this.config;
    }

    try {
      // Load configuration file
      let rawConfig = this.loadConfigFile();

      // Apply environment variable overrides
      rawConfig = this.applyEnvironmentOverrides(rawConfig);

      // Validate configuration
      this.config = AppConfigSchema.parse(rawConfig);

      logger.info('Configuration loaded successfully', {
        configPath: this.configPath,
        environments: this.config.environments.length,
        schedules: this.config.schedules.length,
      });

      return this.config;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        );
        throw new Error(
          `Configuration validation failed:\n${errorMessages.join('\n')}`
        );
      }
      throw error;
    }
  }

  public reload(): AppConfig {
    this.config = null;
    return this.load();
  }

  public get(): AppConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }
}

// Global configuration instance
let configManager: ConfigManager | null = null;

export function initializeConfig(configPath?: string): void {
  configManager = new ConfigManager(configPath);
}

export function loadConfig(): AppConfig {
  if (!configManager) {
    configManager = new ConfigManager();
  }
  return configManager.load();
}

export function getConfig(): AppConfig {
  if (!configManager) {
    throw new Error(
      'Configuration not initialized. Call initializeConfig() or loadConfig() first.'
    );
  }
  return configManager.get();
}

export function reloadConfig(): AppConfig {
  if (!configManager) {
    throw new Error(
      'Configuration not initialized. Call initializeConfig() or loadConfig() first.'
    );
  }
  return configManager.reload();
}
