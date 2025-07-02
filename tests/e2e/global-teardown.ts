import { getDatabase, loadConfig } from '@playwright-orchestrator/shared';

async function globalTeardown() {
  console.log('🧹 Starting global teardown for Playwright tests');

  try {
    // Load application configuration
    const appConfig = loadConfig();
    const db = getDatabase(appConfig.database);

    // Clean up test data
    await cleanupTestData(db);
    console.log('✅ Test data cleanup completed');

    // Close database connections
    await db.close();
    console.log('✅ Database connections closed');

    console.log('🎉 Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as it might mask test failures
  }
}

async function cleanupTestData(db: any) {
  try {
    // Clean up test runs (this will cascade to job_queue due to foreign key)
    await db.query(
      `DELETE FROM runs 
       WHERE environment_id IN (
         SELECT id FROM environments 
         WHERE name LIKE 'test-%'
       )`
    );

    // Clean up test schedules
    await db.query(
      `DELETE FROM schedules 
       WHERE name LIKE 'test-%'`
    );

    // Clean up test environments
    await db.query(
      `DELETE FROM environments 
       WHERE name LIKE 'test-%'`
    );

    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('Failed to clean up test data:', error);
  }
}

export default globalTeardown;

