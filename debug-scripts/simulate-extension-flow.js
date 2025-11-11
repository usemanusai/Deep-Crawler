#!/usr/bin/env node

/**
 * Simulate Complete Extension Flow
 * This script simulates what the Chrome extension does
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

async function main() {
  console.log('🔄 Simulating Complete Extension Flow\n');

  try {
    // Step 1: Send heartbeat
    console.log('1️⃣  Sending heartbeat...');
    let res = await makeRequest('POST', '/api/extension/ping');
    console.log(`   Status: ${res.status}`);

    // Step 2: Check status
    console.log('\n2️⃣  Checking extension status...');
    res = await makeRequest('GET', '/api/extension/status');
    console.log(`   Status: ${res.status}`);
    console.log(`   Connected: ${res.body.status}`);

    // Step 3: Initiate crawl
    console.log('\n3️⃣  Initiating crawl...');
    const crawlRequestId = `sim-${Date.now()}`;
    res = await makeRequest('POST', '/api/extension/crawl', {
      requestId: crawlRequestId,
      url: 'http://localhost:3002/api/test',
      sameOriginOnly: true
    });
    console.log(`   Status: ${res.status}`);
    console.log(`   Crawl ID: ${crawlRequestId}`);

    // Step 4: Poll for pending crawls
    console.log('\n4️⃣  Polling for pending crawls...');
    res = await makeRequest('GET', '/api/extension/crawl/pending');
    console.log(`   Status: ${res.status}`);
    console.log(`   Pending crawls: ${res.body.pendingCrawls?.length || 0}`);

    if (res.body.pendingCrawls && res.body.pendingCrawls.length > 0) {
      const crawl = res.body.pendingCrawls[0];
      console.log(`   Found crawl: ${crawl.requestId}`);
      console.log(`   URL: ${crawl.url}`);

      // Step 5: Simulate network capture
      console.log('\n5️⃣  Simulating network capture...');
      const networkRequests = [
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
        },
        {
          method: 'PUT',
          url: 'http://localhost:3002/api/test/users/1',
          status: 200,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        },
        {
          method: 'DELETE',
          url: 'http://localhost:3002/api/test/users/1',
          status: 204,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        },
        {
          method: 'GET',
          url: 'http://localhost:3002/api/test/posts',
          status: 200,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        },
        {
          method: 'GET',
          url: 'http://localhost:3002/api/test/comments',
          status: 200,
          type: 'fetch',
          contentType: 'application/json',
          timestamp: Date.now()
        }
      ];

      console.log(`   Captured ${networkRequests.length} network requests`);

      // Step 6: Submit network data
      console.log('\n6️⃣  Submitting network data to backend...');
      res = await makeRequest('PUT', '/api/extension/crawl', {
        requestId: crawl.requestId,
        networkRequests: networkRequests,
        action: 'add_requests'
      });
      console.log(`   Status: ${res.status}`);
      console.log(`   Response: ${JSON.stringify(res.body)}`);

      // Step 7: Wait for crawl to complete
      console.log('\n7️⃣  Waiting for crawl to complete...');
      console.log('   (This would normally be handled by SSE stream)');
      console.log('   Crawl should complete with 6 endpoints');
    } else {
      console.log('   ⚠️  No pending crawls found');
      console.log('   This is expected if the crawl already completed');
    }

    console.log('\n✅ Simulation complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

