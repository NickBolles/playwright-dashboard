// Shared types for the Playwright Orchestrator system

export type RunStatus =
  | 'queued'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'error'
  | 'cancelled';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TriggerType = 'manual' | 'schedule' | 'webhook' | 'api';

export interface Environment {
  id: string;
  name: string;
  base_url: string;
  concurrency_limit: number;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  id: string;
  name: string;
  cron_string: string;
  environment_id: string;
  is_enabled: boolean;
  test_command: string;
  custom_config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Run {
  id: string;
  environment_id: string;
  schedule_id?: string;
  status: RunStatus;
  start_time?: Date;
  end_time?: Date;
  duration_ms?: number;
  error_log?: string;
  trace_url?: string;
  custom_config: Record<string, any>;
  test_command: string;
  triggered_by: TriggerType;
  created_at: Date;
  updated_at: Date;
}

export interface JobQueueItem {
  id: string;
  run_id: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  locked_at?: Date;
  locked_by?: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

// Extended types with relations
export interface RunWithEnvironment extends Run {
  environment: Environment;
  schedule?: Schedule;
}

export interface ScheduleWithEnvironment extends Schedule {
  environment: Environment;
}

// API request/response types
export interface CreateRunRequest {
  environment_id: string;
  custom_config?: Record<string, any>;
  test_command?: string;
  triggered_by?: TriggerType;
}

export interface CreateRunResponse {
  run: Run;
  message: string;
}

export interface ListRunsQuery {
  environment_id?: string;
  status?: RunStatus;
  limit?: number;
  offset?: number;
  sort?: 'created_at' | 'duration_ms' | 'status';
  order?: 'asc' | 'desc';
}

export interface ListRunsResponse {
  runs: RunWithEnvironment[];
  total: number;
  limit: number;
  offset: number;
}

export interface WebhookPayload {
  repository?: {
    name: string;
    full_name: string;
  };
  pull_request?: {
    number: number;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
  };
  deployment?: {
    environment: string;
    payload: {
      web_url?: string;
    };
  };
  custom_config?: Record<string, any>;
}

// Configuration types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max_connections?: number;
}

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  force_path_style?: boolean;
}

export interface OrchestratorConfig {
  port: number;
  cors_origins: string[];
  rate_limit: {
    window_ms: number;
    max_requests: number;
  };
  job_polling: {
    interval_ms: number;
    batch_size: number;
  };
}

export interface JobRunnerConfig {
  worker_id: string;
  polling_interval_ms: number;
  max_concurrent_jobs: number;
  playwright_config_path?: string;
  test_timeout_ms: number;
}

export interface AppConfig {
  database: DatabaseConfig;
  s3: S3Config;
  orchestrator: OrchestratorConfig;
  job_runner: JobRunnerConfig;
  environments: Environment[];
  schedules: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>[];
}

// Error types
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class RateLimitError extends OrchestratorError {
  constructor(environment: string, limit: number) {
    super(
      `Rate limit exceeded for environment '${environment}'. Maximum concurrent runs: ${limit}`,
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }
}

export class ValidationError extends OrchestratorError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends OrchestratorError {
  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' not found`, 'NOT_FOUND', 404);
  }
}
