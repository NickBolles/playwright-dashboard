import { Router, type Router as ExpressRouter } from 'express';
import { body, param, validationResult } from 'express-validator';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  getDatabase,
  logger,
  Environment,
  NotFoundError,
} from '@playwright-orchestrator/shared';
import { RateLimiterService } from '../../services/rateLimiter';

const router: ExpressRouter = Router();
const db = getDatabase();
const rateLimiter = new RateLimiterService();

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
 * GET /api/environments
 * List all environments
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await db.query<Environment>(
      'SELECT * FROM environments ORDER BY name'
    );

    res.json({
      environments: result.rows,
      total: result.rows.length,
    });
  })
);

/**
 * GET /api/environments/:id
 * Get a specific environment by ID
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const environmentInfo = await rateLimiter.getEnvironmentInfo(req.params.id);
    res.json(environmentInfo);
  })
);

/**
 * POST /api/environments
 * Create a new environment
 */
router.post(
  '/',
  [
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('name must be 1-100 characters'),
    body('base_url').isURL().withMessage('base_url must be a valid URL'),
    body('concurrency_limit')
      .isInt({ min: 1, max: 50 })
      .withMessage('concurrency_limit must be between 1 and 50'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { name, base_url, concurrency_limit } = req.body;

    // Check if environment with this name already exists
    const existingResult = await db.query(
      'SELECT id FROM environments WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ENVIRONMENT',
          message: `Environment with name '${name}' already exists`,
        },
      });
    }

    const result = await db.query<Environment>(
      `INSERT INTO environments (id, name, base_url, concurrency_limit)
       VALUES (uuid_generate_v4(), $1, $2, $3)
       RETURNING *`,
      [name, base_url, concurrency_limit]
    );

    const environment = result.rows[0];

    logger.info('Environment created', {
      environmentId: environment.id,
      name: environment.name,
      baseUrl: environment.base_url,
      concurrencyLimit: environment.concurrency_limit,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      environment,
      message: 'Environment created successfully',
    });
  })
);

/**
 * PATCH /api/environments/:id
 * Update an environment
 */
router.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('name must be 1-100 characters'),
    body('base_url')
      .optional()
      .isURL()
      .withMessage('base_url must be a valid URL'),
    body('concurrency_limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('concurrency_limit must be between 1 and 50'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, base_url, concurrency_limit } = req.body;

    // Check if environment exists
    const existingResult = await db.query<Environment>(
      'SELECT * FROM environments WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundError('Environment', id);
    }

    // Build update query dynamically
    const updateFields: string[] = ['updated_at = NOW()'];
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      // Check if another environment with this name exists
      const nameCheckResult = await db.query(
        'SELECT id FROM environments WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameCheckResult.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_ENVIRONMENT',
            message: `Environment with name '${name}' already exists`,
          },
        });
      }

      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(name);
      paramIndex++;
    }

    if (base_url !== undefined) {
      updateFields.push(`base_url = $${paramIndex}`);
      queryParams.push(base_url);
      paramIndex++;
    }

    if (concurrency_limit !== undefined) {
      updateFields.push(`concurrency_limit = $${paramIndex}`);
      queryParams.push(concurrency_limit);
      paramIndex++;
    }

    const result = await db.query<Environment>(
      `UPDATE environments SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      queryParams
    );

    const environment = result.rows[0];

    logger.info('Environment updated', {
      environmentId: environment.id,
      name: environment.name,
      updates: { name, base_url, concurrency_limit },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      environment,
      message: 'Environment updated successfully',
    });
  })
);

/**
 * DELETE /api/environments/:id
 * Delete an environment
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if environment has any runs
    const runsResult = await db.query(
      'SELECT COUNT(*) as count FROM runs WHERE environment_id = $1',
      [id]
    );

    const runCount = parseInt(runsResult.rows[0].count);
    if (runCount > 0) {
      return res.status(409).json({
        error: {
          code: 'ENVIRONMENT_HAS_RUNS',
          message: `Cannot delete environment with ${runCount} associated runs`,
        },
      });
    }

    const result = await db.query<Environment>(
      'DELETE FROM environments WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Environment', id);
    }

    const environment = result.rows[0];

    logger.info('Environment deleted', {
      environmentId: environment.id,
      name: environment.name,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      environment,
      message: 'Environment deleted successfully',
    });
  })
);

/**
 * GET /api/environments/stats
 * Get environment statistics including current usage
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await rateLimiter.getCurrentCounts();
    res.json({
      environments: stats,
      total_environments: stats.length,
    });
  })
);

export { router as environmentRoutes };
