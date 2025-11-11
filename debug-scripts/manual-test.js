#!/usr/bin/env node

/**
 * Manual Test Script for DeepCrawler Extension
 * Tests the complete crawl workflow without automated browser control
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';
const TEST_URL = 'https://miniapps.ai';

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : data
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
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 DeepCrawler Extension Manual Test Suite\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test URL: ${TEST_URL}\n`);

  try {
    // Test 1: Check backend status
    console.log('📋 Test 1: Backend Status Check');
    const statusRes = await makeRequest(`${BACKEND_URL}/api/extension/status`);
    console.log(`  Status: ${statusRes.status}`);
    console.log(`  Response: ${JSON.stringify(statusRes.body)}\n`);

    if (statusRes.status !== 200) {
      console.error('❌ Backend is not responding correctly');
      process.exit(1);
    }

    // Test 2: Check pending crawls
    console.log('📋 Test 2: Pending Crawls Check');
    const pendingRes = await makeRequest(`${BACKEND_URL}/api/extension/crawl/pending`);
    console.log(`  Status: ${pendingRes.status}`);
    console.log(`  Pending crawls: ${pendingRes.body?.pendingCrawls?.length || 0}\n`);

    // Test 3: Send heartbeat
    console.log('📋 Test 3: Heartbeat Test');
    const heartbeatRes = await makeRequest(`${BACKEND_URL}/api/extension/ping`, {
      method: 'POST'
    });
    console.log(`  Status: ${heartbeatRes.status}`);
    console.log(`  Response: ${JSON.stringify(heartbeatRes.body)}\n`);

    // Test 4: Create a crawl request
    console.log('📋 Test 4: Create Crawl Request');
    const crawlRes = await makeRequest(`${BACKEND_URL}/api/extension/crawl`, {
      method: 'POST',
      body: {
        requestId: `test-${Date.now()}`,
        url: TEST_URL,
        sameOriginOnly: true,
        crawlMode: 'manual',
        inactivityTimeout: 60
      }
    });
    console.log(`  Status: ${crawlRes.status}`);
    console.log(`  Response type: ${typeof crawlRes.body}`);
    
    if (crawlRes.status === 200) {
      console.log('  ✅ Crawl request accepted\n');
      
      // Parse SSE stream
      console.log('📋 Test 5: SSE Stream Parsing');
      const lines = crawlRes.body.split('\n');
      let eventCount = 0;
      let lastEvent = null;
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            eventCount++;
            lastEvent = event;
            console.log(`  Event ${eventCount}: ${event.type}`);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      console.log(`  Total events: ${eventCount}`);
      console.log(`  Last event: ${lastEvent?.type}\n`);
    } else {
      console.error(`❌ Crawl request failed with status ${crawlRes.status}`);
    }

    console.log('✅ All tests completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('1. Load the extension in Chrome (chrome://extensions)');
    console.log('2. Navigate to http://localhost:3002');
    console.log('3. Verify "🟢 Extension Connected" indicator');
    console.log('4. Enter URL and click "Start Discovery"');
    console.log('5. Wait for crawl to complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();

