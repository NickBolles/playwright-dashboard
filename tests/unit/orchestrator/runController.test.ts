import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { RunController } from '@orchestrator/controllers/runController';

// Mock the shared module
vi.mock('@playwright-orchestrator/shared', () => ({
  getDatabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  NotFoundError: class NotFoundError extends Error {
    constructor(resource: string, id: string) {
      super(`${resource} with id ${id} not found`);
      this.name = 'NotFoundError';
    }
  },
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
}));

describe('RunController', () => {
  let runController: RunController;
  let mockDb: any;
  let mockJobQueue: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn(),
    };

    // Mock the database getter
    const { getDatabase } = await import('@playwright-orchestrator/shared');
    (getDatabase as Mock).mockReturnValue(mockDb);

    // Create controller instance
    runController = new RunController();

    // Mock job queue and rate limiter
    mockJobQueue = {
      enqueueJob: vi.fn(),
    };

    mockRateLimiter = {
      canStartRun: vi.fn(),
      getEnvironmentInfo: vi.fn(),
    };

    // Replace the services in the controller
    (runController as any).jobQueue = mockJobQueue;
    (runController as any).rateLimiter = mockRateLimiter;
  });

  describe('createRun', () => {
    it('should create a new run successfully', async () => {
      const mockEnvironment = {
        id: 'env-123',
        name: 'test-env',
      };

      const mockRun = {
        id: 'run-123',
        environment_id: 'env-123',
        status: 'queued',
        custom_config: {},
        test_command: 'npx playwright test',
        triggered_by: 'manual',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Mock environment lookup
      mockDb.query.mockResolvedValueOnce({
        rows: [mockEnvironment],
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        // Mock run creation
        mockDb.query.mockResolvedValueOnce({
          rows: [mockRun],
        });

        return callback(mockDb);
      });

      // Mock job queue
      mockJobQueue.enqueueJob.mockResolvedValueOnce({
        id: 'job-123',
        run_id: 'run-123',
      });

      const request = {
        environment_id: 'env-123',
        custom_config: { BASE_URL: 'https://example.com' },
        test_command: 'npx playwright test',
        triggered_by: 'manual' as const,
      };

      const result = await runController.createRun(request);

      expect(result).toEqual(mockRun);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT id, name FROM environments WHERE id = $1',
        ['env-123']
      );
      expect(mockJobQueue.enqueueJob).toHaveBeenCalledWith('run-123');
    });

    it('should throw NotFoundError for invalid environment', async () => {
      // Mock environment not found
      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const request = {
        environment_id: 'invalid-env',
        triggered_by: 'manual' as const,
      };

      await expect(runController.createRun(request)).rejects.toThrow('Environment with id invalid-env not found');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValueOnce(dbError);

      const request = {
        environment_id: 'env-123',
        triggered_by: 'manual' as const,
      };

      await expect(runController.createRun(request)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getRunById', () => {
    it('should return run with environment information', async () => {
      const mockRunWithEnv = {
        id: 'run-123',
        environment_id: 'env-123',
        status: 'success',
        environment_name: 'test-env',
        environment_base_url: 'https://example.com',
        environment_concurrency_limit: 3,
        environment_created_at: new Date(),
        environment_updated_at: new Date(),
        schedule_name: null,
        schedule_cron_string: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockRunWithEnv],
      });

      const result = await runController.getRunById('run-123');

      expect(result.id).toBe('run-123');
      expect(result.environment.name).toBe('test-env');
      expect(result.environment.base_url).toBe('https://example.com');
      expect(result.schedule).toBeUndefined();
    });

    it('should throw NotFoundError for invalid run ID', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(runController.getRunById('invalid-run')).rejects.toThrow('Run with id invalid-run not found');
    });
  });

  describe('listRuns', () => {
    it('should return paginated runs list', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          environment_id: 'env-123',
          status: 'success',
          environment_name: 'test-env',
          environment_base_url: 'https://example.com',
          environment_concurrency_limit: 3,
          environment_created_at: new Date(),
          environment_updated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'run-2',
          environment_id: 'env-123',
          status: 'failed',
          environment_name: 'test-env',
          environment_base_url: 'https://example.com',
          environment_concurrency_limit: 3,
          environment_created_at: new Date(),
          environment_updated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Mock count query
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '2' }],
      });

      // Mock runs query
      mockDb.query.mockResolvedValueOnce({
        rows: mockRuns,
      });

      const query = {
        environment_id: 'env-123',
        limit: 10,
        offset: 0,
      };

      const result = await runController.listRuns(query);

      expect(result.total).toBe(2);
      expect(result.runs).toHaveLength(2);
      expect(result.runs[0].id).toBe('run-1');
      expect(result.runs[1].id).toBe('run-2');
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should handle filtering by status', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'run-1',
          environment_id: 'env-123',
          status: 'success',
          environment_name: 'test-env',
          environment_base_url: 'https://example.com',
          environment_concurrency_limit: 3,
          environment_created_at: new Date(),
          environment_updated_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const query = {
        status: 'success' as const,
        limit: 10,
        offset: 0,
      };

      const result = await runController.listRuns(query);

      expect(result.total).toBe(1);
      expect(result.runs[0].status).toBe('success');
    });
  });

  describe('updateRunStatus', () => {
    it('should update run status successfully', async () => {
      const mockUpdatedRun = {
        id: 'run-123',
        status: 'in_progress',
        start_time: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockUpdatedRun],
      });

      const result = await runController.updateRunStatus('run-123', 'in_progress', {
        start_time: new Date(),
      });

      expect(result.status).toBe('in_progress');
      expect(result.start_time).toBeDefined();
    });

    it('should throw NotFoundError for invalid run ID', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(
        runController.updateRunStatus('invalid-run', 'in_progress')
      ).rejects.toThrow('Run with id invalid-run not found');
    });
  });

  describe('cancelRun', () => {
    it('should cancel a queued run', async () => {
      const mockQueuedRun = {
        id: 'run-123',
        status: 'queued',
        environment: {
          id: 'env-123',
          name: 'test-env',
          base_url: 'https://example.com',
          concurrency_limit: 3,
          created_at: new Date(),
          updated_at: new Date(),
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockCancelledRun = {
        ...mockQueuedRun,
        status: 'cancelled',
      };

      // Mock getRunById
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          ...mockQueuedRun,
          environment_name: 'test-env',
          environment_base_url: 'https://example.com',
          environment_concurrency_limit: 3,
          environment_created_at: new Date(),
          environment_updated_at: new Date(),
        }],
      });

      // Mock updateRunStatus
      mockDb.query.mockResolvedValueOnce({
        rows: [mockCancelledRun],
      });

      const result = await runController.cancelRun('run-123');

      expect(result.status).toBe('cancelled');
    });

    it('should throw ValidationError for non-queued run', async () => {
      const mockInProgressRun = {
        id: 'run-123',
        status: 'in_progress',
        environment_name: 'test-env',
        environment_base_url: 'https://example.com',
        environment_concurrency_limit: 3,
        environment_created_at: new Date(),
        environment_updated_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [mockInProgressRun],
      });

      await expect(runController.cancelRun('run-123')).rejects.toThrow("Cannot cancel run with status 'in_progress'");
    });
  });

  describe('getRunStats', () => {
    it('should return run statistics', async () => {
      const mockStats = [
        { status: 'success', count: '5', avg_duration: '10000' },
        { status: 'failed', count: '2', avg_duration: '8000' },
        { status: 'queued', count: '1', avg_duration: null },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockStats,
      });

      const result = await runController.getRunStats();

      expect(result.total).toBe(8);
      expect(result.success).toBe(5);
      expect(result.failed).toBe(2);
      expect(result.queued).toBe(1);
      expect(result.success_rate).toBeCloseTo(71.43, 2);
      expect(result.average_duration_ms).toBeCloseTo(9428.57, 2);
    });

    it('should handle environment-specific stats', async () => {
      const mockStats = [
        { status: 'success', count: '3', avg_duration: '12000' },
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockStats,
      });

      const result = await runController.getRunStats('env-123');

      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.success_rate).toBe(100);
      expect(result.average_duration_ms).toBe(12000);
    });
  });
});

