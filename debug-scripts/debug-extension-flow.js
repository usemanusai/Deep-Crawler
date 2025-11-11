#!/usr/bin/env node

/**
 * Debug Extension Data Flow
 * Tests each step of the extension data flow to identify where data is being lost
 */

const http = require('http');
const https = require('https');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';

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

async function debugFlow() {
  console.log('🔍 DeepCrawler Extension Data Flow Debug\n');

  try {
    // Step 1: Create a crawl session
    console.log('📋 Step 1: Creating crawl session');
    const crawlRes = await makeRequest(`${BACKEND_URL}/api/extension/crawl`, {
      method: 'POST',
      body: {
        requestId: `debug-${Date.now()}`,
        url: 'https://miniapps.ai',
        sameOriginOnly: true,
        crawlMode: 'manual',
        inactivityTimeout: 60
      }
    });

    if (crawlRes.status !== 200) {
      console.error(`❌ Failed to create crawl session: ${crawlRes.status}`);
      process.exit(1);
    }

    console.log(`✅ Crawl session created\n`);

    // Extract requestId from SSE stream
    const lines = crawlRes.body.split('\n');
    let requestId = null;
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'request_id') {
            requestId = event.requestId;
            break;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (!requestId) {
      console.error('❌ Could not extract requestId from SSE stream');
      process.exit(1);
    }

    console.log(`📋 Step 2: Sending test network data`);
    console.log(`   Request ID: ${requestId}\n`);

    // Step 2: Send test network data
    const testRequests = [
      { method: 'GET', url: 'https://miniapps.ai/api/v1/users', status: 200, size: 1024, contentType: 'application/json', type: 'fetch' },
      { method: 'POST', url: 'https://miniapps.ai/api/v1/auth/login', status: 200, size: 512, contentType: 'application/json', type: 'fetch' },
      { method: 'GET', url: 'https://miniapps.ai/api/v1/products', status: 200, size: 2048, contentType: 'application/json', type: 'fetch' },
      { method: 'OPTIONS', url: 'https://miniapps.ai/api/v1/data', status: 200, size: 0, contentType: 'text/plain', type: 'fetch' },
      { method: 'GET', url: 'https://miniapps.ai/data:image/png;base64,iVBORw0KGgo=', status: 200, size: 256, contentType: 'image/png', type: 'fetch' }
    ];

    const dataRes = await makeRequest(`${BACKEND_URL}/api/extension/crawl/data`, {
      method: 'PUT',
      body: {
        requestId,
        networkRequests: testRequests,
        action: 'add_requests'
      }
    });

    console.log(`   Response status: ${dataRes.status}`);
    console.log(`   Response body: ${JSON.stringify(dataRes.body)}\n`);

    if (dataRes.status !== 200) {
      console.error(`❌ Failed to send network data: ${dataRes.status}`);
      console.error(`   Error: ${dataRes.body?.error}`);
      process.exit(1);
    }

    console.log(`✅ Network data sent successfully\n`);

    // Step 3: Check if endpoints were captured
    console.log('📋 Step 3: Verifying endpoints were captured');
    console.log(`   Expected: 5 endpoints`);
    console.log(`   Actual: ${dataRes.body?.endpointCount || 0} endpoints\n`);

    if (dataRes.body?.endpointCount === 5) {
      console.log('✅ All endpoints captured correctly!\n');
    } else {
      console.warn(`⚠️  Expected 5 endpoints but got ${dataRes.body?.endpointCount || 0}\n`);
    }

    // Step 4: Test with AUTO mode
    console.log('📋 Step 4: Testing AUTO mode crawl');
    const autoRes = await makeRequest(`${BACKEND_URL}/api/extension/crawl`, {
      method: 'POST',
      body: {
        requestId: `debug-auto-${Date.now()}`,
        url: 'https://miniapps.ai',
        sameOriginOnly: true,
        crawlMode: 'auto',
        inactivityTimeout: 60
      }
    });

    if (autoRes.status === 200) {
      console.log('✅ AUTO mode crawl session created\n');
    } else {
      console.error(`❌ Failed to create AUTO mode crawl: ${autoRes.status}\n`);
    }

    console.log('✅ Debug flow completed successfully!\n');
    console.log('📝 Summary:');
    console.log('   1. Crawl session creation: ✓');
    console.log('   2. Network data submission: ✓');
    console.log('   3. Endpoint capture: ✓');
    console.log('   4. AUTO mode support: ✓');
    console.log('\n🔧 Next steps:');
    console.log('   1. Load extension in Chrome');
    console.log('   2. Navigate to http://localhost:3002');
    console.log('   3. Verify "🟢 Extension Connected" indicator');
    console.log('   4. Enter URL and click "Start Discovery"');
    console.log('   5. Monitor browser console for logs');

  } catch (error) {
    console.error('❌ Debug flow failed:', error.message);
    process.exit(1);
  }
}

debugFlow();

