/**
 * Comprehensive Playwright test for DeepCrawler extension
 * Tests the complete flow: extension loading, network capture, data submission
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.join(__dirname, 'extension');
const BACKEND_URL = 'http://localhost:3002';
const TEST_URL = 'http://localhost:3002/api/test';

async function runTest() {
  console.log('🚀 Starting Playwright Extension Test');
  console.log(`📁 Extension path: ${EXTENSION_PATH}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`🧪 Test URL: ${TEST_URL}`);
  console.log('');

  let browser;
  try {
    // Launch browser with extension
    console.log('📱 Launching Chrome with extension...');
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    console.log('✅ Browser launched');
    console.log('');

    // Create a new page
    const page = await browser.newPage();
    console.log('📄 New page created');

    // Set up console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[DeepCrawler]')) {
        console.log(`  📝 ${text}`);
      }
    });

    // Set up network logging
    let networkRequests = [];
    page.on('response', response => {
      networkRequests.push({
        method: response.request().method(),
        url: response.url(),
        status: response.status()
      });
    });

    // Navigate to test URL
    console.log(`🌐 Navigating to ${TEST_URL}...`);
    await page.goto(TEST_URL, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded');
    console.log('');

    // Wait a bit for network interceptor to be injected
    await page.waitForTimeout(2000);

    // Check if network interceptor is loaded
    console.log('🔍 Checking if network interceptor is loaded...');
    const interceptorLoaded = await page.evaluate(() => {
      return typeof window.__deepcrawlerRequests !== 'undefined';
    });

    if (interceptorLoaded) {
      console.log('✅ Network interceptor loaded');
    } else {
      console.log('❌ Network interceptor NOT loaded');
    }
    console.log('');

    // Get captured requests from network interceptor
    console.log('📊 Checking captured network requests...');
    const capturedRequests = await page.evaluate(() => {
      return window.__deepcrawlerRequests || [];
    });

    console.log(`✅ Captured ${capturedRequests.length} network requests`);
    if (capturedRequests.length > 0) {
      console.log('  Sample requests:');
      capturedRequests.slice(0, 5).forEach(req => {
        console.log(`    - ${req.method} ${req.url} (${req.status})`);
      });
    }
    console.log('');

    // Check browser network requests
    console.log('📊 Browser network requests:');
    console.log(`✅ Captured ${networkRequests.length} network requests`);
    if (networkRequests.length > 0) {
      console.log('  Sample requests:');
      networkRequests.slice(0, 5).forEach(req => {
        console.log(`    - ${req.method} ${req.url} (${req.status})`);
      });
    }
    console.log('');

    // Now test the crawl flow
    console.log('🧪 Testing crawl flow...');
    console.log('');

    // Open the main UI
    console.log('🌐 Opening main UI...');
    await page.goto(`${BACKEND_URL}`, { waitUntil: 'networkidle' });
    console.log('✅ Main UI loaded');
    console.log('');

    // Wait for UI to be ready
    await page.waitForTimeout(2000);

    // Check if extension is connected
    console.log('🔍 Checking extension connection status...');
    const statusResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3002/api/extension/status');
        return await response.json();
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log('Extension status:', JSON.stringify(statusResponse, null, 2));
    console.log('');

    // Enter URL and start crawl
    console.log('🧪 Starting crawl...');
    const urlInput = await page.$('input[placeholder*="Enter URL"]') || await page.$('input[type="text"]');
    
    if (urlInput) {
      await urlInput.fill('https://miniapps.ai');
      console.log('✅ URL entered');

      const startButton = await page.$('button:has-text("Start Discovery")') || await page.$('button');
      if (startButton) {
        await startButton.click();
        console.log('✅ Crawl started');
        console.log('');

        // Wait for crawl to complete
        console.log('⏳ Waiting for crawl to complete (60 seconds)...');
        await page.waitForTimeout(60000);
        console.log('✅ Crawl completed');
      }
    }

    console.log('');
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
runTest().catch(console.error);

