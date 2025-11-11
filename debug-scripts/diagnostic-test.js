#!/usr/bin/env node

/**
 * DeepCrawler Diagnostic Test Suite
 * Tests all critical components and identifies issues
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';
const TEST_URL = 'https://httpbin.org/get';

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function test(name, fn) {
  return fn()
    .then(() => {
      log(`✓ ${name}`, 'green');
      testResults.passed++;
    })
    .catch(error => {
      log(`✗ ${name}`, 'red');
      log(`  Error: ${error.message}`, 'red');
      testResults.failed++;
      testResults.errors.push({ test: name, error: error.message });
    });
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': EXTENSION_API_KEY,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  log('\n=== DeepCrawler Diagnostic Test Suite ===\n', 'blue');

  // Test 1: Backend connectivity
  await test('Backend is running', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // Test 2: Extension status endpoint
  await test('Extension status endpoint works', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (!res.body || !res.body.status) throw new Error('No status in response');
  });

  // Test 3: Ping endpoint
  await test('Extension ping endpoint works', async () => {
    const res = await makeRequest('POST', '/api/extension/ping');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // Test 4: Invalid API key rejection
  await test('Invalid API key is rejected', async () => {
    const res = await makeRequest('GET', '/api/extension/status', null, {
      'X-Extension-Key': 'invalid-key'
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // Test 5: Crawl endpoint accepts requests
  await test('Crawl endpoint accepts valid requests', async () => {
    const res = await makeRequest('POST', '/api/extension/crawl', {
      requestId: 'test-' + Date.now(),
      url: TEST_URL,
      sameOriginOnly: true
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  });

  // Test 6: Invalid URL rejection
  await test('Invalid URLs are rejected', async () => {
    const res = await makeRequest('POST', '/api/extension/crawl', {
      requestId: 'test-' + Date.now(),
      url: 'not-a-url',
      sameOriginOnly: true
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Test 7: Check extension files exist
  await test('Extension manifest exists', async () => {
    const manifestPath = path.join(__dirname, 'extension', 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('manifest.json not found');
  });

  await test('Extension background.js exists', async () => {
    const bgPath = path.join(__dirname, 'extension', 'background.js');
    if (!fs.existsSync(bgPath)) throw new Error('background.js not found');
  });

  await test('Extension content.js exists', async () => {
    const contentPath = path.join(__dirname, 'extension', 'content.js');
    if (!fs.existsSync(contentPath)) throw new Error('content.js not found');
  });

  // Test 8: Check for SDK bundling issues
  await test('SDK is not imported at top level in crawl route', async () => {
    const crawlRoutePath = path.join(__dirname, 'app', 'api', 'crawl', 'route.ts');
    const content = fs.readFileSync(crawlRoutePath, 'utf8');
    if (content.includes("import { Hyperbrowser } from '@hyperbrowser/sdk'")) {
      throw new Error('SDK imported at top level - will be bundled into client code');
    }
  });

  // Test 9: Pending crawls endpoint
  await test('Pending crawls endpoint works', async () => {
    const res = await makeRequest('GET', '/api/extension/crawl/pending');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body)) throw new Error('Response is not an array');
  });

  // Test 10: Data submission endpoint
  await test('Data submission endpoint accepts PUT requests', async () => {
    const res = await makeRequest('PUT', '/api/extension/crawl/data', {
      requestId: 'test-' + Date.now(),
      networkRequests: [],
      action: 'add_requests'
    });
    if (res.status !== 200 && res.status !== 400) {
      throw new Error(`Unexpected status: ${res.status}`);
    }
  });

  // Print summary
  log('\n=== Test Summary ===\n', 'blue');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');

  if (testResults.errors.length > 0) {
    log('\n=== Failed Tests ===\n', 'red');
    testResults.errors.forEach(({ test, error }) => {
      log(`${test}: ${error}`, 'red');
    });
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

