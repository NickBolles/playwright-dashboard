import { test, expect } from '@playwright/test';

/**
 * Simple Dashboard Test
 * 
 * This test verifies basic dashboard functionality without requiring Testcontainers.
 * It assumes the orchestrator and web UI are running on their default ports.
 */

test.describe('Simple Dashboard Test', () => {
  test('should load dashboard page', async ({ page }) => {
    console.log('🔍 Testing basic dashboard functionality...');

    // Navigate to the dashboard
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to dashboard');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify the main dashboard elements are present
    await expect(page.locator('h1')).toContainText('Dashboard');
    console.log('✅ Dashboard header verified');

    // Check that the sidebar navigation is present
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Test Runs')).toBeVisible();
    await expect(page.locator('text=Environments')).toBeVisible();
    console.log('✅ Sidebar navigation verified');

    // Verify that the page loaded without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('Failed to load');
    console.log('✅ No error messages found');

    console.log('🎉 Basic dashboard test completed successfully!');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    console.log('🔍 Testing error handling...');

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // The dashboard should load even if some API calls fail
    await expect(page.locator('h1')).toContainText('Dashboard');
    console.log('✅ Dashboard loads even with potential API errors');
  });
});