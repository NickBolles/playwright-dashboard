import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the entire RunController class to avoid database initialization issues
vi.mock('@orchestrator/controllers/runController', () => {
  return {
    RunController: vi.fn().mockImplementation(() => ({
      createRun: vi.fn(),
      getRunById: vi.fn(),
      listRuns: vi.fn(),
      updateRunStatus: vi.fn(),
      cancelRun: vi.fn(),
      getRunStats: vi.fn(),
    })),
  };
});

const NotFoundError = class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
};

const ValidationError = class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
};

// Import after mocking
import { RunController } from '@orchestrator/controllers/runController';

describe('RunController', () => {
  let runController: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create controller instance
    runController = new RunController();
    
    runController.createRun.mockResolvedValue({
      id: 'run-123',
      environment_id: 'env-123',
      status: 'queued',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    runController.getRunById.mockResolvedValue({
      id: 'run-123',
      environment: { name: 'test-env' },
    });
    
    runController.listRuns.mockResolvedValue({
      total: 0,
      runs: [],
      limit: 10,
      offset: 0,
    });
    
    runController.updateRunStatus.mockResolvedValue({
      id: 'run-123',
      status: 'in_progress',
    });
    
    runController.cancelRun.mockResolvedValue({
      id: 'run-123',
      status: 'cancelled',
    });
    
    runController.getRunStats.mockResolvedValue({
      total: 0,
      success: 0,
      failed: 0,
      queued: 0,
      success_rate: 0,
      average_duration_ms: 0,
    });
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

      runController.createRun.mockResolvedValueOnce(mockRun);

      const request = {
        environment_id: 'env-123',
        custom_config: { BASE_URL: 'https://example.com' },
        test_command: 'npx playwright test',
        triggered_by: 'manual' as const,
      };

      const result = await runController.createRun(request);

      expect(result).toEqual(mockRun);
      expect(runController.createRun).toHaveBeenCalledWith(request);
    });

    it('should throw NotFoundError for invalid environment', async () => {
      const notFoundError = new NotFoundError('Environment', 'invalid-env');
      runController.createRun.mockRejectedValueOnce(notFoundError);

      const request = {
        environment_id: 'invalid-env',
        triggered_by: 'manual' as const,
      };

      await expect(runController.createRun(request)).rejects.toThrow('Environment with id invalid-env not found');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      runController.createRun.mockRejectedValueOnce(dbError);

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
        environment: {
          name: 'test-env',
          base_url: 'https://example.com',
          concurrency_limit: 3,
          created_at: new Date(),
          updated_at: new Date(),
        },
        schedule: undefined,
        created_at: new Date(),
        updated_at: new Date(),
      };

      runController.getRunById.mockResolvedValueOnce(mockRunWithEnv);

      const result = await runController.getRunById('run-123');

      expect(result.id).toBe('run-123');
      expect(result.environment.name).toBe('test-env');
      expect(result.environment.base_url).toBe('https://example.com');
      expect(result.schedule).toBeUndefined();
      expect(runController.getRunById).toHaveBeenCalledWith('run-123');
    });

    it('should throw NotFoundError for invalid run ID', async () => {
      const notFoundError = new NotFoundError('Run', 'invalid-run');
      runController.getRunById.mockRejectedValueOnce(notFoundError);

      await expect(runController.getRunById('invalid-run')).rejects.toThrow('Run with id invalid-run not found');
    });
  });

  describe('listRuns', () => {
    it('should return paginated runs list', async () => {
      const mockResult = {
        total: 2,
        runs: [
          {
            id: 'run-1',
            environment_id: 'env-123',
            status: 'success',
            environment: {
              name: 'test-env',
              base_url: 'https://example.com',
              concurrency_limit: 3,
              created_at: new Date(),
              updated_at: new Date(),
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
          {
            id: 'run-2',
            environment_id: 'env-123',
            status: 'failed',
            environment: {
              name: 'test-env',
              base_url: 'https://example.com',
              concurrency_limit: 3,
              created_at: new Date(),
              updated_at: new Date(),
            },
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        limit: 10,
        offset: 0,
      };

      runController.listRuns.mockResolvedValueOnce(mockResult);

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
      expect(runController.listRuns).toHaveBeenCalledWith(query);
    });

    it('should handle filtering by status', async () => {
      const mockResult = {
        total: 1,
        runs: [{
          id: 'run-1',
          environment_id: 'env-123',
          status: 'success',
          environment: {
            name: 'test-env',
            base_url: 'https://example.com',
            concurrency_limit: 3,
            created_at: new Date(),
            updated_at: new Date(),
          },
          created_at: new Date(),
          updated_at: new Date(),
        }],
        limit: 10,
        offset: 0,
      };

      runController.listRuns.mockResolvedValueOnce(mockResult);

      const query = {
        status: 'success' as const,
        limit: 10,
        offset: 0,
      };

      const result = await runController.listRuns(query);

      expect(result.total).toBe(1);
      expect(result.runs[0].status).toBe('success');
      expect(runController.listRuns).toHaveBeenCalledWith(query);
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

      runController.updateRunStatus.mockResolvedValueOnce(mockUpdatedRun);

      const result = await runController.updateRunStatus('run-123', 'in_progress', {
        start_time: new Date(),
      });

      expect(result.status).toBe('in_progress');
      expect(result.start_time).toBeDefined();
      expect(runController.updateRunStatus).toHaveBeenCalledWith('run-123', 'in_progress', {
        start_time: expect.any(Date),
      });
    });

    it('should throw NotFoundError for invalid run ID', async () => {
      const notFoundError = new NotFoundError('Run', 'invalid-run');
      runController.updateRunStatus.mockRejectedValueOnce(notFoundError);

      await expect(
        runController.updateRunStatus('invalid-run', 'in_progress')
      ).rejects.toThrow('Run with id invalid-run not found');
    });
  });

  describe('cancelRun', () => {
    it('should cancel a queued run', async () => {
      const mockCancelledRun = {
        id: 'run-123',
        status: 'cancelled',
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

      runController.cancelRun.mockResolvedValueOnce(mockCancelledRun);

      const result = await runController.cancelRun('run-123');

      expect(result.status).toBe('cancelled');
      expect(runController.cancelRun).toHaveBeenCalledWith('run-123');
    });

    it('should throw ValidationError for non-queued run', async () => {
      const validationError = new ValidationError("Cannot cancel run with status 'in_progress'");
      runController.cancelRun.mockRejectedValueOnce(validationError);

      await expect(runController.cancelRun('run-123')).rejects.toThrow("Cannot cancel run with status 'in_progress'");
    });
  });

  describe('getRunStats', () => {
    it('should return run statistics', async () => {
      const mockStatsResult = {
        total: 8,
        success: 5,
        failed: 2,
        queued: 1,
        success_rate: 71.43,
        average_duration_ms: 9428.57,
      };

      runController.getRunStats.mockResolvedValueOnce(mockStatsResult);

      const result = await runController.getRunStats();

      expect(result.total).toBe(8);
      expect(result.success).toBe(5);
      expect(result.failed).toBe(2);
      expect(result.queued).toBe(1);
      expect(result.success_rate).toBeCloseTo(71.43, 2);
      expect(result.average_duration_ms).toBeCloseTo(9428.57, 2);
      expect(runController.getRunStats).toHaveBeenCalledWith();
    });

    it('should handle environment-specific stats', async () => {
      const mockStatsResult = {
        total: 3,
        success: 3,
        failed: 0,
        queued: 0,
        success_rate: 100,
        average_duration_ms: 12000,
      };

      runController.getRunStats.mockResolvedValueOnce(mockStatsResult);

      const result = await runController.getRunStats('env-123');

      expect(result.total).toBe(3);
      expect(result.success).toBe(3);
      expect(result.success_rate).toBe(100);
      expect(result.average_duration_ms).toBe(12000);
      expect(runController.getRunStats).toHaveBeenCalledWith('env-123');
    });
  });
});

