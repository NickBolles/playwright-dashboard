import { 
  getDatabase, 
  logger, 
  Environment,
  RateLimitError 
} from '@playwright-orchestrator/shared';

export class RateLimiterService {
  private db = getDatabase();

  /**
   * Check if a new run can be started for the given environment
   * Returns true if under the concurrency limit, false otherwise
   */
  public async canStartRun(environmentId: string): Promise<boolean> {
    try {
      const result = await this.db.query<{
        concurrency_limit: number;
        current_running: string;
      }>(
        `SELECT 
           e.concurrency_limit,
           COUNT(r.id) as current_running
         FROM environments e
         LEFT JOIN runs r ON e.id = r.environment_id 
           AND r.status IN ('queued', 'in_progress')
         WHERE e.id = $1
         GROUP BY e.id, e.concurrency_limit`,
        [environmentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Environment ${environmentId} not found`);
      }

      const { concurrency_limit, current_running } = result.rows[0];
      const currentCount = parseInt(current_running);
      const canStart = currentCount < concurrency_limit;

      logger.debug('Rate limit check', {
        environmentId,
        concurrencyLimit: concurrency_limit,
        currentRunning: currentCount,
        canStart,
      });

      return canStart;
    } catch (error) {
      logger.error('Failed to check rate limit', { environmentId, error });
      throw error;
    }
  }

  /**
   * Get current running counts for all environments
   */
  public async getCurrentCounts(): Promise<Array<{
    environment_id: string;
    environment_name: string;
    concurrency_limit: number;
    current_running: number;
    available_slots: number;
  }>> {
    try {
      const result = await this.db.query<{
        environment_id: string;
        environment_name: string;
        concurrency_limit: number;
        current_running: string;
      }>(
        `SELECT 
           e.id as environment_id,
           e.name as environment_name,
           e.concurrency_limit,
           COUNT(r.id) as current_running
         FROM environments e
         LEFT JOIN runs r ON e.id = r.environment_id 
           AND r.status IN ('queued', 'in_progress')
         GROUP BY e.id, e.name, e.concurrency_limit
         ORDER BY e.name`
      );

      return result.rows.map(row => ({
        environment_id: row.environment_id,
        environment_name: row.environment_name,
        concurrency_limit: row.concurrency_limit,
        current_running: parseInt(row.current_running),
        available_slots: row.concurrency_limit - parseInt(row.current_running),
      }));
    } catch (error) {
      logger.error('Failed to get current counts', error);
      throw error;
    }
  }

  /**
   * Wait for an available slot in the environment
   * This is used by the job queue to respect rate limits
   */
  public async waitForAvailableSlot(
    environmentId: string, 
    maxWaitMs: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    while (Date.now() - startTime < maxWaitMs) {
      const canStart = await this.canStartRun(environmentId);
      if (canStart) {
        return true;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.warn('Timeout waiting for available slot', { 
      environmentId, 
      maxWaitMs,
      actualWaitMs: Date.now() - startTime 
    });
    return false;
  }

  /**
   * Get environment details including rate limit info
   */
  public async getEnvironmentInfo(environmentId: string): Promise<{
    environment: Environment;
    current_running: number;
    available_slots: number;
    queued_jobs: number;
  }> {
    try {
      const result = await this.db.query<{
        id: string;
        name: string;
        base_url: string;
        concurrency_limit: number;
        created_at: Date;
        updated_at: Date;
        current_running: string;
        queued_jobs: string;
      }>(
        `SELECT 
           e.*,
           COUNT(CASE WHEN r.status IN ('queued', 'in_progress') THEN 1 END) as current_running,
           COUNT(CASE WHEN r.status = 'queued' THEN 1 END) as queued_jobs
         FROM environments e
         LEFT JOIN runs r ON e.id = r.environment_id
         WHERE e.id = $1
         GROUP BY e.id`,
        [environmentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Environment ${environmentId} not found`);
      }

      const row = result.rows[0];
      const currentRunning = parseInt(row.current_running);
      
      return {
        environment: {
          id: row.id,
          name: row.name,
          base_url: row.base_url,
          concurrency_limit: row.concurrency_limit,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        current_running: currentRunning,
        available_slots: row.concurrency_limit - currentRunning,
        queued_jobs: parseInt(row.queued_jobs),
      };
    } catch (error) {
      logger.error('Failed to get environment info', { environmentId, error });
      throw error;
    }
  }

  /**
   * Update environment concurrency limit
   */
  public async updateConcurrencyLimit(
    environmentId: string, 
    newLimit: number
  ): Promise<Environment> {
    try {
      if (newLimit < 1) {
        throw new Error('Concurrency limit must be at least 1');
      }

      const result = await this.db.query<Environment>(
        `UPDATE environments 
         SET concurrency_limit = $2, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [environmentId, newLimit]
      );

      if (result.rows.length === 0) {
        throw new Error(`Environment ${environmentId} not found`);
      }

      const environment = result.rows[0];
      logger.info('Updated concurrency limit', {
        environmentId,
        environmentName: environment.name,
        oldLimit: 'unknown', // We don't have the old value
        newLimit,
      });

      return environment;
    } catch (error) {
      logger.error('Failed to update concurrency limit', { 
        environmentId, 
        newLimit, 
        error 
      });
      throw error;
    }
  }

  /**
   * Check and enforce rate limits before creating a run
   * Throws RateLimitError if limit would be exceeded
   */
  public async enforceRateLimit(environmentId: string): Promise<void> {
    const canStart = await this.canStartRun(environmentId);
    
    if (!canStart) {
      const envInfo = await this.getEnvironmentInfo(environmentId);
      throw new RateLimitError(
        envInfo.environment.name, 
        envInfo.environment.concurrency_limit
      );
    }
  }
}

