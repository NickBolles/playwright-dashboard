import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { RunController } from '../../controllers/runController';
import { asyncHandler } from '../../middleware/errorHandler';
import { logger, WebhookPayload } from '@playwright-orchestrator/shared';

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
 * POST /api/webhooks/github-pr
 * Handle GitHub PR webhooks
 */
router.post(
  '/github-pr',
  [
    body('pull_request').optional().isObject(),
    body('repository').optional().isObject(),
    body('deployment').optional().isObject(),
    body('environment_id').isUUID().withMessage('environment_id must be a valid UUID'),
    body('custom_config').optional().isObject(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const payload: WebhookPayload & { environment_id: string } = req.body;
    
    logger.info('Received GitHub PR webhook', {
      repository: payload.repository?.full_name,
      pullRequest: payload.pull_request?.number,
      deployment: payload.deployment?.environment,
      environmentId: payload.environment_id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Build custom config from webhook payload
    const customConfig: Record<string, any> = {
      ...payload.custom_config,
    };

    // Add PR information if available
    if (payload.pull_request) {
      customConfig.pull_request = {
        number: payload.pull_request.number,
        head_ref: payload.pull_request.head.ref,
        head_sha: payload.pull_request.head.sha,
        base_ref: payload.pull_request.base.ref,
      };
    }

    // Add repository information if available
    if (payload.repository) {
      customConfig.repository = {
        name: payload.repository.name,
        full_name: payload.repository.full_name,
      };
    }

    // Add deployment information if available
    if (payload.deployment) {
      customConfig.deployment = {
        environment: payload.deployment.environment,
        web_url: payload.deployment.payload?.web_url,
      };
      
      // Use deployment URL as BASE_URL if provided
      if (payload.deployment.payload?.web_url) {
        customConfig.BASE_URL = payload.deployment.payload.web_url;
      }
    }

    // Create the test run
    const run = await runController.createRun({
      environment_id: payload.environment_id,
      custom_config: customConfig,
      triggered_by: 'webhook',
    });

    logger.info('Test run created from GitHub webhook', {
      runId: run.id,
      environmentId: payload.environment_id,
      repository: payload.repository?.full_name,
      pullRequest: payload.pull_request?.number,
    });

    res.status(201).json({
      run,
      message: 'Test run created from webhook',
    });
  })
);

/**
 * POST /api/webhooks/generic
 * Handle generic webhooks
 */
router.post(
  '/generic',
  [
    body('environment_id').isUUID().withMessage('environment_id must be a valid UUID'),
    body('custom_config').optional().isObject(),
    body('test_command').optional().isString(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { environment_id, custom_config, test_command } = req.body;
    
    logger.info('Received generic webhook', {
      environmentId: environment_id,
      customConfig: custom_config,
      testCommand: test_command,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Create the test run
    const run = await runController.createRun({
      environment_id,
      custom_config,
      test_command,
      triggered_by: 'webhook',
    });

    logger.info('Test run created from generic webhook', {
      runId: run.id,
      environmentId: environment_id,
    });

    res.status(201).json({
      run,
      message: 'Test run created from webhook',
    });
  })
);

/**
 * POST /api/webhooks/deployment
 * Handle deployment webhooks (e.g., from Vercel, Netlify, etc.)
 */
router.post(
  '/deployment',
  [
    body('environment_id').isUUID().withMessage('environment_id must be a valid UUID'),
    body('deployment_url').isURL().withMessage('deployment_url must be a valid URL'),
    body('environment_name').optional().isString(),
    body('branch').optional().isString(),
    body('commit_sha').optional().isString(),
    body('custom_config').optional().isObject(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { 
      environment_id, 
      deployment_url, 
      environment_name, 
      branch, 
      commit_sha, 
      custom_config 
    } = req.body;
    
    logger.info('Received deployment webhook', {
      environmentId: environment_id,
      deploymentUrl: deployment_url,
      environmentName: environment_name,
      branch,
      commitSha: commit_sha,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Build custom config with deployment information
    const deploymentConfig: Record<string, any> = {
      ...custom_config,
      BASE_URL: deployment_url,
      deployment: {
        url: deployment_url,
        environment: environment_name,
        branch,
        commit_sha,
      },
    };

    // Create the test run
    const run = await runController.createRun({
      environment_id,
      custom_config: deploymentConfig,
      triggered_by: 'webhook',
    });

    logger.info('Test run created from deployment webhook', {
      runId: run.id,
      environmentId: environment_id,
      deploymentUrl: deployment_url,
    });

    res.status(201).json({
      run,
      message: 'Test run created from deployment webhook',
    });
  })
);

/**
 * GET /api/webhooks/health
 * Health check endpoint for webhook services
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhooks: {
      'github-pr': '/api/webhooks/github-pr',
      'generic': '/api/webhooks/generic',
      'deployment': '/api/webhooks/deployment',
    },
  });
});

export { router as webhookRoutes };

