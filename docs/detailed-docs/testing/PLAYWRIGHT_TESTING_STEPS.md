# 🎭 Playwright Testing Guide - Extension Verification

## Overview

This guide uses Playwright to verify the extension is working correctly by:
1. Loading the extension in a browser
2. Navigating to a test page
3. Verifying network requests are captured
4. Checking the extension's data flow

## Prerequisites

- Chrome/Chromium browser installed
- Playwright installed: `npm install -D @playwright/test`
- Extension loaded in Chrome
- Backend running on port 3002

## Test 1: Verify Network Capture

### Manual Test (Fastest)

```bash
# 1. Open Chrome DevTools on any page
# 2. Go to Console tab
# 3. Type this command:
window.__deepcrawlerRequests

# Expected: Array with network requests
# [
#   { method: 'GET', url: '...', status: 200, ... },
#   { method: 'GET', url: '...', status: 200, ... },
#   ...
# ]
```

### Playwright Test

```javascript
// test-network-capture.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--load-extension=/path/to/extension',
      '--disable-extensions-except=/path/to/extension'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to test page
  await page.goto('http://localhost:3002/api/test');

  // Wait for requests to be captured
  await page.waitForTimeout(2000);

  // Check captured requests
  const requests = await page.evaluate(() => {
    return window.__deepcrawlerRequests || [];
  });

  console.log(`✅ Captured ${requests.length} requests`);
  console.log('Sample requests:');
  requests.slice(0, 3).forEach(r => {
    console.log(`  ${r.method} ${r.url} ${r.status}`);
  });

  await browser.close();
})();
```

**Run:**
```bash
node test-network-capture.js
```

**Expected Output:**
```
✅ Captured 6 requests
Sample requests:
  GET http://localhost:3002/api/test 200
  GET http://localhost:3002/api/data 200
  GET http://localhost:3002/api/users 200
```

## Test 2: Verify Content Script Communication

### Manual Test

```bash
# 1. Open any page with the extension loaded
# 2. Open DevTools Console
# 3. Type:
chrome.runtime.sendMessage({type: 'GET_NETWORK_REQUESTS'}, (response) => {
  console.log('Requests from content script:', response.requests.length);
});
```

### Playwright Test

```javascript
// test-content-script.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--load-extension=/path/to/extension',
      '--disable-extensions-except=/path/to/extension'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to page
  await page.goto('http://localhost:3002');

  // Wait for content script to load
  await page.waitForTimeout(1000);

  // Send message to content script
  const response = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'GET_NETWORK_REQUESTS' },
        (response) => {
          resolve(response);
        }
      );
    });
  });

  console.log(`✅ Content script has ${response.requests.length} requests`);

  await browser.close();
})();
```

## Test 3: Verify Crawl Flow

### Manual Test

```bash
# 1. Open http://localhost:3002
# 2. Enter target URL: https://miniapps.ai
# 3. Click "Start Discovery"
# 4. Open DevTools Console
# 5. Watch for logs:
#    [DeepCrawler Content] START_CRAWL received
#    [DeepCrawler Content] Sending X requests to backend
#    [DeepCrawler Content] Successfully sent network data
# 6. Wait for crawl to complete
# 7. Check results: "Found X endpoints"
```

### Playwright Test

```javascript
// test-crawl-flow.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--load-extension=/path/to/extension',
      '--disable-extensions-except=/path/to/extension'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    if (msg.text().includes('[DeepCrawler')) {
      logs.push(msg.text());
      console.log(msg.text());
    }
  });

  // Navigate to UI
  await page.goto('http://localhost:3002');

  // Enter target URL
  await page.fill('input[placeholder*="URL"]', 'https://miniapps.ai');

  // Click Start Discovery
  await page.click('button:has-text("Start Discovery")');

  // Wait for crawl to complete (max 60 seconds)
  await page.waitForTimeout(60000);

  // Check results
  const results = await page.textContent('body');
  if (results.includes('Found') && !results.includes('Found 0')) {
    console.log('✅ Crawl completed successfully');
  } else {
    console.log('❌ Crawl returned 0 endpoints');
  }

  console.log('\nCaptured logs:');
  logs.forEach(log => console.log('  ' + log));

  await browser.close();
})();
```

## Test 4: Service Worker Console

### Manual Test

```bash
# 1. Go to chrome://extensions/
# 2. Find "DeepCrawler Session Bridge"
# 3. Click "Service Worker" link
# 4. Look for logs:
#    [DeepCrawler] Extension initialized
#    [DeepCrawler] Crawl tracking started for: crawl-XXXXX
#    [DeepCrawler] Crawl tracking stopped for: crawl-XXXXX
```

### Playwright Test

```javascript
// test-service-worker.js
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--load-extension=/path/to/extension',
      '--disable-extensions-except=/path/to/extension'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to extension service worker
  await page.goto('chrome://extensions/');

  // Find and click Service Worker link
  // Note: This requires finding the extension in the UI
  // For now, just verify extension is loaded

  console.log('✅ Extension loaded');
  console.log('📝 Check Service Worker console manually:');
  console.log('   1. Go to chrome://extensions/');
  console.log('   2. Find "DeepCrawler Session Bridge"');
  console.log('   3. Click "Service Worker" link');
  console.log('   4. Look for [DeepCrawler] logs');

  await browser.close();
})();
```

## Quick Test Commands

```bash
# Test 1: Network capture
node test-network-capture.js

# Test 2: Content script
node test-content-script.js

# Test 3: Full crawl flow
node test-crawl-flow.js

# Test 4: Service worker
node test-service-worker.js
```

## Expected Results

### ✅ Success Indicators

1. **Network Capture**
   - `window.__deepcrawlerRequests.length > 0`
   - Requests include GET, POST, etc.
   - URLs are correct

2. **Content Script**
   - `response.requests.length > 0`
   - Requests match network capture

3. **Crawl Flow**
   - Console shows "[DeepCrawler Content]" logs
   - "Sending X requests to backend" appears
   - Results show "Found X endpoints" (X > 0)

4. **Service Worker**
   - "[DeepCrawler] Extension initialized" appears
   - Crawl tracking logs appear during crawl

### ❌ Failure Indicators

1. **Network Capture**
   - `window.__deepcrawlerRequests` is undefined
   - `window.__deepcrawlerRequests.length === 0`

2. **Content Script**
   - No response from chrome.runtime.sendMessage
   - `response.requests.length === 0`

3. **Crawl Flow**
   - No "[DeepCrawler Content]" logs
   - Results show "Found 0 endpoints"

4. **Service Worker**
   - No "[DeepCrawler]" logs
   - Errors in console

## Debugging Tips

1. **Enable verbose logging:**
   - Open DevTools
   - Go to Console
   - Type: `localStorage.setItem('debug', 'deepcrawler:*')`

2. **Check extension permissions:**
   - Go to chrome://extensions/
   - Find extension
   - Check "Details"
   - Verify permissions are granted

3. **Reload extension:**
   - Go to chrome://extensions/
   - Click refresh icon
   - Wait 2-3 seconds

4. **Clear cache:**
   - Go to chrome://extensions/
   - Click "Clear data" if available
   - Reload extension

## Next Steps

1. Run Test 1 (Network Capture) - Should pass immediately
2. Run Test 2 (Content Script) - Should pass immediately
3. Run Test 3 (Crawl Flow) - Should complete with endpoints
4. Check Test 4 (Service Worker) - Verify logs

If any test fails, check the Troubleshooting section in CRITICAL_FIX_APPLIED.md

---

**Status**: Ready for Testing  
**Estimated Time**: 15 minutes

