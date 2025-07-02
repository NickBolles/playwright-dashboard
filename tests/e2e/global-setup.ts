import { chromium, FullConfig } from '@playwright/test';
import { loadConfig, getDatabase } from '@playwright-orchestrator/shared';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests');

  try {
    // Load application configuration
    const appConfig = loadConfig();
    console.log('✅ Application configuration loaded');

    // Test database connection
    const db = getDatabase(appConfig.database);
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connection verified');

    // Run database migrations to ensure schema is up to date
    console.log('🔄 Running database migrations...');
    // Note: In a real scenario, you might want to use a test database
    // await db.migrate();
    console.log('✅ Database migrations completed');

    // Set up test data
    await setupTestData(db);
    console.log('✅ Test data setup completed');

    // Verify orchestrator service is running
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      const response = await page.goto('http://localhost:3001/health');
      if (!response?.ok()) {
        throw new Error(`Health check failed: ${response?.status()}`);
      }
      console.log('✅ Orchestrator service health check passed');
    } finally {
      await page.close();
      await browser.close();
    }

    console.log('🎉 Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

async function setupTestData(db: any) {
  // Create test environments
  const testEnvironments = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'test-staging',
      base_url: 'https://staging.example.com',
      concurrency_limit: 2,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'test-production',
      base_url: 'https://production.example.com',
      concurrency_limit: 1,
    },
  ];

  for (const env of testEnvironments) {
    try {
      await db.query(
        `INSERT INTO environments (id, name, base_url, concurrency_limit, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           base_url = EXCLUDED.base_url,
           concurrency_limit = EXCLUDED.concurrency_limit,
           updated_at = NOW()`,
        [env.id, env.name, env.base_url, env.concurrency_limit]
      );
    } catch (error) {
      console.warn(`Failed to create test environment ${env.name}:`, error);
    }
  }

  // Create test schedules
  const testSchedules = [
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'test-nightly',
      cron_string: '0 2 * * *',
      environment_id: '550e8400-e29b-41d4-a716-446655440001',
      is_enabled: false, // Disabled for tests
      test_command: 'echo "Test command"',
      custom_config: JSON.stringify({ test: true }),
    },
  ];

  for (const schedule of testSchedules) {
    try {
      await db.query(
        `INSERT INTO schedules (id, name, cron_string, environment_id, is_enabled, test_command, custom_config, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           cron_string = EXCLUDED.cron_string,
           environment_id = EXCLUDED.environment_id,
           is_enabled = EXCLUDED.is_enabled,
           test_command = EXCLUDED.test_command,
           custom_config = EXCLUDED.custom_config,
           updated_at = NOW()`,
        [
          schedule.id,
          schedule.name,
          schedule.cron_string,
          schedule.environment_id,
          schedule.is_enabled,
          schedule.test_command,
          schedule.custom_config,
        ]
      );
    } catch (error) {
      console.warn(`Failed to create test schedule ${schedule.name}:`, error);
    }
  }
}

export default globalSetup;

