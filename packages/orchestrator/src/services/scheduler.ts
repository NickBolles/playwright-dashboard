import * as cron from 'node-cron';
import { 
  getDatabase, 
  logger, 
  getConfig,
  Schedule,
  ScheduleWithEnvironment 
} from '@playwright-orchestrator/shared';
import { RunController } from '../controllers/runController';

interface ScheduledTask {
  schedule: ScheduleWithEnvironment;
  task: cron.ScheduledTask;
}

export class SchedulerService {
  private db = getDatabase();
  private runController = new RunController();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Start the scheduler service
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler service is already running');
      return;
    }

    try {
      logger.info('Starting scheduler service');
      
      // Load and schedule all enabled schedules
      await this.loadSchedules();
      
      this.isRunning = true;
      logger.info('Scheduler service started successfully', {
        scheduledTasksCount: this.scheduledTasks.size,
      });
    } catch (error) {
      logger.error('Failed to start scheduler service', error);
      throw error;
    }
  }

  /**
   * Stop the scheduler service
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Scheduler service is not running');
      return;
    }

    logger.info('Stopping scheduler service');
    
    // Stop all scheduled tasks
    for (const [scheduleId, scheduledTask] of this.scheduledTasks) {
      scheduledTask.task.stop();
      logger.debug('Stopped scheduled task', { scheduleId });
    }
    
    this.scheduledTasks.clear();
    this.isRunning = false;
    
    logger.info('Scheduler service stopped');
  }

  /**
   * Reload all schedules from the database
   */
  public async reloadSchedules(): Promise<void> {
    logger.info('Reloading schedules');
    
    // Stop existing tasks
    for (const scheduledTask of this.scheduledTasks.values()) {
      scheduledTask.task.stop();
    }
    this.scheduledTasks.clear();
    
    // Load fresh schedules
    await this.loadSchedules();
    
    logger.info('Schedules reloaded', {
      scheduledTasksCount: this.scheduledTasks.size,
    });
  }

  /**
   * Load schedules from database and create cron tasks
   */
  private async loadSchedules(): Promise<void> {
    try {
      const schedules = await this.getEnabledSchedules();
      
      for (const schedule of schedules) {
        await this.scheduleTask(schedule);
      }
      
      logger.info('Loaded schedules', { count: schedules.length });
    } catch (error) {
      logger.error('Failed to load schedules', error);
      throw error;
    }
  }

  /**
   * Get all enabled schedules from the database
   */
  private async getEnabledSchedules(): Promise<ScheduleWithEnvironment[]> {
    const result = await this.db.query<ScheduleWithEnvironment & {
      environment_name: string;
      environment_base_url: string;
      environment_concurrency_limit: number;
      environment_created_at: Date;
      environment_updated_at: Date;
    }>(
      `SELECT 
         s.*,
         e.name as environment_name,
         e.base_url as environment_base_url,
         e.concurrency_limit as environment_concurrency_limit,
         e.created_at as environment_created_at,
         e.updated_at as environment_updated_at
       FROM schedules s
       JOIN environments e ON s.environment_id = e.id
       WHERE s.is_enabled = true
       ORDER BY s.name`
    );

    return result.rows.map(row => ({
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
  }

  /**
   * Schedule a single task
   */
  private async scheduleTask(schedule: ScheduleWithEnvironment): Promise<void> {
    try {
      // Validate cron expression
      if (!cron.validate(schedule.cron_string)) {
        logger.error('Invalid cron expression', {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          cronString: schedule.cron_string,
        });
        return;
      }

      // Create the scheduled task
      const task = cron.schedule(
        schedule.cron_string,
        async () => {
          await this.executeScheduledRun(schedule);
        },
        {
          scheduled: true,
          timezone: process.env.TZ || 'UTC',
        }
      );

      // Store the task
      this.scheduledTasks.set(schedule.id, { schedule, task });
      
      logger.info('Scheduled task created', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        cronString: schedule.cron_string,
        environmentName: schedule.environment.name,
        timezone: process.env.TZ || 'UTC',
      });
    } catch (error) {
      logger.error('Failed to schedule task', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        error,
      });
    }
  }

  /**
   * Execute a scheduled run
   */
  private async executeScheduledRun(schedule: ScheduleWithEnvironment): Promise<void> {
    try {
      logger.info('Executing scheduled run', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        environmentName: schedule.environment.name,
      });

      // Create the run using the run controller
      const run = await this.runController.createRun({
        environment_id: schedule.environment_id,
        custom_config: schedule.custom_config,
        test_command: schedule.test_command,
        triggered_by: 'schedule',
      });

      logger.info('Scheduled run created', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        runId: run.id,
        environmentName: schedule.environment.name,
      });
    } catch (error) {
      logger.error('Failed to execute scheduled run', {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        environmentName: schedule.environment.name,
        error,
      });
    }
  }

  /**
   * Add a new schedule and start its task
   */
  public async addSchedule(scheduleId: string): Promise<void> {
    try {
      const schedules = await this.getScheduleById(scheduleId);
      if (schedules.length === 0) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      const schedule = schedules[0];
      if (!schedule.is_enabled) {
        logger.warn('Attempted to add disabled schedule', { scheduleId });
        return;
      }

      await this.scheduleTask(schedule);
      logger.info('Schedule added to scheduler', { scheduleId });
    } catch (error) {
      logger.error('Failed to add schedule', { scheduleId, error });
      throw error;
    }
  }

  /**
   * Remove a schedule and stop its task
   */
  public async removeSchedule(scheduleId: string): Promise<void> {
    const scheduledTask = this.scheduledTasks.get(scheduleId);
    if (scheduledTask) {
      scheduledTask.task.stop();
      this.scheduledTasks.delete(scheduleId);
      logger.info('Schedule removed from scheduler', { scheduleId });
    } else {
      logger.warn('Attempted to remove non-existent schedule', { scheduleId });
    }
  }

  /**
   * Get schedule by ID with environment info
   */
  private async getScheduleById(scheduleId: string): Promise<ScheduleWithEnvironment[]> {
    const result = await this.db.query<ScheduleWithEnvironment & {
      environment_name: string;
      environment_base_url: string;
      environment_concurrency_limit: number;
      environment_created_at: Date;
      environment_updated_at: Date;
    }>(
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
      [scheduleId]
    );

    return result.rows.map(row => ({
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
  }

  /**
   * Get status of all scheduled tasks
   */
  public getSchedulerStatus(): {
    isRunning: boolean;
    scheduledTasksCount: number;
    tasks: Array<{
      scheduleId: string;
      scheduleName: string;
      cronString: string;
      environmentName: string;
      isRunning: boolean;
    }>;
  } {
    const tasks = Array.from(this.scheduledTasks.entries()).map(([scheduleId, scheduledTask]) => ({
      scheduleId,
      scheduleName: scheduledTask.schedule.name,
      cronString: scheduledTask.schedule.cron_string,
      environmentName: scheduledTask.schedule.environment.name,
      isRunning: scheduledTask.task.getStatus() === 'scheduled',
    }));

    return {
      isRunning: this.isRunning,
      scheduledTasksCount: this.scheduledTasks.size,
      tasks,
    };
  }
}

