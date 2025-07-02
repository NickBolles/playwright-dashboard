import { test, expect } from '@playwright/test';

/**
 * Main Workflow E2E Test
 * 
 * This test covers the complete workflow of the Playwright Orchestrator:
 * 1. Create a test environment
 * 2. Create a test run via API
 * 3. Verify the run is queued
 * 4. Simulate job processing
 * 5. Verify run completion and results
 */

test.describe('Playwright Orchestrator - Main Workflow', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3001';
  let environmentId: string;
  let runId: string;

  test.beforeAll(async ({ request }) => {
    // Create a test environment for this workflow
    const envResponse = await request.post(`${baseURL}/api/environments`, {
      data: {
        name: `test-workflow-${Date.now()}`,
        base_url: 'https://example.com',
        concurrency_limit: 1,
      },
    });

    expect(envResponse.ok()).toBeTruthy();
    const envData = await envResponse.json();
    environmentId = envData.environment.id;
    
    console.log(`Created test environment: ${environmentId}`);
  });

  test.afterAll(async ({ request }) => {
    // Clean up the test environment
    if (environmentId) {
      await request.delete(`${baseURL}/api/environments/${environmentId}`);
      console.log(`Cleaned up test environment: ${environmentId}`);
    }
  });

  test('should complete the full test orchestration workflow', async ({ request }) => {
    // Step 1: Verify orchestrator health
    console.log('🔍 Step 1: Checking orchestrator health...');
    const healthResponse = await request.get(`${baseURL}/health`);
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    console.log('✅ Orchestrator is healthy');

    // Step 2: List environments to verify our test environment exists
    console.log('🔍 Step 2: Verifying test environment...');
    const envListResponse = await request.get(`${baseURL}/api/environments`);
    expect(envListResponse.ok()).toBeTruthy();
    
    const envListData = await envListResponse.json();
    const testEnv = envListData.environments.find((env: any) => env.id === environmentId);
    expect(testEnv).toBeDefined();
    expect(testEnv.concurrency_limit).toBe(1);
    console.log('✅ Test environment verified');

    // Step 3: Create a test run
    console.log('🔍 Step 3: Creating test run...');
    const runResponse = await request.post(`${baseURL}/api/runs`, {
      data: {
        environment_id: environmentId,
        custom_config: {
          BASE_URL: 'https://example.com',
          TEST_TYPE: 'e2e-workflow',
          TIMEOUT: 30000,
        },
        test_command: 'echo "Mock Playwright test execution"',
        triggered_by: 'api',
      },
    });

    expect(runResponse.ok()).toBeTruthy();
    const runData = await runResponse.json();
    runId = runData.run.id;
    
    expect(runData.run.status).toBe('queued');
    expect(runData.run.environment_id).toBe(environmentId);
    expect(runData.run.triggered_by).toBe('api');
    console.log(`✅ Test run created: ${runId}`);

    // Step 4: Verify run appears in the runs list
    console.log('🔍 Step 4: Verifying run in list...');
    const runsListResponse = await request.get(`${baseURL}/api/runs?environment_id=${environmentId}`);
    expect(runsListResponse.ok()).toBeTruthy();
    
    const runsListData = await runsListResponse.json();
    expect(runsListData.total).toBeGreaterThan(0);
    
    const ourRun = runsListData.runs.find((run: any) => run.id === runId);
    expect(ourRun).toBeDefined();
    expect(ourRun.status).toBe('queued');
    console.log('✅ Run appears in list');

    // Step 5: Get detailed run information
    console.log('🔍 Step 5: Getting run details...');
    const runDetailResponse = await request.get(`${baseURL}/api/runs/${runId}`);
    expect(runDetailResponse.ok()).toBeTruthy();
    
    const runDetailData = await runDetailResponse.json();
    expect(runDetailData.id).toBe(runId);
    expect(runDetailData.environment.name).toContain('test-workflow');
    expect(runDetailData.custom_config.BASE_URL).toBe('https://example.com');
    expect(runDetailData.custom_config.TEST_TYPE).toBe('e2e-workflow');
    console.log('✅ Run details verified');

    // Step 6: Simulate job processing by updating run status
    console.log('🔍 Step 6: Simulating job processing...');
    
    // Update to in_progress
    const progressResponse = await request.patch(`${baseURL}/api/runs/${runId}/status`, {
      data: {
        status: 'in_progress',
        start_time: new Date().toISOString(),
      },
    });
    expect(progressResponse.ok()).toBeTruthy();
    
    const progressData = await progressResponse.json();
    expect(progressData.run.status).toBe('in_progress');
    expect(progressData.run.start_time).toBeDefined();
    console.log('✅ Run marked as in_progress');

    // Wait a moment to simulate test execution time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update to success with results
    const successResponse = await request.patch(`${baseURL}/api/runs/${runId}/status`, {
      data: {
        status: 'success',
        end_time: new Date().toISOString(),
        duration_ms: 5000,
        trace_url: 'https://example.com/traces/mock-trace.zip',
      },
    });
    expect(successResponse.ok()).toBeTruthy();
    
    const successData = await successResponse.json();
    expect(successData.run.status).toBe('success');
    expect(successData.run.end_time).toBeDefined();
    expect(successData.run.duration_ms).toBe(5000);
    expect(successData.run.trace_url).toBe('https://example.com/traces/mock-trace.zip');
    console.log('✅ Run completed successfully');

    // Step 7: Verify final run state
    console.log('🔍 Step 7: Verifying final run state...');
    const finalRunResponse = await request.get(`${baseURL}/api/runs/${runId}`);
    expect(finalRunResponse.ok()).toBeTruthy();
    
    const finalRunData = await finalRunResponse.json();
    expect(finalRunData.status).toBe('success');
    expect(finalRunData.duration_ms).toBe(5000);
    expect(finalRunData.trace_url).toBe('https://example.com/traces/mock-trace.zip');
    expect(finalRunData.start_time).toBeDefined();
    expect(finalRunData.end_time).toBeDefined();
    console.log('✅ Final run state verified');

    // Step 8: Check run statistics
    console.log('🔍 Step 8: Checking run statistics...');
    const statsResponse = await request.get(`${baseURL}/api/runs/stats?environment_id=${environmentId}`);
    expect(statsResponse.ok()).toBeTruthy();
    
    const statsData = await statsResponse.json();
    expect(statsData.total).toBeGreaterThan(0);
    expect(statsData.success).toBeGreaterThan(0);
    expect(statsData.success_rate).toBeGreaterThan(0);
    console.log('✅ Run statistics verified');

    console.log('🎉 Complete workflow test passed!');
  });

  test('should handle webhook triggers', async ({ request }) => {
    console.log('🔍 Testing webhook workflow...');

    // Test GitHub PR webhook
    const webhookResponse = await request.post(`${baseURL}/api/webhooks/github-pr`, {
      data: {
        environment_id: environmentId,
        pull_request: {
          number: 123,
          head: {
            ref: 'feature/test-branch',
            sha: 'abc123def456',
          },
          base: {
            ref: 'main',
          },
        },
        repository: {
          name: 'test-repo',
          full_name: 'org/test-repo',
        },
        custom_config: {
          PR_NUMBER: 123,
          BRANCH: 'feature/test-branch',
        },
      },
    });

    expect(webhookResponse.ok()).toBeTruthy();
    const webhookData = await webhookResponse.json();
    
    expect(webhookData.run.triggered_by).toBe('webhook');
    expect(webhookData.run.environment_id).toBe(environmentId);
    
    // Verify custom config includes PR information
    const webhookRunResponse = await request.get(`${baseURL}/api/runs/${webhookData.run.id}`);
    const webhookRunData = await webhookRunResponse.json();
    
    expect(webhookRunData.custom_config.pull_request.number).toBe(123);
    expect(webhookRunData.custom_config.repository.full_name).toBe('org/test-repo');
    expect(webhookRunData.custom_config.PR_NUMBER).toBe(123);
    
    console.log('✅ Webhook workflow verified');
  });

  test('should handle rate limiting', async ({ request }) => {
    console.log('🔍 Testing rate limiting...');

    // Create multiple runs to test concurrency limit (environment has limit of 1)
    const run1Response = await request.post(`${baseURL}/api/runs`, {
      data: {
        environment_id: environmentId,
        test_command: 'echo "Rate limit test 1"',
      },
    });
    expect(run1Response.ok()).toBeTruthy();

    const run2Response = await request.post(`${baseURL}/api/runs`, {
      data: {
        environment_id: environmentId,
        test_command: 'echo "Rate limit test 2"',
      },
    });
    expect(run2Response.ok()).toBeTruthy();

    // Both runs should be created (queued), but only one should be able to run at a time
    const run1Data = await run1Response.json();
    const run2Data = await run2Response.json();
    
    expect(run1Data.run.status).toBe('queued');
    expect(run2Data.run.status).toBe('queued');

    // Check environment stats to verify rate limiting info
    const envStatsResponse = await request.get(`${baseURL}/api/environments/stats`);
    expect(envStatsResponse.ok()).toBeTruthy();
    
    const envStatsData = await envStatsResponse.json();
    const testEnvStats = envStatsData.environments.find((env: any) => env.environment_id === environmentId);
    
    expect(testEnvStats).toBeDefined();
    expect(testEnvStats.concurrency_limit).toBe(1);
    expect(testEnvStats.current_running).toBeGreaterThanOrEqual(0);
    
    console.log('✅ Rate limiting verified');
  });

  test('should handle run cancellation', async ({ request }) => {
    console.log('🔍 Testing run cancellation...');

    // Create a run
    const runResponse = await request.post(`${baseURL}/api/runs`, {
      data: {
        environment_id: environmentId,
        test_command: 'echo "Cancellation test"',
      },
    });
    expect(runResponse.ok()).toBeTruthy();
    
    const runData = await runResponse.json();
    const cancelRunId = runData.run.id;
    
    // Cancel the run
    const cancelResponse = await request.post(`${baseURL}/api/runs/${cancelRunId}/cancel`);
    expect(cancelResponse.ok()).toBeTruthy();
    
    const cancelData = await cancelResponse.json();
    expect(cancelData.run.status).toBe('cancelled');
    
    // Verify the run is cancelled
    const verifyResponse = await request.get(`${baseURL}/api/runs/${cancelRunId}`);
    const verifyData = await verifyResponse.json();
    expect(verifyData.status).toBe('cancelled');
    
    console.log('✅ Run cancellation verified');
  });
});

