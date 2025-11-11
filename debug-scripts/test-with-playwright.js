/**
 * Playwright E2E Test for DeepCrawler Extension
 * Tests the complete flow with actual Chrome extension loaded
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_PATH = path.join(__dirname, 'extension');

async function main() {
  console.log('🎭 Playwright E2E Test for DeepCrawler Extension\n');

  // Verify extension path exists
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error(`❌ Extension path not found: ${EXTENSION_PATH}`);
    process.exit(1);
  }

  console.log(`✅ Extension path found: ${EXTENSION_PATH}\n`);

  // Launch browser with extension
  console.log('🚀 Launching Chrome with extension...');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  try {
    // Get all pages
    const pages = context.pages();
    console.log(`✅ Browser launched with ${pages.length} page(s)\n`);

    // Navigate to the UI
    console.log('📍 Navigating to UI...');
    const page = pages[0] || await context.newPage();
    await page.goto(BACKEND_URL, { waitUntil: 'networkidle' });
    console.log(`✅ UI loaded\n`);

    // Wait for connection status to show connected
    console.log('⏳ Waiting for extension to connect...');
    try {
      await page.waitForSelector('[data-testid="connection-status"]', { timeout: 5000 }).catch(() => null);
      const status = await page.textContent('[data-testid="connection-status"]').catch(() => 'unknown');
      console.log(`✅ Connection status: ${status}\n`);
    } catch (e) {
      console.log(`⚠️  Could not find connection status element\n`);
    }

    // Enter URL and start crawl
    console.log('🔍 Starting crawl for https://miniapps.ai...');
    await page.fill('input[placeholder*="https://"]', 'https://miniapps.ai');
    await page.click('button:has-text("Start Discovery")');
    console.log(`✅ Crawl initiated\n`);

    // Wait for results
    console.log('⏳ Waiting for crawl to complete (max 60 seconds)...');
    try {
      await page.waitForSelector('text=Found', { timeout: 60000 });
      const resultText = await page.textContent('text=Found');
      console.log(`✅ Crawl completed: ${resultText}\n`);

      // Extract endpoint count
      const match = resultText.match(/Found (\d+)/);
      if (match) {
        const count = parseInt(match[1]);
        console.log(`📊 Endpoints discovered: ${count}`);
        if (count > 0) {
          console.log(`✅ SUCCESS: Extension captured ${count} endpoints!\n`);
        } else {
          console.log(`❌ FAILURE: Extension captured 0 endpoints\n`);
        }
      }
    } catch (e) {
      console.log(`❌ Crawl did not complete within timeout\n`);
      console.log(`Error: ${e.message}\n`);
    }

    // Take screenshot
    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'test-result.png' });
    console.log(`✅ Screenshot saved to test-result.png\n`);

    // Check browser console for errors
    console.log('📋 Checking browser console...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   ❌ Console error: ${msg.text()}`);
      }
    });

    // Keep browser open for inspection
    console.log('🔍 Browser will stay open for inspection...');
    console.log('Press Ctrl+C to close');
    
    // Wait indefinitely
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await context.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

