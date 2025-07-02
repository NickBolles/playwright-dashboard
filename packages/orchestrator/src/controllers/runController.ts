import { v4 as uuidv4 } from 'uuid';
import { 
  getDatabase, 
  logger, 
  Run, 
  RunWithEnvironment,
  CreateRunRequest,
  ListRunsQuery,
  ListRunsResponse,
  RunStatus,
  TriggerType,
  NotFoundError,
  ValidationError 
} from '@playwright-orchestrator/shared';
import { JobQueueService } from '../services/jobQueue';
import { RateLimiterService } from '../services/rateLimiter';

export class RunController {
  private db = getDatabase();
  private jobQueue = new JobQueueService();
  private rateLimiter = new RateLimiterService();

  /**
   * Create a new test run
   */
  public async createRun(request: CreateRunRequest): Promise<Run> {
    try {
      // Validate environment exists
      const environmentResult = await this.db.query(
        'SELECT id, name FROM environments WHERE id = $1',
        [request.environment_id]
      );

      if (environmentResult.rows.length === 0) {
        throw new NotFoundError('Environment', request.environment_id);
      }

      const environment = environmentResult.rows[0];

      // Note: We don't enforce rate limits here - jobs will be queued regardless
      // The job runner will respect rate limits when processing jobs
      logger.info('Creating new run', {
        environmentId: request.environment_id,
        environmentName: environment.name,
        triggeredBy: request.triggered_by || 'manual',
      });

      const runId = uuidv4();
      const run = await this.db.transaction(async (client) => {
        // Create the run
        const runResult = await client.query<Run>(
          `INSERT INTO runs (
            id, environment_id, status, custom_config, 
            test_command, triggered_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING *`,
          [
            runId,
            request.environment_id,
            'queued',
            JSON.stringify(request.custom_config || {}),
            request.test_command || 'npx playwright test',
            request.triggered_by || 'manual',
          ]
        );

        const newRun = runResult.rows[0];

        // Add job to queue
        await this.jobQueue.enqueueJob(runId);

        return newRun;
      });

      logger.info('Run created successfully', {
        runId: run.id,
        environmentId: request.environment_id,
        environmentName: environment.name,
      });

      return run;
    } catch (error) {
      logger.error('Failed to create run', { request, error });
      throw error;
    }
  }

  /**
   * Get a run by ID with environment information
   */
  public async getRunById(runId: string): Promise<RunWithEnvironment> {
    try {
      const result = await this.db.query<RunWithEnvironment & {
        environment_name: string;
        environment_base_url: string;
        environment_concurrency_limit: number;
        environment_created_at: Date;
        environment_updated_at: Date;
        schedule_name?: string;
        schedule_cron_string?: string;
      }>(
        `SELECT 
           r.*,
           e.name as environment_name,
           e.base_url as environment_base_url,
           e.concurrency_limit as environment_concurrency_limit,
           e.created_at as environment_created_at,
           e.updated_at as environment_updated_at,
           s.name as schedule_name,
           s.cron_string as schedule_cron_string
         FROM runs r
         JOIN environments e ON r.environment_id = e.id
         LEFT JOIN schedules s ON r.schedule_id = s.id
         WHERE r.id = $1`,
        [runId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Run', runId);
      }

      const row = result.rows[0];
      return {
        id: row.id,
        environment_id: row.environment_id,
        schedule_id: row.schedule_id,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: row.duration_ms,
        error_log: row.error_log,
        trace_url: row.trace_url,
        custom_config: row.custom_config,
        test_command: row.test_command,
        triggered_by: row.triggered_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        environment: {
          id: row.environment_id,
          name: row.environment_name,
          base_url: row.environment_base_url,
          concurrency_limit: row.environment_concurrency_limit,
          created_at: row.environment_created_at,
          updated_at: row.environment_updated_at,
        },
        schedule: row.schedule_name ? {
          id: row.schedule_id!,
          name: row.schedule_name,
          cron_string: row.schedule_cron_string!,
          environment_id: row.environment_id,
          is_enabled: true, // We'll assume it's enabled if it exists
          test_command: row.test_command,
          custom_config: {},
          created_at: row.created_at,
          updated_at: row.updated_at,
        } : undefined,
      };
    } catch (error) {
      logger.error('Failed to get run by ID', { runId, error });
      throw error;
    }
  }

  /**
   * List runs with filtering and pagination
   */
  public async listRuns(query: ListRunsQuery): Promise<ListRunsResponse> {
    try {
      const {
        environment_id,
        status,
        limit = 50,
        offset = 0,
        sort = 'created_at',
        order = 'desc',
      } = query;

      // Build WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (environment_id) {
        whereConditions.push(`r.environment_id = $${paramIndex}`);
        queryParams.push(environment_id);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`r.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validate sort column
      const validSortColumns = ['created_at', 'duration_ms', 'status'];
      const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count 
         FROM runs r 
         JOIN environments e ON r.environment_id = e.id 
         ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get runs with pagination
      const runsResult = await this.db.query<RunWithEnvironment & {
        environment_name: string;
        environment_base_url: string;
        environment_concurrency_limit: number;
        environment_created_at: Date;
        environment_updated_at: Date;
      }>(
        `SELECT 
           r.*,
           e.name as environment_name,
           e.base_url as environment_base_url,
           e.concurrency_limit as environment_concurrency_limit,
           e.created_at as environment_created_at,
           e.updated_at as environment_updated_at
         FROM runs r
         JOIN environments e ON r.environment_id = e.id
         ${whereClause}
         ORDER BY r.${sortColumn} ${sortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      const runs: RunWithEnvironment[] = runsResult.rows.map(row => ({
        id: row.id,
        environment_id: row.environment_id,
        schedule_id: row.schedule_id,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: row.duration_ms,
        error_log: row.error_log,
        trace_url: row.trace_url,
        custom_config: row.custom_config,
        test_command: row.test_command,
        triggered_by: row.triggered_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        environment: {
          id: row.environment_id,
          name: row.environment_name,
          base_url: row.environment_base_url,
          concurrency_limit: row.environment_concurrency_limit,
          created_at: row.environment_created_at,
          updated_at: row.environment_updated_at,
        },
      }));

      return {
        runs,
        total,
        limit,
        offset,
      };
    } catch (error) {
      logger.error('Failed to list runs', { query, error });
      throw error;
    }
  }

  /**
   * Update run status (used by job runners)
   */
  public async updateRunStatus(
    runId: string,
    status: RunStatus,
    updates: {
      start_time?: Date;
      end_time?: Date;
      duration_ms?: number;
      error_log?: string;
      trace_url?: string;
    } = {}
  ): Promise<Run> {
    try {
      const updateFields: string[] = ['status = $2', 'updated_at = NOW()'];
      const queryParams: any[] = [runId, status];
      let paramIndex = 3;

      if (updates.start_time) {
        updateFields.push(`start_time = $${paramIndex}`);
        queryParams.push(updates.start_time);
        paramIndex++;
      }

      if (updates.end_time) {
        updateFields.push(`end_time = $${paramIndex}`);
        queryParams.push(updates.end_time);
        paramIndex++;
      }

      if (updates.duration_ms !== undefined) {
        updateFields.push(`duration_ms = $${paramIndex}`);
        queryParams.push(updates.duration_ms);
        paramIndex++;
      }

      if (updates.error_log) {
        updateFields.push(`error_log = $${paramIndex}`);
        queryParams.push(updates.error_log);
        paramIndex++;
      }

      if (updates.trace_url) {
        updateFields.push(`trace_url = $${paramIndex}`);
        queryParams.push(updates.trace_url);
        paramIndex++;
      }

      const result = await this.db.query<Run>(
        `UPDATE runs SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
        queryParams
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Run', runId);
      }

      const updatedRun = result.rows[0];
      logger.info('Run status updated', {
        runId,
        status,
        updates,
      });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to update run status', { runId, status, updates, error });
      throw error;
    }
  }

  /**
   * Cancel a run (if it's still queued)
   */
  public async cancelRun(runId: string): Promise<Run> {
    try {
      const run = await this.getRunById(runId);
      
      if (run.status !== 'queued') {
        throw new ValidationError(`Cannot cancel run with status '${run.status}'`);
      }

      const updatedRun = await this.updateRunStatus(runId, 'cancelled');
      
      logger.info('Run cancelled', { runId });
      return updatedRun;
    } catch (error) {
      logger.error('Failed to cancel run', { runId, error });
      throw error;
    }
  }

  /**
   * Get run statistics
   */
  public async getRunStats(environmentId?: string): Promise<{
    total: number;
    queued: number;
    in_progress: number;
    success: number;
    failed: number;
    error: number;
    cancelled: number;
    success_rate: number;
    average_duration_ms: number;
  }> {
    try {
      const whereClause = environmentId ? 'WHERE environment_id = $1' : '';
      const queryParams = environmentId ? [environmentId] : [];

      const result = await this.db.query<{
        status: RunStatus;
        count: string;
        avg_duration: string;
      }>(
        `SELECT 
           status,
           COUNT(*) as count,
           AVG(duration_ms) as avg_duration
         FROM runs 
         ${whereClause}
         GROUP BY status`,
        queryParams
      );

      const stats = {
        total: 0,
        queued: 0,
        in_progress: 0,
        success: 0,
        failed: 0,
        error: 0,
        cancelled: 0,
        success_rate: 0,
        average_duration_ms: 0,
      };

      let totalDuration = 0;
      let completedRuns = 0;

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats[row.status as keyof typeof stats] = count;
        stats.total += count;

        if (row.status === 'success' || row.status === 'failed') {
          completedRuns += count;
          if (row.avg_duration) {
            totalDuration += parseFloat(row.avg_duration) * count;
          }
        }
      });

      if (completedRuns > 0) {
        stats.success_rate = (stats.success / completedRuns) * 100;
        stats.average_duration_ms = totalDuration / completedRuns;
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get run stats', { environmentId, error });
      throw error;
    }
  }
}

