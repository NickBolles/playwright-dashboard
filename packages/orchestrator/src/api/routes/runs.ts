import { Router } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { RunController } from '../../controllers/runController';
import { asyncHandler } from '../../middleware/errorHandler';
import { logger } from '@playwright-orchestrator/shared';

const router = Router();
const runController = new RunController();

// Validation middleware
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors.array(),
      },
    });
  }
  next();
};

/**
 * GET /api/runs
 * List runs with filtering and pagination
 */
router.get(
  '/',
  [
    query('environment_id').optional().isUUID().withMessage('environment_id must be a valid UUID'),
    query('status').optional().isIn(['queued', 'in_progress', 'success', 'failed', 'error', 'cancelled']),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0'),
    query('sort').optional().isIn(['created_at', 'duration_ms', 'status']),
    query('order').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const query = {
      environment_id: req.query.environment_id as string,
      status: req.query.status as any,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      sort: req.query.sort as any,
      order: req.query.order as any,
    };

    const result = await runController.listRuns(query);
    res.json(result);
  })
);

/**
 * POST /api/runs
 * Create a new test run
 */
router.post(
  '/',
  [
    body('environment_id').isUUID().withMessage('environment_id must be a valid UUID'),
    body('custom_config').optional().isObject().withMessage('custom_config must be an object'),
    body('test_command').optional().isString().withMessage('test_command must be a string'),
    body('triggered_by').optional().isIn(['manual', 'schedule', 'webhook', 'api']),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const run = await runController.createRun(req.body);
    
    logger.info('Run created via API', {
      runId: run.id,
      environmentId: run.environment_id,
      triggeredBy: run.triggered_by,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      run,
      message: 'Run created successfully',
    });
  })
);

/**
 * GET /api/runs/:id
 * Get a specific run by ID
 */
router.get(
  '/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const run = await runController.getRunById(req.params.id);
    res.json(run);
  })
);

/**
 * PATCH /api/runs/:id/status
 * Update run status (primarily for job runners)
 */
router.patch(
  '/:id/status',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('status').isIn(['queued', 'in_progress', 'success', 'failed', 'error', 'cancelled']),
    body('start_time').optional().isISO8601().withMessage('start_time must be a valid ISO 8601 date'),
    body('end_time').optional().isISO8601().withMessage('end_time must be a valid ISO 8601 date'),
    body('duration_ms').optional().isInt({ min: 0 }).withMessage('duration_ms must be >= 0'),
    body('error_log').optional().isString().withMessage('error_log must be a string'),
    body('trace_url').optional().isURL().withMessage('trace_url must be a valid URL'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { status, start_time, end_time, duration_ms, error_log, trace_url } = req.body;
    
    const updates: any = {};
    if (start_time) updates.start_time = new Date(start_time);
    if (end_time) updates.end_time = new Date(end_time);
    if (duration_ms !== undefined) updates.duration_ms = duration_ms;
    if (error_log) updates.error_log = error_log;
    if (trace_url) updates.trace_url = trace_url;

    const run = await runController.updateRunStatus(req.params.id, status, updates);
    
    logger.info('Run status updated via API', {
      runId: run.id,
      status,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      run,
      message: 'Run status updated successfully',
    });
  })
);

/**
 * POST /api/runs/:id/cancel
 * Cancel a queued run
 */
router.post(
  '/:id/cancel',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const run = await runController.cancelRun(req.params.id);
    
    logger.info('Run cancelled via API', {
      runId: run.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      run,
      message: 'Run cancelled successfully',
    });
  })
);

/**
 * GET /api/runs/stats
 * Get run statistics
 */
router.get(
  '/stats',
  [
    query('environment_id').optional().isUUID().withMessage('environment_id must be a valid UUID'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const stats = await runController.getRunStats(req.query.environment_id as string);
    res.json(stats);
  })
);

export { router as runRoutes };

