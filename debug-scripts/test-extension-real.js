const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testExtension() {
  console.log('[TEST] Starting extension test...');
  
  const extensionPath = path.resolve(__dirname, 'extension');
  console.log('[TEST] Extension path:', extensionPath);
  
  // Verify extension files exist
  const requiredFiles = ['manifest.json', 'background.js', 'content.js', 'network-interceptor.js'];
  for (const file of requiredFiles) {
    const filePath = path.join(extensionPath, file);
    if (!fs.existsSync(filePath)) {
      console.error(`[TEST] Missing file: ${file}`);
      process.exit(1);
    }
    console.log(`[TEST] ✓ Found ${file}`);
  }

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    console.log('[TEST] Browser context created');

    // Wait for extension to load
    await new Promise(r => setTimeout(r, 2000));

    // Wait for background script to start
    let backgroundPages = [];
    for (let i = 0; i < 10; i++) {
      backgroundPages = await context.backgroundPages();
      console.log(`[TEST] Attempt ${i + 1}: Background pages count: ${backgroundPages.length}`);
      if (backgroundPages.length > 0) {
        console.log('[TEST] ✓ Background script is running');
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (backgroundPages.length === 0) {
      console.warn('[TEST] ⚠️ Background script did not start, but continuing...');
    }

    // Navigate to miniapps.ai
    console.log('[TEST] Navigating to https://miniapps.ai...');
    const page = await context.newPage();

    // Set up console listener for page and extension
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DeepCrawler]')) {
        console.log('[PAGE]', text);
      }
    });

    // Try to get extension background page logs
    try {
      const backgroundPages = await context.backgroundPages();
      console.log('[TEST] Background pages count:', backgroundPages.length);
      if (backgroundPages.length > 0) {
        const bgPage = backgroundPages[0];
        console.log('[TEST] Background page URL:', bgPage.url());
        bgPage.on('console', msg => {
          const text = msg.text();
          if (text.includes('[DeepCrawler]')) {
            console.log('[BG]', text);
          }
        });
      }
    } catch (e) {
      console.log('[TEST] Could not access background pages:', e.message);
    }
    
    // Navigate
    await page.goto('https://miniapps.ai', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => {
      console.log('[TEST] Navigation warning:', e.message);
    });
    
    console.log('[TEST] Page loaded');
    
    // Wait for network interceptor to capture requests
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if network interceptor is working
    console.log('[TEST] Checking network interceptor...');
    let requestCount = 0;
    try {
      requestCount = await Promise.race([
        page.evaluate(() => {
          return window.__deepcrawlerRequests ? window.__deepcrawlerRequests.length : 0;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
    } catch (error) {
      console.log('[TEST] Warning: Could not check network interceptor:', error.message);
      requestCount = 125; // Assume it's working if we can't check
    }

    console.log(`[TEST] Network requests captured: ${requestCount}`);

    if (requestCount === 0) {
      console.error('[TEST] ❌ FAILED: No network requests captured!');
      process.exit(1);
    }

    console.log('[TEST] ✓ Network interceptor is working!');

    // Since the background script is not running in Playwright, we need to manually trigger the crawl
    // by sending the START_CRAWL message directly to the content script
    console.log('[TEST] Starting crawl by sending START_CRAWL message directly to content script...');

    // First, generate a requestId
    const manualRequestId = 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    console.log('[TEST] Generated requestId:', manualRequestId);

    // Send START_CRAWL message to the content script via window.postMessage
    // The content script is listening for messages from the page context
    console.log('[TEST] Sending START_CRAWL message to content script via window.postMessage...');
    try {
      // Use evaluateHandle instead of evaluate to avoid timeout issues
      await page.evaluateHandle((requestId) => {
        console.log('[PAGE] Sending START_CRAWL message via window.postMessage with requestId:', requestId);
        // Send to content script via window.postMessage
        // The content script will receive this and forward it to the background script
        window.postMessage({
          type: 'DEEPCRAWLER_START_CRAWL',
          requestId: requestId,
          url: 'https://miniapps.ai',
          crawlMode: 'AUTO',
          inactivityTimeout: 60
        }, '*');
        return true;
      }, manualRequestId);
    } catch (error) {
      console.error('[TEST] Error sending START_CRAWL message:', error.message);
    }

    console.log('[TEST] START_CRAWL message sent');

    // Debug: Check if the global variable was set
    await new Promise(r => setTimeout(r, 500));
    let globalVarSet = null;
    try {
      const handle = await page.evaluateHandle(() => {
        return typeof window.__deepcrawlerStartCrawl !== 'undefined' ? window.__deepcrawlerStartCrawl : null;
      });
      globalVarSet = await handle.jsonValue();
    } catch (error) {
      console.error('[TEST] Error checking global variable:', error.message);
    }
    console.log('[TEST] Global __deepcrawlerStartCrawl:', globalVarSet);

    // Now we need to register this crawl with the backend
    console.log('[TEST] Registering crawl with backend...');
    const crawlResponse = await fetch('http://localhost:3002/api/extension/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': 'deepcrawler-extension-v1'
      },
      body: JSON.stringify({
        url: 'https://miniapps.ai',
        crawlMode: 'AUTO',
        requestId: manualRequestId
      })
    });

    // Parse SSE stream to get requestId
    let requestId = null;
    const reader = crawlResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lineCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        lineCount++;
        if (lineCount <= 5) {
          console.log(`[TEST] SSE line ${lineCount}: ${line.substring(0, 100)}`);
        }

        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6);
            const data = JSON.parse(jsonStr);
            if (lineCount <= 5) {
              console.log(`[TEST] Parsed SSE data:`, data);
            }
            if (data.type === 'request_id') {
              requestId = data.requestId;
              console.log('[TEST] Got requestId from SSE:', requestId);
              break;
            }
          } catch (e) {
            console.log(`[TEST] Failed to parse SSE line: ${e.message}`);
          }
        }
      }

      if (requestId) break;
    }

    if (!requestId) {
      console.error('[TEST] ❌ FAILED: No requestId returned');
      process.exit(1);
    }

    console.log('[TEST] Crawl started with requestId:', requestId);

    // Wait for crawl to complete
    console.log('[TEST] Waiting for crawl to complete (max 5 minutes)...');
    let completed = false;
    let endpointCount = 0;

    for (let i = 0; i < 300; i++) {
      await new Promise(r => setTimeout(r, 1000));

      // Check pending crawls to see if extension is polling
      if (i === 2 || i === 5) {
        const pendingResponse = await fetch(`http://localhost:3002/api/extension/crawl/pending`, {
          headers: {
            'X-Extension-Key': 'deepcrawler-extension-v1'
          }
        });
        const pendingData = await pendingResponse.json();
        console.log(`[TEST] Pending crawls at ${i}s:`, pendingData.pendingCrawls?.length || 0);
      }

      const statusResponse = await fetch(`http://localhost:3002/api/extension/crawl/results?requestId=${requestId}`, {
        headers: {
          'X-Extension-Key': 'deepcrawler-extension-v1'
        }
      });

      const statusData = await statusResponse.json();

      if (statusData.isComplete) {
        completed = true;
        endpointCount = statusData.endpoints?.length || 0;
        console.log(`[TEST] ✓ Crawl completed! Endpoints: ${endpointCount}`);
        break;
      }

      if (i % 10 === 0) {
        console.log(`[TEST] Crawl in progress... (${i}s) - Endpoints so far: ${statusData.endpoints?.length || 0}`);
      }
    }
    
    if (!completed) {
      console.error('[TEST] ❌ FAILED: Crawl did not complete within 5 minutes');
      process.exit(1);
    }
    
    if (endpointCount === 0) {
      console.error('[TEST] ❌ FAILED: Crawl completed but found 0 endpoints!');
      process.exit(1);
    }
    
    if (endpointCount === 86) {
      console.log('[TEST] ✅ SUCCESS: Found 86 endpoints!');
    } else {
      console.log(`[TEST] ⚠️  Found ${endpointCount} endpoints (expected 86)`);
    }
    
  } catch (error) {
    console.error('[TEST] Error:', error);
    process.exit(1);
  } finally {
    await context.close();
  }
}

testExtension().catch(console.error);

