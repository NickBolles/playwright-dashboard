import { 
  getDatabase, 
  logger, 
  getConfig,
  Run,
  JobQueueItem,
  RunWithEnvironment 
} from '@playwright-orchestrator/shared';
import { PlaywrightRunner } from '../services/playwrightRunner';
import { S3Service } from '../services/s3Service';

export class JobWorker {
  private db = getDatabase();
  private config = getConfig();
  private playwrightRunner: PlaywrightRunner;
  private s3Service: S3Service;
  private workerId: string;
  private isRunning = false;
  private pollingInterval?: NodeJS.Timeout;

  constructor() {
    this.workerId = this.config.job_runner.worker_id;
    this.playwrightRunner = new PlaywrightRunner(this.config.job_runner);
    this.s3Service = new S3Service(this.config.s3);
  }

  /**
   * Start the job worker
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Job worker is already running', { workerId: this.workerId });
      return;
    }

    try {
      logger.info('Starting job worker', { workerId: this.workerId });

      // Validate dependencies
      await this.validateDependencies();

      // Start polling for jobs
      this.isRunning = true;
      this.startPolling();

      logger.info('Job worker started successfully', { 
        workerId: this.workerId,
        pollingInterval: this.config.job_runner.polling_interval_ms,
        maxConcurrentJobs: this.config.job_runner.max_concurrent_jobs,
      });
    } catch (error) {
      logger.error('Failed to start job worker', { workerId: this.workerId, error });
      throw error;
    }
  }

  /**
   * Stop the job worker
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Job worker is not running', { workerId: this.workerId });
      return;
    }

    logger.info('Stopping job worker', { workerId: this.workerId });

    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    // Close database connections
    await this.db.close();

    logger.info('Job worker stopped', { workerId: this.workerId });
  }

  /**
   * Validate required dependencies
   */
  private async validateDependencies(): Promise<void> {
    // Test database connection
    const dbConnected = await this.db.testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Test S3 connection
    const s3Connected = await this.s3Service.testConnection();
    if (!s3Connected) {
      throw new Error('S3 connection failed');
    }

    // Validate Playwright installation
    const playwrightValid = await this.playwrightRunner.validatePlaywrightInstallation();
    if (!playwrightValid) {
      logger.warn('Playwright not found, attempting to install browsers');
      const browsersInstalled = await this.playwrightRunner.installBrowsers();
      if (!browsersInstalled) {
        throw new Error('Failed to install Playwright browsers');
      }
    }

    logger.info('All dependencies validated', { workerId: this.workerId });
  }

  /**
   * Start polling for jobs
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForJobs();
      } catch (error) {
        logger.error('Error during job polling', { workerId: this.workerId, error });
      }
    }, this.config.job_runner.polling_interval_ms);
  }

  /**
   * Poll for available jobs and process them
   */
  private async pollForJobs(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Get current running job count for this worker
      const runningJobs = await this.getCurrentRunningJobs();
      const availableSlots = this.config.job_runner.max_concurrent_jobs - runningJobs;

      if (availableSlots <= 0) {
        logger.debug('No available job slots', { 
          workerId: this.workerId,
          runningJobs,
          maxConcurrent: this.config.job_runner.max_concurrent_jobs,
        });
        return;
      }

      // Get next available job
      const job = await this.getNextJob();
      if (!job) {
        logger.debug('No jobs available', { workerId: this.workerId });
        return;
      }

      // Process the job asynchronously
      this.processJob(job).catch(error => {
        logger.error('Error processing job', { 
          workerId: this.workerId,
          jobId: job.id,
          runId: job.run_id,
          error,
        });
      });

    } catch (error) {
      logger.error('Error polling for jobs', { workerId: this.workerId, error });
    }
  }

  /**
   * Get the next available job from the queue
   */
  private async getNextJob(): Promise<JobQueueItem | null> {
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
          [this.workerId, job.id]
        );

        return updateResult.rows[0];
      });

      if (result) {
        logger.info('Job acquired', { 
          workerId: this.workerId,
          jobId: result.id, 
          runId: result.run_id,
          attempts: result.attempts,
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to get next job', { workerId: this.workerId, error });
      return null;
    }
  }

  /**
   * Process a job
   */
  private async processJob(job: JobQueueItem): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing job', { 
        workerId: this.workerId,
        jobId: job.id,
        runId: job.run_id,
      });

      // Get run details
      const run = await this.getRunDetails(job.run_id);
      if (!run) {
        throw new Error(`Run ${job.run_id} not found`);
      }

      // Update run status to in_progress
      await this.updateRunStatus(run.id, 'in_progress', {
        start_time: new Date(),
      });

      // Execute Playwright tests
      const testResult = await this.playwrightRunner.executeTests(run);
      
      // Upload trace file if available
      let traceUrl: string | undefined;
      if (testResult.traceFile) {
        try {
          traceUrl = await this.s3Service.uploadTrace(testResult.traceFile, run.id);
          logger.info('Trace uploaded', { 
            runId: run.id,
            traceFile: testResult.traceFile,
            traceUrl,
          });
        } catch (error) {
          logger.error('Failed to upload trace', { 
            runId: run.id,
            traceFile: testResult.traceFile,
            error,
          });
        }
      }

      // Upload test results if available
      if (testResult.reportDir) {
        try {
          const resultUrls = await this.s3Service.uploadTestResults(testResult.reportDir, run.id);
          logger.info('Test results uploaded', { 
            runId: run.id,
            reportDir: testResult.reportDir,
            uploadedFiles: resultUrls.length,
          });
        } catch (error) {
          logger.error('Failed to upload test results', { 
            runId: run.id,
            reportDir: testResult.reportDir,
            error,
          });
        }
      }

      // Update run status based on test result
      const finalStatus = testResult.success ? 'success' : 'failed';
      await this.updateRunStatus(run.id, finalStatus, {
        end_time: new Date(),
        duration_ms: testResult.duration,
        error_log: testResult.success ? undefined : (testResult.stderr || testResult.error),
        trace_url: traceUrl,
      });

      // Mark job as completed
      await this.completeJob(job.id);

      const totalDuration = Date.now() - startTime;
      logger.info('Job completed successfully', {
        workerId: this.workerId,
        jobId: job.id,
        runId: job.run_id,
        testSuccess: testResult.success,
        testDuration: testResult.duration,
        totalDuration,
        traceUrl,
      });

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      logger.error('Job processing failed', {
        workerId: this.workerId,
        jobId: job.id,
        runId: job.run_id,
        totalDuration,
        error,
      });

      // Update run status to error
      await this.updateRunStatus(job.run_id, 'error', {
        end_time: new Date(),
        duration_ms: totalDuration,
        error_log: error instanceof Error ? error.message : String(error),
      });

      // Mark job as failed
      await this.failJob(job.id, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get run details with environment information
   */
  private async getRunDetails(runId: string): Promise<RunWithEnvironment | null> {
    try {
      const result = await this.db.query<RunWithEnvironment & {
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
         WHERE r.id = $1`,
        [runId]
      );

      if (result.rows.length === 0) {
        return null;
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
      };
    } catch (error) {
      logger.error('Failed to get run details', { runId, error });
      return null;
    }
  }

  /**
   * Update run status
   */
  private async updateRunStatus(
    runId: string,
    status: string,
    updates: {
      start_time?: Date;
      end_time?: Date;
      duration_ms?: number;
      error_log?: string;
      trace_url?: string;
    }
  ): Promise<void> {
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

      await this.db.query(
        `UPDATE runs SET ${updateFields.join(', ')} WHERE id = $1`,
        queryParams
      );

      logger.debug('Run status updated', { runId, status, updates });
    } catch (error) {
      logger.error('Failed to update run status', { runId, status, updates, error });
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  private async completeJob(jobId: string): Promise<void> {
    try {
      await this.db.query(
        `UPDATE job_queue 
         SET status = 'completed', 
             locked_at = NULL, 
             locked_by = NULL,
             updated_at = NOW()
         WHERE id = $1 AND locked_by = $2`,
        [jobId, this.workerId]
      );

      logger.debug('Job marked as completed', { jobId, workerId: this.workerId });
    } catch (error) {
      logger.error('Failed to complete job', { jobId, workerId: this.workerId, error });
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    try {
      await this.db.transaction(async (client) => {
        // Get the current job to check attempts
        const jobResult = await client.query<JobQueueItem>(
          'SELECT * FROM job_queue WHERE id = $1 AND locked_by = $2',
          [jobId, this.workerId]
        );

        if (jobResult.rows.length === 0) {
          throw new Error(`Job ${jobId} not found or not locked by worker ${this.workerId}`);
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
            [jobId, this.workerId, errorMessage]
          );

          logger.warn('Job failed, will retry', { 
            jobId, 
            workerId: this.workerId,
            attempts: job.attempts, 
            maxAttempts: job.max_attempts,
            error: errorMessage,
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
            [jobId, this.workerId, errorMessage]
          );

          logger.error('Job permanently failed', { 
            jobId, 
            workerId: this.workerId,
            attempts: job.attempts, 
            error: errorMessage,
          });
        }
      });
    } catch (error) {
      logger.error('Failed to fail job', { jobId, workerId: this.workerId, error });
      throw error;
    }
  }

  /**
   * Get current running jobs count for this worker
   */
  private async getCurrentRunningJobs(): Promise<number> {
    try {
      const result = await this.db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM job_queue WHERE locked_by = $1 AND status = $2',
        [this.workerId, 'processing']
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to get current running jobs', { workerId: this.workerId, error });
      return 0;
    }
  }
}

