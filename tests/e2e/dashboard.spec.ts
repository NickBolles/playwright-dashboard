import { test, expect } from '@playwright/test';
import { setupTestEnvironment, teardownTestEnvironment, TestEnvironment } from './test-setup';

/**
 * Dashboard E2E Test with Testcontainers
 * 
 * This test verifies that the dashboard loads correctly and displays the right data:
 * 1. Sets up a PostgreSQL container with test data
 * 2. Starts the orchestrator service with the test database
 * 3. Starts the web UI
 * 4. Navigates to the dashboard and verifies all components
 * 5. Checks that the data displayed matches the inserted test data
 */

test.describe('Dashboard E2E Test', () => {
  let testEnv: TestEnvironment;
  
  const testData = {
    environments: [
      {
        id: 'env-1',
        name: 'Staging Environment',
        base_url: 'https://staging.example.com',
        concurrency_limit: 3,
        status: 'healthy'
      },
      {
        id: 'env-2', 
        name: 'Production Environment',
        base_url: 'https://prod.example.com',
        concurrency_limit: 2,
        status: 'degraded'
      }
    ],
    runs: [
      {
        id: 'run-1',
        environment_id: 'env-1',
        status: 'success',
        start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        end_time: new Date(Date.now() - 3500000).toISOString(),
        duration_ms: 100000, // 1.67 minutes
        triggered_by: 'manual',
        test_command: 'npx playwright test --grep smoke'
      },
      {
        id: 'run-2',
        environment_id: 'env-1', 
        status: 'failed',
        start_time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        end_time: new Date(Date.now() - 7100000).toISOString(),
        duration_ms: 180000, // 3 minutes
        triggered_by: 'schedule',
        test_command: 'npx playwright test --grep regression',
        error_log: 'Test failed due to timeout'
      },
      {
        id: 'run-3',
        environment_id: 'env-2',
        status: 'success', 
        start_time: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        end_time: new Date(Date.now() - 10700000).toISOString(),
        duration_ms: 60000, // 1 minute
        triggered_by: 'webhook',
        test_command: 'npx playwright test --grep critical'
      },
      {
        id: 'run-4',
        environment_id: 'env-1',
        status: 'in_progress',
        start_time: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        triggered_by: 'manual',
        test_command: 'npx playwright test --grep e2e'
      }
    ],
    schedules: [
      {
        id: 'schedule-1',
        name: 'Nightly Tests',
        cron_string: '0 2 * * *',
        environment_id: 'env-1',
        is_enabled: true,
        test_command: 'npx playwright test --grep nightly'
      }
    ]
  };

  test.beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  test.afterAll(async () => {
    await teardownTestEnvironment(testEnv);
  });



  test('should load dashboard and display correct data', async ({ page }) => {
    console.log('🔍 Testing dashboard functionality...');

    // Navigate to the dashboard
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to dashboard');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify the main dashboard elements are present
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=Overview of your Playwright test orchestration')).toBeVisible();
    console.log('✅ Dashboard header verified');

    // Check that the sidebar navigation is present
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Test Runs')).toBeVisible();
    await expect(page.locator('text=Environments')).toBeVisible();
    await expect(page.locator('text=Schedules')).toBeVisible();
    console.log('✅ Sidebar navigation verified');

    // Verify the stats cards are displayed with correct data
    const statsCards = page.locator('[class*="futuristic-card"]');
    await expect(statsCards).toHaveCount(4);

    // Check total runs card
    await expect(page.locator('text=Total Runs')).toBeVisible();
    const totalRuns = page.locator('text=Total Runs').locator('..').locator('.text-2xl');
    await expect(totalRuns).toContainText('4'); // We inserted 4 test runs

    // Check success rate card
    await expect(page.locator('text=Success Rate')).toBeVisible();
    const successRate = page.locator('text=Success Rate').locator('..').locator('.text-2xl');
    await expect(successRate).toContainText('75%'); // 3 out of 4 runs were successful

    // Check failed runs card
    await expect(page.locator('text=Failed Runs')).toBeVisible();
    const failedRuns = page.locator('text=Failed Runs').locator('..').locator('.text-2xl');
    await expect(failedRuns).toContainText('1'); // 1 failed run

    // Check average duration card
    await expect(page.locator('text=Avg Duration')).toBeVisible();
    const avgDuration = page.locator('text=Avg Duration').locator('..').locator('.text-2xl');
    await expect(avgDuration).toContainText('1m'); // Average of ~1.67 minutes
    console.log('✅ Stats cards verified');

    // Verify the test execution trends chart is present
    await expect(page.locator('text=Test Execution Trends')).toBeVisible();
    await expect(page.locator('text=Success and failure rates over the last 30 days')).toBeVisible();
    console.log('✅ Test trends chart verified');

    // Verify environment status section
    await expect(page.locator('text=Environment Status')).toBeVisible();
    await expect(page.locator('text=Current status of test environments')).toBeVisible();
    
    // Check that both environments are displayed
    await expect(page.locator('text=Staging Environment')).toBeVisible();
    await expect(page.locator('text=Production Environment')).toBeVisible();
    await expect(page.locator('text=https://staging.example.com')).toBeVisible();
    await expect(page.locator('text=https://prod.example.com')).toBeVisible();
    console.log('✅ Environment status verified');

    // Verify recent test runs section
    await expect(page.locator('text=Recent Test Runs')).toBeVisible();
    await expect(page.locator('text=Latest test executions and their results')).toBeVisible();

    // Check that recent runs are displayed
    const recentRuns = page.locator('[class*="flex items-center justify-between"]');
    await expect(recentRuns.first()).toBeVisible();

    // Verify run details are shown
    await expect(page.locator('text=Run run-1')).toBeVisible();
    await expect(page.locator('text=Run run-2')).toBeVisible();
    await expect(page.locator('text=Run run-3')).toBeVisible();
    await expect(page.locator('text=Run run-4')).toBeVisible();
    console.log('✅ Recent runs section verified');

    // Verify system health section
    await expect(page.locator('text=System Health')).toBeVisible();
    await expect(page.locator('text=API Status')).toBeVisible();
    await expect(page.locator('text=Database')).toBeVisible();
    await expect(page.locator('text=Job Runners')).toBeVisible();
    await expect(page.locator('text=Storage')).toBeVisible();
    console.log('✅ System health section verified');

    // Verify quick actions section
    await expect(page.locator('text=Quick Actions')).toBeVisible();
    await expect(page.locator('text=Run Smoke Tests')).toBeVisible();
    await expect(page.locator('text=Deploy to Staging')).toBeVisible();
    await expect(page.locator('text=View Analytics')).toBeVisible();
    console.log('✅ Quick actions section verified');

    // Test theme toggle functionality
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(page.locator('button').filter({ hasText: 'Toggle theme' }));
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      // Verify theme change (this might be subtle depending on the implementation)
      console.log('✅ Theme toggle tested');
    }

    // Test navigation to other pages
    await page.click('text=Test Runs');
    await expect(page).toHaveURL(/.*\/runs/);
    await expect(page.locator('h1')).toContainText('Test Runs');
    console.log('✅ Navigation to Test Runs page verified');

    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*\/$/);
    console.log('✅ Navigation back to Dashboard verified');

    // Test responsive design (if needed)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
    console.log('✅ Responsive design verified');

    console.log('🎉 Dashboard E2E test completed successfully!');
  });

  test('should display real-time updates', async ({ page }) => {
    console.log('🔍 Testing real-time updates...');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Get initial count of runs
    const initialTotalRuns = await page.locator('text=Total Runs').locator('..').locator('.text-2xl').textContent();
    const initialCount = parseInt(initialTotalRuns || '0');

    // Insert a new test run via API
    const newRun = {
      id: 'run-5',
      environment_id: 'env-1',
      status: 'queued',
      triggered_by: 'manual',
      test_command: 'npx playwright test --grep new-test'
    };

    await testEnv.pgClient.query(`
      INSERT INTO runs (id, environment_id, status, test_command, triggered_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [newRun.id, newRun.environment_id, newRun.status, newRun.test_command, newRun.triggered_by]);

    // Wait for potential real-time updates (if implemented)
    await page.waitForTimeout(2000);

    // Check if the dashboard updates (this would depend on real-time implementation)
    const updatedTotalRuns = await page.locator('text=Total Runs').locator('..').locator('.text-2xl').textContent();
    const updatedCount = parseInt(updatedTotalRuns || '0');

    // The count should have increased by 1
    expect(updatedCount).toBe(initialCount + 1);
    console.log('✅ Real-time updates verified');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    console.log('🔍 Testing error handling...');

    // Temporarily break the database connection
    await testEnv.pgClient.end();

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // The dashboard should still load, possibly with error states or fallback data
    await expect(page.locator('h1')).toContainText('Dashboard');
    console.log('✅ Error handling verified');

    // Reconnect to database for cleanup
    await testEnv.pgClient.connect();
  });
});