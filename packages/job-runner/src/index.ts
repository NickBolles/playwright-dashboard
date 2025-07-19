import { loadConfig, logger } from '@playwright-orchestrator/shared';
import { JobWorker } from './workers/jobWorker';

class JobRunnerService {
  private worker: JobWorker;

  constructor() {
    this.worker = new JobWorker();
  }

  public async start(): Promise<void> {
    try {
      // Load configuration
      const config = loadConfig();

      logger.info('Starting Job Runner Service', {
        workerId: config.job_runner.worker_id,
        pollingInterval: config.job_runner.polling_interval_ms,
        maxConcurrentJobs: config.job_runner.max_concurrent_jobs,
        testTimeout: config.job_runner.test_timeout_ms,
      });

      // Start the worker
      await this.worker.start();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info('Job Runner Service started successfully');
    } catch (error) {
      logger.error('Failed to start Job Runner Service', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        await this.worker.stop();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new JobRunnerService();
  service.start().catch(error => {
    logger.error('Failed to start Job Runner Service', error);
    process.exit(1);
  });
}

export { JobRunnerService };
