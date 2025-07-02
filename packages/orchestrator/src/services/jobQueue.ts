import { v4 as uuidv4 } from 'uuid';
import { 
  getDatabase, 
  logger, 
  Run, 
  JobQueueItem, 
  JobStatus,
  RunStatus 
} from '@playwright-orchestrator/shared';

export class JobQueueService {
  private db = getDatabase();

  /**
   * Add a new job to the queue for a run
   */
  public async enqueueJob(runId: string, priority: number = 0): Promise<JobQueueItem> {
    try {
      const result = await this.db.query<JobQueueItem>(
        `INSERT INTO job_queue (id, run_id, status, priority, attempts, max_attempts)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [uuidv4(), runId, 'pending', priority, 0, 3]
      );

      const job = result.rows[0];
      logger.info('Job enqueued', { jobId: job.id, runId, priority });
      return job;
    } catch (error) {
      logger.error('Failed to enqueue job', { runId, error });
      throw error;
    }
  }

  /**
   * Get the next available job from the queue
   * This method implements job locking to prevent multiple workers from processing the same job
   */
  public async getNextJob(workerId: string): Promise<JobQueueItem | null> {
    try {
      const result = await this.db.transaction(async (client) => {
        // Find the next available job
        const jobResult = await client.query<JobQueueItem>(
          `SELECT * FROM job_queue 
           WHERE status = 'pending' 
           AND attempts < max_attempts
           ORDER BY priority DESC, created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED`
        );

        if (jobResult.rows.length === 0) {
          return null;
        }

        const job = jobResult.rows[0];

        // Lock the job for this worker
        const updateResult = await client.query<JobQueueItem>(
          `UPDATE job_queue 
           SET status = 'processing', 
               locked_at = NOW(), 
               locked_by = $1,
               attempts = attempts + 1,
               updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [workerId, job.id]
        );

        return updateResult.rows[0];
      });

      if (result) {
        logger.info('Job locked for processing', { 
          jobId: result.id, 
          runId: result.run_id, 
          workerId,
          attempts: result.attempts 
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to get next job', { workerId, error });
      throw error;
    }
  }

  /**
   * Mark a job as completed successfully
   */
  public async completeJob(jobId: string, workerId: string): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // Update job status
        await client.query(
          `UPDATE job_queue 
           SET status = 'completed', 
               locked_at = NULL, 
               locked_by = NULL,
               updated_at = NOW()
           WHERE id = $1 AND locked_by = $2`,
          [jobId, workerId]
        );

        // Update run status to success
        await client.query(
          `UPDATE runs 
           SET status = 'success', 
               end_time = NOW(),
               duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
               updated_at = NOW()
           WHERE id = (SELECT run_id FROM job_queue WHERE id = $1)`,
          [jobId]
        );
      });

      logger.info('Job completed successfully', { jobId, workerId });
    } catch (error) {
      logger.error('Failed to complete job', { jobId, workerId, error });
      throw error;
    }
  }

  /**
   * Mark a job as failed
   */
  public async failJob(
    jobId: string, 
    workerId: string, 
    errorMessage: string
  ): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // Get the current job to check attempts
        const jobResult = await client.query<JobQueueItem>(
          'SELECT * FROM job_queue WHERE id = $1 AND locked_by = $2',
          [jobId, workerId]
        );

        if (jobResult.rows.length === 0) {
          throw new Error(`Job ${jobId} not found or not locked by worker ${workerId}`);
        }

        const job = jobResult.rows[0];
        const shouldRetry = job.attempts < job.max_attempts;

        if (shouldRetry) {
          // Reset job for retry
          await client.query(
            `UPDATE job_queue 
             SET status = 'pending', 
                 locked_at = NULL, 
                 locked_by = NULL,
                 error_message = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [jobId, workerId, errorMessage]
          );

          logger.warn('Job failed, will retry', { 
            jobId, 
            workerId, 
            attempts: job.attempts, 
            maxAttempts: job.max_attempts,
            error: errorMessage 
          });
        } else {
          // Mark job as permanently failed
          await client.query(
            `UPDATE job_queue 
             SET status = 'failed', 
                 locked_at = NULL, 
                 locked_by = NULL,
                 error_message = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [jobId, workerId, errorMessage]
          );

          // Update run status to failed
          await client.query(
            `UPDATE runs 
             SET status = 'failed', 
                 end_time = NOW(),
                 duration_ms = EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
                 error_log = $2,
                 updated_at = NOW()
             WHERE id = (SELECT run_id FROM job_queue WHERE id = $1)`,
            [jobId, errorMessage]
          );

          logger.error('Job permanently failed', { 
            jobId, 
            workerId, 
            attempts: job.attempts, 
            error: errorMessage 
          });
        }
      });
    } catch (error) {
      logger.error('Failed to fail job', { jobId, workerId, error });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const result = await this.db.query<{
        status: JobStatus;
        count: string;
      }>(
        `SELECT status, COUNT(*) as count 
         FROM job_queue 
         GROUP BY status`
      );

      const stats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats[row.status as keyof typeof stats] = count;
        stats.total += count;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get queue stats', error);
      throw error;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  public async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM job_queue 
         WHERE status IN ('completed', 'failed') 
         AND created_at < NOW() - INTERVAL '${olderThanDays} days'`
      );

      const deletedCount = result.rowCount || 0;
      logger.info('Cleaned up old jobs', { deletedCount, olderThanDays });
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs', error);
      throw error;
    }
  }

  /**
   * Release stuck jobs (jobs that have been processing for too long)
   */
  public async releaseStuckJobs(timeoutMinutes: number = 60): Promise<number> {
    try {
      const result = await this.db.query(
        `UPDATE job_queue 
         SET status = 'pending', 
             locked_at = NULL, 
             locked_by = NULL,
             updated_at = NOW()
         WHERE status = 'processing' 
         AND locked_at < NOW() - INTERVAL '${timeoutMinutes} minutes'`
      );

      const releasedCount = result.rowCount || 0;
      if (releasedCount > 0) {
        logger.warn('Released stuck jobs', { releasedCount, timeoutMinutes });
      }
      return releasedCount;
    } catch (error) {
      logger.error('Failed to release stuck jobs', error);
      throw error;
    }
  }
}

