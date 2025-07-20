import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import {
  loadConfig,
  logger,
  loggerStream,
  getDatabase,
} from '@playwright-orchestrator/shared';
import { runRoutes } from './api/routes/runs';
import { webhookRoutes } from './api/routes/webhooks';
import { environmentRoutes } from './api/routes/environments';
import { scheduleRoutes } from './api/routes/schedules';
import { SchedulerService } from './services/scheduler';
import { errorHandler } from './middleware/errorHandler';

class OrchestratorServer {
  private app: express.Application;
  private config: ReturnType<typeof loadConfig>;
  private schedulerService: SchedulerService;

  constructor() {
    console.log('OrchestratorServer constructor called');
    this.app = express();
    console.log('Express app created');
    this.config = loadConfig();
    console.log('Config loaded');
    this.schedulerService = new SchedulerService();
    console.log('SchedulerService created');

    this.setupMiddleware();
    console.log('Middleware setup complete');
    this.setupRoutes();
    console.log('Routes setup complete');
    this.setupErrorHandling();
    console.log('Error handling setup complete');
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );

    // CORS
    this.app.use(
      cors({
        origin: this.config.orchestrator.cors_origins,
        credentials: true,
      })
    );

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.orchestrator.rate_limit.window_ms,
      max: this.config.orchestrator.rate_limit.max_requests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // HTTP request logging
    this.app.use(morgan('combined', { stream: loggerStream }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/runs', runRoutes);
    this.app.use('/api/webhooks', webhookRoutes);
    this.app.use('/api/environments', environmentRoutes);
    this.app.use('/api/schedules', scheduleRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    console.log('OrchestratorServer.start() called');
    try {
      // Test database connection
      console.log('Testing database connection...');
      const db = getDatabase(this.config.database);
      console.log('Database instance created');
      const isConnected = await db.testConnection();
      console.log('Database connection test result:', isConnected);

      if (!isConnected) {
        throw new Error('Failed to connect to database');
      }

      // Start the scheduler service
      console.log('Starting scheduler service...');
      await this.schedulerService.start();
      console.log('Scheduler service started');

      // Start the HTTP server
      const port = this.config.orchestrator.port;
      console.log(`Starting HTTP server on port ${port}...`);
      this.app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
        logger.info(`Orchestrator server started on port ${port}`, {
          port,
          environment: process.env.NODE_ENV || 'development',
          cors_origins: this.config.orchestrator.cors_origins,
        });
      });

      // Graceful shutdown handling
      console.log('Setting up graceful shutdown...');
      this.setupGracefulShutdown();
      console.log('Graceful shutdown setup complete');
    } catch (error) {
      console.error('Error in start():', error);
      logger.error('Failed to start orchestrator server', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown`);

      try {
        // Stop the scheduler
        await this.schedulerService.stop();

        // Close database connections
        const db = getDatabase();
        await db.close();

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

  public getApp(): express.Application {
    return this.app;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  console.log('Starting orchestrator server...');
  try {
    const server = new OrchestratorServer();
    console.log('OrchestratorServer instance created');
    server.start().catch(error => {
      console.error('Failed to start server:', error);
      logger.error('Failed to start server', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Error creating OrchestratorServer:', error);
    process.exit(1);
  }
}

export { OrchestratorServer };
