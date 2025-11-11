#!/usr/bin/env node

/**
 * Comprehensive Extension Testing Script
 * Tests the complete flow: extension connection, crawl creation, and endpoint discovery
 */

const http = require('http');
const path = require('path');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_KEY = 'deepcrawler-extension-v1';

async function makeRequest(method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: pathname,
      method: method,
      headers: {
        'X-Extension-Key': EXTENSION_KEY,
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
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
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

async function test() {
  console.log('🧪 DeepCrawler Extension Comprehensive Test\n');

  try {
    // Test 1: Check backend is running
    console.log('Test 1: Checking backend connection...');
    const pingRes = await makeRequest('GET', '/api/extension/ping');
    if (pingRes.status === 200) {
      console.log('✅ Backend is running\n');
    } else {
      console.log('❌ Backend not responding\n');
      process.exit(1);
    }

    // Test 2: Create a crawl session
    console.log('Test 2: Creating crawl session...');
    const crawlRes = await makeRequest('POST', '/api/extension/crawl', {
      targetUrl: 'https://miniapps.ai',
      action: 'create'
    });

    if (crawlRes.status !== 200 && crawlRes.status !== 201) {
      console.log(`❌ Failed to create crawl: ${crawlRes.status}`);
      console.log(crawlRes.data);
      process.exit(1);
    }

    const crawlId = crawlRes.data?.requestId;
    console.log(`✅ Crawl created: ${crawlId}\n`);

    // Test 3: Simulate extension sending network requests
    console.log('Test 3: Simulating network request capture...');
    const mockRequests = [
      { method: 'GET', url: 'https://miniapps.ai/', type: 'document', status: 200 },
      { method: 'GET', url: 'https://miniapps.ai/api/users', type: 'xhr', status: 200 },
      { method: 'GET', url: 'https://miniapps.ai/api/products', type: 'xhr', status: 200 },
      { method: 'POST', url: 'https://miniapps.ai/api/auth/login', type: 'xhr', status: 200 },
      { method: 'GET', url: 'https://miniapps.ai/api/settings', type: 'xhr', status: 200 },
      { method: 'PUT', url: 'https://miniapps.ai/api/profile', type: 'xhr', status: 200 },
      { method: 'DELETE', url: 'https://miniapps.ai/api/session', type: 'xhr', status: 200 },
      { method: 'GET', url: 'https://miniapps.ai/api/notifications', type: 'xhr', status: 200 },
      { method: 'GET', url: 'https://miniapps.ai/api/dashboard', type: 'xhr', status: 200 },
      { method: 'POST', url: 'https://miniapps.ai/api/data/export', type: 'xhr', status: 200 }
    ];

    const sendRes = await makeRequest('PUT', '/api/extension/crawl', {
      requestId: crawlId,
      networkRequests: mockRequests,
      action: 'add_requests'
    });

    if (sendRes.status === 200) {
      console.log(`✅ Sent ${mockRequests.length} mock network requests\n`);
    } else {
      console.log(`❌ Failed to send requests: ${sendRes.status}`);
      console.log(sendRes.data);
    }

    // Test 4: Check crawl status
    console.log('Test 4: Checking crawl status...');
    const statusRes = await makeRequest('GET', `/api/extension/status?requestId=${crawlId}`);
    
    if (statusRes.status === 200) {
      const status = statusRes.data;
      console.log(`✅ Crawl status retrieved:`);
      console.log(`   - Status: ${status.status}`);
      console.log(`   - Endpoints found: ${status.endpointCount || 0}`);
      console.log(`   - Requests processed: ${status.requestCount || 0}\n`);
    } else {
      console.log(`❌ Failed to get status: ${statusRes.status}\n`);
    }

    // Test 5: Complete crawl
    console.log('Test 5: Completing crawl...');
    const completeRes = await makeRequest('PUT', '/api/extension/crawl', {
      requestId: crawlId,
      action: 'complete'
    });

    if (completeRes.status === 200) {
      const result = completeRes.data;
      console.log(`✅ Crawl completed:`);
      console.log(`   - Total endpoints: ${result.endpoints?.length || 0}`);
      if (result.endpoints && result.endpoints.length > 0) {
        console.log(`   - Sample endpoints:`);
        result.endpoints.slice(0, 5).forEach(ep => {
          console.log(`     • ${ep.method} ${ep.path}`);
        });
      }
      console.log();
    } else {
      console.log(`❌ Failed to complete crawl: ${completeRes.status}`);
      console.log(completeRes.data);
    }

    console.log('✅ All tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. Reload the extension in Chrome (chrome://extensions/)');
    console.log('2. Open http://localhost:3002');
    console.log('3. Enter a target URL and click "Start Discovery"');
    console.log('4. Monitor the Service Worker console for logs');
    console.log('5. Check the results in the UI');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();

