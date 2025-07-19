// Load test processor for Artillery
// This file handles dynamic data generation and response processing

function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateRandomEmail() {
  const domains = ['example.com', 'test.org', 'demo.net'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `user${Math.floor(Math.random() * 1000)}@${domain}`;
}

function generateRandomName() {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  return names[Math.floor(Math.random() * names.length)];
}

// Process responses to extract dynamic data
function processResponse(requestParams, response, context, ee, next) {
  // Extract job ID from job creation response
  if (requestParams.url && requestParams.url.includes('/api/jobs') && requestParams.method === 'POST') {
    try {
      const responseBody = JSON.parse(response.body);
      if (responseBody.id) {
        context.vars.jobId = responseBody.id;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Extract test ID from test creation response
  if (requestParams.url && requestParams.url.includes('/api/tests') && requestParams.method === 'POST') {
    try {
      const responseBody = JSON.parse(response.body);
      if (responseBody.id) {
        context.vars.testId = responseBody.id;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return next();
}

// Generate random data for requests
function generateRandomData(requestParams, context, ee, next) {
  // Generate random user data
  if (requestParams.json && requestParams.json.email) {
    requestParams.json.email = generateRandomEmail();
  }
  
  if (requestParams.json && requestParams.json.name) {
    requestParams.json.name = generateRandomName();
  }

  // Generate random job data
  if (requestParams.json && requestParams.json.script) {
    const scripts = [
      "console.log('Hello World')",
      "document.querySelector('h1').textContent",
      "await page.click('button')",
      "await page.fill('input', 'test')"
    ];
    requestParams.json.script = scripts[Math.floor(Math.random() * scripts.length)];
  }

  // Generate random test data
  if (requestParams.json && requestParams.json.url) {
    const urls = [
      'https://example.com',
      'https://test.org',
      'https://demo.net',
      'https://playwright.dev'
    ];
    requestParams.json.url = urls[Math.floor(Math.random() * urls.length)];
  }

  return next();
}

module.exports = {
  processResponse,
  generateRandomData
};