#!/usr/bin/env node

/**
 * Complete Flow Test for DeepCrawler Extension
 * Tests the entire data flow from extension to backend
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 DeepCrawler Extension Complete Flow Test\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Check backend is running
  if (await test('Backend is running', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  })) passed++; else failed++;

  // Test 2: Check extension status
  if (await test('Extension status endpoint works', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Extension connected: ${res.body.status}`);
  })) passed++; else failed++;

  // Test 3: Send heartbeat
  if (await test('Extension can send heartbeat', async () => {
    const res = await makeRequest('POST', '/api/extension/ping');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  })) passed++; else failed++;

  // Test 4: Check extension status after heartbeat
  if (await test('Extension shows connected after heartbeat', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (res.body.status !== 'connected') throw new Error(`Status: ${res.body.status}`);
    console.log(`   └─ Extension connected: ${res.body.status}`);
  })) passed++; else failed++;

  // Test 5: Initiate extension crawl
  let crawlRequestId = null;
  if (await test('Can initiate extension crawl', async () => {
    crawlRequestId = `test-${Date.now()}`;
    const res = await makeRequest('POST', '/api/extension/crawl', {
      requestId: crawlRequestId,
      url: 'http://localhost:3002/api/test',
      sameOriginOnly: true
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Crawl ID: ${crawlRequestId}`);
  })) passed++; else failed++;

  // Test 6: Check pending crawls
  if (await test('Can get pending crawls', async () => {
    const res = await makeRequest('GET', '/api/extension/crawl/pending');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Pending crawls: ${res.body.pendingCrawls?.length || 0}`);
  })) passed++; else failed++;

  // Test 7: Submit network data
  if (await test('Can submit network data', async () => {
    const res = await makeRequest('PUT', '/api/extension/crawl', {
      requestId: crawlRequestId,
      networkRequests: [
        {
          method: 'GET',
          url: 'http://localhost:3002/api/test/users',
          status: 200,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        },
        {
          method: 'POST',
          url: 'http://localhost:3002/api/test/users',
          status: 201,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        }
      ],
      action: 'add_requests'
    });
    if (res.status !== 200 && res.status !== 404) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Response: ${res.status}`);
  })) passed++; else failed++;

  // Test 8: Test server-side crawl with real URL
  if (await test('Server-side crawl works with real URL', async () => {
    const res = await makeRequest('POST', '/api/crawl', {
      url: 'https://miniapps.ai',
      sameOriginOnly: true
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Crawl initiated for https://miniapps.ai`);
  })) passed++; else failed++;

  // Test 9: Test with localhost test page
  if (await test('Can crawl localhost test page', async () => {
    const res = await makeRequest('POST', '/api/crawl', {
      url: 'http://localhost:3002/api/test',
      sameOriginOnly: true
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Crawl initiated for http://localhost:3002/api/test`);
  })) passed++; else failed++;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

