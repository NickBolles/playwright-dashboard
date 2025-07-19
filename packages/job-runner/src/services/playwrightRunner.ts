import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logger, Run, JobRunnerConfig } from '@playwright-orchestrator/shared';

export interface PlaywrightRunResult {
  success: boolean;
  exitCode: number;
  duration: number;
  stdout: string;
  stderr: string;
  traceFile?: string;
  reportDir?: string;
  error?: string;
}

export class PlaywrightRunner {
  private config: JobRunnerConfig;
  private workingDir: string;

  constructor(config: JobRunnerConfig, workingDir: string = process.cwd()) {
    this.config = config;
    this.workingDir = workingDir;
  }

  /**
   * Execute Playwright tests for a run
   */
  public async executeTests(run: Run): Promise<PlaywrightRunResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting Playwright test execution', {
        runId: run.id,
        environmentId: run.environment_id,
        testCommand: run.test_command,
        workingDir: this.workingDir,
      });

      // Prepare environment variables
      const env = this.prepareEnvironment(run);

      // Prepare output directories
      const outputDirs = this.prepareOutputDirectories(run.id);

      // Execute the test command
      const result = await this.runCommand(
        run.test_command || 'npx playwright test',
        env,
        outputDirs
      );

      const duration = Date.now() - startTime;

      logger.info('Playwright test execution completed', {
        runId: run.id,
        success: result.success,
        exitCode: result.exitCode,
        duration,
      });

      return {
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Playwright test execution failed', {
        runId: run.id,
        duration,
        error,
      });

      return {
        success: false,
        exitCode: -1,
        duration,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Prepare environment variables for the test run
   */
  private prepareEnvironment(run: Run): Record<string, string> {
    const env: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Add custom configuration as environment variables
    if (run.custom_config) {
      const customConfig =
        typeof run.custom_config === 'string'
          ? JSON.parse(run.custom_config)
          : run.custom_config;

      for (const [key, value] of Object.entries(customConfig)) {
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          env[key] = String(value);
        } else if (typeof value === 'object') {
          // For complex objects, stringify them
          env[key] = JSON.stringify(value);
        }
      }
    }

    // Add run-specific environment variables
    env.PLAYWRIGHT_RUN_ID = run.id;
    env.PLAYWRIGHT_ENVIRONMENT_ID = run.environment_id;
    env.PLAYWRIGHT_TRIGGERED_BY = run.triggered_by || 'unknown';

    // Configure Playwright output directories
    env.PLAYWRIGHT_HTML_REPORT = path.join(
      this.workingDir,
      'test-results',
      run.id,
      'html-report'
    );
    env.PLAYWRIGHT_JUNIT_OUTPUT_NAME = path.join(
      this.workingDir,
      'test-results',
      run.id,
      'results.xml'
    );

    logger.debug('Environment prepared for test run', {
      runId: run.id,
      customConfigKeys: run.custom_config ? Object.keys(run.custom_config) : [],
      envVarCount: Object.keys(env).length,
    });

    return env;
  }

  /**
   * Prepare output directories for test results
   */
  private prepareOutputDirectories(runId: string): {
    resultsDir: string;
    traceDir: string;
    reportDir: string;
  } {
    const baseDir = path.join(this.workingDir, 'test-results', runId);
    const resultsDir = baseDir;
    const traceDir = path.join(baseDir, 'traces');
    const reportDir = path.join(baseDir, 'html-report');

    // Create directories
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.mkdirSync(traceDir, { recursive: true });
    fs.mkdirSync(reportDir, { recursive: true });

    logger.debug('Output directories prepared', {
      runId,
      resultsDir,
      traceDir,
      reportDir,
    });

    return { resultsDir, traceDir, reportDir };
  }

  /**
   * Execute the test command
   */
  private async runCommand(
    command: string,
    env: Record<string, string>,
    outputDirs: { resultsDir: string; traceDir: string; reportDir: string }
  ): Promise<Omit<PlaywrightRunResult, 'duration'>> {
    return new Promise(resolve => {
      const [cmd, ...args] = command.split(' ');
      let stdout = '';
      let stderr = '';

      logger.debug('Executing command', {
        command,
        cmd,
        args,
        workingDir: this.workingDir,
      });

      const child: ChildProcess = spawn(cmd, args, {
        cwd: this.workingDir,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle timeout
      const timeout = setTimeout(() => {
        logger.warn('Test execution timeout, killing process', {
          command,
          timeout: this.config.test_timeout_ms,
        });
        child.kill('SIGKILL');
      }, this.config.test_timeout_ms);

      child.stdout?.on('data', data => {
        const chunk = data.toString();
        stdout += chunk;
        logger.debug('Test stdout', { chunk: chunk.trim() });
      });

      child.stderr?.on('data', data => {
        const chunk = data.toString();
        stderr += chunk;
        logger.debug('Test stderr', { chunk: chunk.trim() });
      });

      child.on('close', code => {
        clearTimeout(timeout);

        const exitCode = code || 0;
        const success = exitCode === 0;

        // Find trace files
        const traceFile = this.findTraceFile(outputDirs.traceDir);

        logger.info('Command execution completed', {
          command,
          exitCode,
          success,
          traceFile,
          stdoutLength: stdout.length,
          stderrLength: stderr.length,
        });

        resolve({
          success,
          exitCode,
          stdout,
          stderr,
          traceFile,
          reportDir: outputDirs.reportDir,
        });
      });

      child.on('error', error => {
        clearTimeout(timeout);

        logger.error('Command execution error', {
          command,
          error,
        });

        resolve({
          success: false,
          exitCode: -1,
          stdout,
          stderr: stderr + '\n' + error.message,
          error: error.message,
        });
      });
    });
  }

  /**
   * Find the trace file in the trace directory
   */
  private findTraceFile(traceDir: string): string | undefined {
    try {
      if (!fs.existsSync(traceDir)) {
        return undefined;
      }

      const files = fs.readdirSync(traceDir);
      const traceFile = files.find(
        file => file.endsWith('.zip') || file.endsWith('.trace')
      );

      if (traceFile) {
        const fullPath = path.join(traceDir, traceFile);
        logger.debug('Trace file found', { traceFile: fullPath });
        return fullPath;
      }

      // Look for trace files in subdirectories
      for (const file of files) {
        const fullPath = path.join(traceDir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          const subTraceFile = this.findTraceFile(fullPath);
          if (subTraceFile) {
            return subTraceFile;
          }
        }
      }

      return undefined;
    } catch (error) {
      logger.warn('Error finding trace file', { traceDir, error });
      return undefined;
    }
  }

  /**
   * Validate Playwright installation
   */
  public async validatePlaywrightInstallation(): Promise<boolean> {
    try {
      const result = await this.runCommand(
        'npx playwright --version',
        process.env as Record<string, string>,
        this.prepareOutputDirectories('validation')
      );

      const isValid = result.success && result.stdout.includes('Version');

      logger.info('Playwright installation validation', {
        isValid,
        version: result.stdout.trim(),
      });

      return isValid;
    } catch (error) {
      logger.error('Failed to validate Playwright installation', { error });
      return false;
    }
  }

  /**
   * Install Playwright browsers if needed
   */
  public async installBrowsers(): Promise<boolean> {
    try {
      logger.info('Installing Playwright browsers');

      const result = await this.runCommand(
        'npx playwright install',
        process.env as Record<string, string>,
        this.prepareOutputDirectories('browser-install')
      );

      if (result.success) {
        logger.info('Playwright browsers installed successfully');
        return true;
      } else {
        logger.error('Failed to install Playwright browsers', {
          exitCode: result.exitCode,
          stderr: result.stderr,
        });
        return false;
      }
    } catch (error) {
      logger.error('Error installing Playwright browsers', { error });
      return false;
    }
  }
}
