import { Router, type Router as ExpressRouter } from 'express';
import { body, param, validationResult } from 'express-validator';
import * as cron from 'node-cron';
import { asyncHandler } from '../../middleware/errorHandler';
import {
  getDatabase,
  logger,
  Schedule,
  ScheduleWithEnvironment,
  NotFoundError,
} from '@playwright-orchestrator/shared';

const router: ExpressRouter = Router();
const db = getDatabase();

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
 * GET /api/schedules
 * List all schedules
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await db.query<
      ScheduleWithEnvironment & {
        environment_name: string;
        environment_base_url: string;
        environment_concurrency_limit: number;
        environment_created_at: Date;
        environment_updated_at: Date;
      }
    >(
      `SELECT 
         s.*,
         e.name as environment_name,
         e.base_url as environment_base_url,
         e.concurrency_limit as environment_concurrency_limit,
         e.created_at as environment_created_at,
         e.updated_at as environment_updated_at
       FROM schedules s
       JOIN environments e ON s.environment_id = e.id
       ORDER BY s.name`
    );

    const schedules: ScheduleWithEnvironment[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      cron_string: row.cron_string,
      environment_id: row.environment_id,
      is_enabled: row.is_enabled,
      test_command: row.test_command,
      custom_config: row.custom_config,
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

    res.json({
      schedules,
      total: schedules.length,
    });
  })
);

/**
 * GET /api/schedules/:id
 * Get a specific schedule by ID
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const result = await db.query<
      ScheduleWithEnvironment & {
        environment_name: string;
        environment_base_url: string;
        environment_concurrency_limit: number;
        environment_created_at: Date;
        environment_updated_at: Date;
      }
    >(
      `SELECT 
         s.*,
         e.name as environment_name,
         e.base_url as environment_base_url,
         e.concurrency_limit as environment_concurrency_limit,
         e.created_at as environment_created_at,
         e.updated_at as environment_updated_at
       FROM schedules s
       JOIN environments e ON s.environment_id = e.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Schedule', req.params.id);
    }

    const row = result.rows[0];
    const schedule: ScheduleWithEnvironment = {
      id: row.id,
      name: row.name,
      cron_string: row.cron_string,
      environment_id: row.environment_id,
      is_enabled: row.is_enabled,
      test_command: row.test_command,
      custom_config: row.custom_config,
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

    res.json(schedule);
  })
);

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post(
  '/',
  [
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('name must be 1-100 characters'),
    body('cron_string')
      .isString()
      .custom(value => {
        if (!cron.validate(value)) {
          throw new Error('Invalid cron expression');
        }
        return true;
      }),
    body('environment_id')
      .isUUID()
      .withMessage('environment_id must be a valid UUID'),
    body('is_enabled')
      .optional()
      .isBoolean()
      .withMessage('is_enabled must be a boolean'),
    body('test_command')
      .optional()
      .isString()
      .withMessage('test_command must be a string'),
    body('custom_config')
      .optional()
      .isObject()
      .withMessage('custom_config must be an object'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const {
      name,
      cron_string,
      environment_id,
      is_enabled,
      test_command,
      custom_config,
    } = req.body;

    // Check if environment exists
    const envResult = await db.query(
      'SELECT id FROM environments WHERE id = $1',
      [environment_id]
    );

    if (envResult.rows.length === 0) {
      throw new NotFoundError('Environment', environment_id);
    }

    // Check if schedule with this name already exists
    const existingResult = await db.query(
      'SELECT id FROM schedules WHERE name = $1',
      [name]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_SCHEDULE',
          message: `Schedule with name '${name}' already exists`,
        },
      });
    }

    const result = await db.query<Schedule>(
      `INSERT INTO schedules (id, name, cron_string, environment_id, is_enabled, test_command, custom_config)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        cron_string,
        environment_id,
        is_enabled !== undefined ? is_enabled : true,
        test_command || 'npx playwright test',
        JSON.stringify(custom_config || {}),
      ]
    );

    const schedule = result.rows[0];

    logger.info('Schedule created', {
      scheduleId: schedule.id,
      name: schedule.name,
      cronString: schedule.cron_string,
      environmentId: schedule.environment_id,
      isEnabled: schedule.is_enabled,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      schedule,
      message: 'Schedule created successfully',
    });
  })
);

/**
 * PATCH /api/schedules/:id
 * Update a schedule
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
    body('cron_string')
      .optional()
      .isString()
      .custom(value => {
        if (value && !cron.validate(value)) {
          throw new Error('Invalid cron expression');
        }
        return true;
      }),
    body('environment_id')
      .optional()
      .isUUID()
      .withMessage('environment_id must be a valid UUID'),
    body('is_enabled')
      .optional()
      .isBoolean()
      .withMessage('is_enabled must be a boolean'),
    body('test_command')
      .optional()
      .isString()
      .withMessage('test_command must be a string'),
    body('custom_config')
      .optional()
      .isObject()
      .withMessage('custom_config must be an object'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      cron_string,
      environment_id,
      is_enabled,
      test_command,
      custom_config,
    } = req.body;

    // Check if schedule exists
    const existingResult = await db.query<Schedule>(
      'SELECT * FROM schedules WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundError('Schedule', id);
    }

    // Check if environment exists (if being updated)
    if (environment_id) {
      const envResult = await db.query(
        'SELECT id FROM environments WHERE id = $1',
        [environment_id]
      );

      if (envResult.rows.length === 0) {
        throw new NotFoundError('Environment', environment_id);
      }
    }

    // Check if another schedule with this name exists (if name is being updated)
    if (name) {
      const nameCheckResult = await db.query(
        'SELECT id FROM schedules WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (nameCheckResult.rows.length > 0) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_SCHEDULE',
            message: `Schedule with name '${name}' already exists`,
          },
        });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = ['updated_at = NOW()'];
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      queryParams.push(name);
      paramIndex++;
    }

    if (cron_string !== undefined) {
      updateFields.push(`cron_string = $${paramIndex}`);
      queryParams.push(cron_string);
      paramIndex++;
    }

    if (environment_id !== undefined) {
      updateFields.push(`environment_id = $${paramIndex}`);
      queryParams.push(environment_id);
      paramIndex++;
    }

    if (is_enabled !== undefined) {
      updateFields.push(`is_enabled = $${paramIndex}`);
      queryParams.push(is_enabled);
      paramIndex++;
    }

    if (test_command !== undefined) {
      updateFields.push(`test_command = $${paramIndex}`);
      queryParams.push(test_command);
      paramIndex++;
    }

    if (custom_config !== undefined) {
      updateFields.push(`custom_config = $${paramIndex}`);
      queryParams.push(JSON.stringify(custom_config));
      paramIndex++;
    }

    const result = await db.query<Schedule>(
      `UPDATE schedules SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
      queryParams
    );

    const schedule = result.rows[0];

    logger.info('Schedule updated', {
      scheduleId: schedule.id,
      name: schedule.name,
      updates: {
        name,
        cron_string,
        environment_id,
        is_enabled,
        test_command,
        custom_config,
      },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      schedule,
      message: 'Schedule updated successfully',
    });
  })
);

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query<Schedule>(
      'DELETE FROM schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Schedule', id);
    }

    const schedule = result.rows[0];

    logger.info('Schedule deleted', {
      scheduleId: schedule.id,
      name: schedule.name,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      schedule,
      message: 'Schedule deleted successfully',
    });
  })
);

/**
 * POST /api/schedules/:id/toggle
 * Toggle schedule enabled/disabled status
 */
router.post(
  '/:id/toggle',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await db.query<Schedule>(
      `UPDATE schedules 
       SET is_enabled = NOT is_enabled, updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Schedule', id);
    }

    const schedule = result.rows[0];

    logger.info('Schedule toggled', {
      scheduleId: schedule.id,
      name: schedule.name,
      isEnabled: schedule.is_enabled,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      schedule,
      message: `Schedule ${schedule.is_enabled ? 'enabled' : 'disabled'} successfully`,
    });
  })
);

export { router as scheduleRoutes };
