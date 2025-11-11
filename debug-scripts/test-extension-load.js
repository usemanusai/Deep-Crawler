/**
 * Simple test to verify extension loads and sends heartbeat
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
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
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
  console.log('🔍 Checking Extension Status\n');

  // Check current status
  console.log('1️⃣  Checking current extension status...');
  let res = await makeRequest('GET', '/api/extension/status');
  console.log(`   Status: ${res.status}`);
  console.log(`   Connected: ${res.body?.status || 'unknown'}`);
  console.log(`   Last heartbeat: ${res.body?.lastHeartbeatMs || 'never'}\n`);

  if (res.body?.status === 'connected') {
    console.log('✅ Extension is already connected!');
    console.log('   The extension is loaded and sending heartbeats.\n');
  } else {
    console.log('❌ Extension is NOT connected');
    console.log('   The extension needs to be loaded in Chrome.\n');
    console.log('📋 To load the extension:');
    console.log('   1. Open Chrome');
    console.log('   2. Go to chrome://extensions/');
    console.log('   3. Enable "Developer mode"');
    console.log('   4. Click "Load unpacked"');
    console.log('   5. Select: hyperbrowser-app-examples/deep-crawler-bot/extension');
    console.log('   6. Wait 30 seconds for heartbeat to be sent\n');
  }

  // Monitor for connection
  console.log('⏳ Monitoring for extension connection (30 seconds)...\n');
  
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res = await makeRequest('GET', '/api/extension/status');
    const connected = res.body?.status === 'connected';
    const indicator = connected ? '🟢' : '⚪';
    
    process.stdout.write(`\r${indicator} [${i + 1}/30] Status: ${res.body?.status || 'unknown'}`);
    
    if (connected) {
      console.log('\n\n✅ Extension connected!');
      console.log(`   Last heartbeat: ${new Date(res.body.lastHeartbeatMs).toLocaleTimeString()}\n`);
      
      // Now test the full flow
      console.log('🧪 Testing full crawl flow...\n');
      
      // Initiate crawl
      console.log('2️⃣  Initiating crawl...');
      const crawlId = `test-${Date.now()}`;
      res = await makeRequest('POST', '/api/extension/crawl', {
        requestId: crawlId,
        url: 'https://miniapps.ai',
        sameOriginOnly: true
      });
      console.log(`   Status: ${res.status}`);
      console.log(`   Crawl ID: ${crawlId}\n`);
      
      // Check pending crawls
      console.log('3️⃣  Checking pending crawls...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      res = await makeRequest('GET', '/api/extension/crawl/pending');
      console.log(`   Status: ${res.status}`);
      console.log(`   Pending crawls: ${res.body?.pendingCrawls?.length || 0}`);
      
      if (res.body?.pendingCrawls?.length > 0) {
        const crawl = res.body.pendingCrawls[0];
        console.log(`   First crawl: ${crawl.requestId}`);
        console.log(`   URL: ${crawl.url}`);
        console.log(`   Seed host: ${crawl.seedHost}\n`);
        
        console.log('✅ Extension should now:');
        console.log('   1. Find the pending crawl');
        console.log('   2. Create a new tab with the URL');
        console.log('   3. Capture network requests');
        console.log('   4. Send data to backend\n');
        
        console.log('⏳ Waiting for extension to process crawl (30 seconds)...\n');
        
        for (let j = 0; j < 30; j++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          res = await makeRequest('GET', '/api/extension/crawl/pending');
          const pending = res.body?.pendingCrawls?.length || 0;
          
          process.stdout.write(`\r⏳ [${j + 1}/30] Pending crawls: ${pending}`);
          
          if (pending === 0) {
            console.log('\n\n✅ Crawl completed!');
            console.log('   The extension successfully processed the crawl.\n');
            break;
          }
        }
      } else {
        console.log('❌ No pending crawls found');
        console.log('   The extension may not be polling correctly.\n');
      }
      
      process.exit(0);
    }
  }
  
  console.log('\n\n❌ Extension did not connect within 30 seconds');
  console.log('   Please load the extension in Chrome and try again.\n');
  process.exit(1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

