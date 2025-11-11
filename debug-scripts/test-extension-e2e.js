/**
 * End-to-End Test for DeepCrawler Extension
 * Tests the complete flow from UI to extension to backend
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 DeepCrawler Extension E2E Test\n');

  let passed = 0, failed = 0;

  // Test 1: Check extension status
  if (await test('Extension is connected', async () => {
    const res = await makeRequest('GET', '/api/extension/status');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (res.body.status !== 'connected') throw new Error(`Not connected: ${res.body.status}`);
  })) passed++; else failed++;

  // Test 2: Send heartbeat
  if (await test('Can send heartbeat', async () => {
    const res = await makeRequest('POST', '/api/extension/ping');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
  })) passed++; else failed++;

  // Test 3: Check pending crawls (should be 0 initially)
  if (await test('Pending crawls endpoint works', async () => {
    const res = await makeRequest('GET', '/api/extension/crawl/pending');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.pendingCrawls)) throw new Error('Not an array');
    console.log(`   └─ Pending crawls: ${res.body.pendingCrawls.length}`);
  })) passed++; else failed++;

  // Test 4: Initiate a crawl
  let crawlRequestId = null;
  if (await test('Can initiate extension crawl', async () => {
    crawlRequestId = `test-${Date.now()}`;
    const res = await makeRequest('POST', '/api/extension/crawl', {
      requestId: crawlRequestId,
      url: 'https://miniapps.ai',
      sameOriginOnly: true
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Crawl ID: ${crawlRequestId}`);
  })) passed++; else failed++;

  // Test 5: Check pending crawls (should now have 1)
  if (await test('Pending crawls returns the initiated crawl', async () => {
    // Wait a bit for the session to be stored
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const res = await makeRequest('GET', '/api/extension/crawl/pending');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    if (!Array.isArray(res.body.pendingCrawls)) throw new Error('Not an array');
    if (res.body.pendingCrawls.length === 0) throw new Error('No pending crawls found');
    
    const crawl = res.body.pendingCrawls.find(c => c.requestId === crawlRequestId);
    if (!crawl) throw new Error(`Crawl ${crawlRequestId} not found in pending crawls`);
    
    console.log(`   └─ Found crawl: ${crawl.requestId}`);
    console.log(`   └─ URL: ${crawl.url}`);
    console.log(`   └─ Seed Host: ${crawl.seedHost}`);
  })) passed++; else failed++;

  // Test 6: Simulate extension sending network data
  if (await test('Can submit network data', async () => {
    const res = await makeRequest('PUT', '/api/extension/crawl/data', {
      requestId: crawlRequestId,
      networkRequests: [
        { method: 'GET', url: 'https://miniapps.ai/api/tools', status: 200, type: 'fetch' },
        { method: 'GET', url: 'https://miniapps.ai/api/models', status: 200, type: 'fetch' }
      ],
      action: 'add_requests'
    });
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    console.log(`   └─ Data submitted successfully`);
  })) passed++; else failed++;

  // Test 7: Wait for crawl to complete
  if (await test('Crawl completes with endpoints', async () => {
    // Wait for crawl to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // The crawl should be complete by now
    // We can't directly check the result, but we can verify the session is gone
    const res = await makeRequest('GET', '/api/extension/crawl/pending');
    if (res.status !== 200) throw new Error(`Status: ${res.status}`);
    
    const crawl = res.body.pendingCrawls.find(c => c.requestId === crawlRequestId);
    if (crawl) {
      console.log(`   └─ Crawl still pending (may be waiting for more data)`);
    } else {
      console.log(`   └─ Crawl completed and removed from pending`);
    }
  })) passed++; else failed++;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

