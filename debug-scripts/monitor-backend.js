/**
 * Monitor backend for extension activity
 * This script polls the backend to see what's happening
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3002';
const POLL_INTERVAL = 1000; // 1 second

let lastStatus = null;
let pollCount = 0;

async function checkBackendStatus() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/extension/status`);
    const data = await response.json();
    
    pollCount++;
    
    // Only log if status changed or every 10 polls
    if (JSON.stringify(data) !== JSON.stringify(lastStatus) || pollCount % 10 === 0) {
      console.log(`\n[Poll #${pollCount}] Extension Status:`);
      console.log(`  Connected: ${data.connected}`);
      console.log(`  Last Heartbeat: ${data.lastHeartbeatMs ? new Date(data.lastHeartbeatMs).toISOString() : 'Never'}`);
      console.log(`  Time since heartbeat: ${data.lastHeartbeatMs ? Date.now() - data.lastHeartbeatMs : 'N/A'}ms`);
      
      lastStatus = data;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Failed to check backend status:', error.message);
    return null;
  }
}

async function checkPendingCrawls() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/extension/crawl/pending`, {
      headers: {
        'X-Extension-Key': 'deepcrawler-extension-v1'
      }
    });
    const data = await response.json();
    
    if (data.pendingCrawls && data.pendingCrawls.length > 0) {
      console.log(`\n⚠️  Pending Crawls: ${data.pendingCrawls.length}`);
      data.pendingCrawls.forEach(crawl => {
        console.log(`  - ${crawl.requestId}: ${crawl.url}`);
      });
    }
    
    return data;
  } catch (error) {
    // Silently ignore
    return null;
  }
}

async function main() {
  console.log('🔍 Backend Monitor Started');
  console.log(`📍 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Poll Interval: ${POLL_INTERVAL}ms`);
  console.log('');
  console.log('Monitoring extension status...');
  console.log('Press Ctrl+C to stop');
  console.log('');

  // Initial check
  await checkBackendStatus();
  await checkPendingCrawls();

  // Poll every second
  setInterval(async () => {
    await checkBackendStatus();
    await checkPendingCrawls();
  }, POLL_INTERVAL);
}

main().catch(console.error);

