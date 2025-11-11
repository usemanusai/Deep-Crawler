#!/usr/bin/env node

/**
 * Extension Connection Test
 * 
 * This script tests if the extension is connected to the backend
 * by checking the extension status endpoint
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';
const CHECK_INTERVAL = 5000; // 5 seconds
const MAX_CHECKS = 12; // 60 seconds total

let checkCount = 0;

function checkExtensionStatus() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_URL}/api/extension/status`);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runTest() {
  console.log('🔍 Extension Connection Test');
  console.log('============================\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`API Key: ${EXTENSION_API_KEY}`);
  console.log(`Check Interval: ${CHECK_INTERVAL}ms`);
  console.log(`Max Checks: ${MAX_CHECKS}\n`);

  const startTime = Date.now();

  const checkLoop = setInterval(async () => {
    checkCount++;
    const elapsed = Date.now() - startTime;
    const elapsedSec = Math.round(elapsed / 1000);

    try {
      const status = await checkExtensionStatus();
      
      console.log(`[${elapsedSec}s] Check #${checkCount}:`);
      console.log(`  Status: ${status.status}`);
      console.log(`  Connected: ${status.status === 'connected' ? '✅ YES' : '❌ NO'}`);
      console.log(`  Last Heartbeat: ${status.lastHeartbeatMs ? new Date(status.lastHeartbeatMs).toISOString() : 'Never'}`);
      
      if (status.status === 'connected') {
        console.log('\n✅ SUCCESS: Extension is connected!\n');
        clearInterval(checkLoop);
        process.exit(0);
      }
    } catch (error) {
      console.log(`[${elapsedSec}s] Check #${checkCount}: ❌ Error - ${error.message}`);
    }

    if (checkCount >= MAX_CHECKS) {
      console.log('\n❌ FAILED: Extension did not connect within 60 seconds\n');
      console.log('Troubleshooting steps:');
      console.log('1. Make sure extension is loaded in chrome://extensions/');
      console.log('2. Check service worker console for errors');
      console.log('3. Verify backend is running on port 3002');
      console.log('4. Reload extension and try again');
      clearInterval(checkLoop);
      process.exit(1);
    }
  }, CHECK_INTERVAL);
}

// Run the test
runTest().catch((error) => {
  console.error('❌ Test error:', error);
  process.exit(1);
});

