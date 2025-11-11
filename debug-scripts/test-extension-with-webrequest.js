#!/usr/bin/env node

/**
 * Test script to verify webRequest listener is working
 * This script checks if the extension is properly capturing network requests
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';

async function makeRequest(method, path, body = null) {
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

async function main() {
  console.log('🧪 DeepCrawler Extension - webRequest Listener Test\n');

  try {
    // Step 1: Check extension status
    console.log('Step 1: Checking extension status...');
    const statusRes = await makeRequest('GET', '/api/extension/status');
    console.log(`  Status: ${statusRes.status}`);
    console.log(`  Connected: ${statusRes.body?.connected}`);
    console.log(`  Last Heartbeat: ${statusRes.body?.lastHeartbeatMs}`);

    if (!statusRes.body?.connected) {
      console.log('\n❌ Extension is not connected!');
      console.log('   Make sure the extension is loaded in Chrome');
      process.exit(1);
    }

    console.log('  ✅ Extension is connected\n');

    // Step 2: Create a test crawl
    console.log('Step 2: Creating test crawl...');
    const crawlRes = await makeRequest('POST', '/api/crawl', {
      url: 'http://localhost:3002/api/test',
      seedHost: 'localhost:3002',
      sameOriginOnly: true
    });

    if (crawlRes.status !== 200) {
      console.log(`  ❌ Failed to create crawl: ${crawlRes.status}`);
      console.log(`  Response: ${JSON.stringify(crawlRes.body)}`);
      process.exit(1);
    }

    const crawlId = crawlRes.body?.requestId;
    console.log(`  ✅ Crawl created: ${crawlId}\n`);

    // Step 3: Wait for crawl to complete
    console.log('Step 3: Waiting for crawl to complete...');
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const resultRes = await makeRequest('GET', `/api/crawl/${crawlId}`);
      if (resultRes.status === 200) {
        const result = resultRes.body;
        console.log(`  Attempt ${attempts}: Status = ${result.status}, Endpoints = ${result.endpoints?.length || 0}`);

        if (result.status === 'completed') {
          completed = true;
          console.log(`\n  ✅ Crawl completed!\n`);
          console.log(`  Total Endpoints: ${result.endpoints?.length || 0}`);
          
          if (result.endpoints && result.endpoints.length > 0) {
            console.log(`\n  Sample Endpoints:`);
            result.endpoints.slice(0, 5).forEach(ep => {
              console.log(`    - ${ep.method} ${ep.path}`);
            });
          } else {
            console.log(`\n  ❌ No endpoints discovered!`);
            console.log(`  This means the webRequest listener is not capturing requests`);
          }
        }
      }
    }

    if (!completed) {
      console.log(`\n  ❌ Crawl timed out after ${maxAttempts} seconds`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

