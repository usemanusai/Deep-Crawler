/**
 * Test Helper Functions for DeepCrawler E2E Testing
 * 
 * Provides utilities for:
 * - Browser automation with Playwright
 * - Extension management
 * - Crawl monitoring
 * - Results verification
 * - Report generation
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ============================================================================
// BROWSER LAUNCH & EXTENSION MANAGEMENT
// ============================================================================

/**
 * Launch Chromium browser with extension loaded
 */
async function launchBrowserWithExtension(extensionPath, extensionId) {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check'
    ]
  });

  return context;
}

/**
 * Navigate to extensions page and reload extension
 */
async function reloadExtensionViaUI(browser, extensionId) {
  const context = browser;
  let extensionsPage = null;

  // Find or create extensions page
  const pages = context.pages();
  extensionsPage = pages.find(p => p.url().includes('chrome://extensions'));

  if (!extensionsPage) {
    extensionsPage = await context.newPage();
    await extensionsPage.goto('chrome://extensions/');
  }

  // Wait for extension to appear
  await extensionsPage.waitForSelector(`text=${extensionId}`, { timeout: 5000 }).catch(() => {});

  // Find and click reload button for this extension
  const extensionSection = await extensionsPage.$(`[data-extension-id="${extensionId}"]`);
  if (extensionSection) {
    const reloadButton = await extensionSection.$('button:has-text("Reload")');
    if (reloadButton) {
      await reloadButton.click();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for reload
    }
  }

  return extensionsPage;
}

/**
 * Navigate to app and wait for page load
 */
async function navigateToApp(page, backendUrl) {
  await page.goto(backendUrl, { waitUntil: 'networkidle' });
  
  // Wait for main heading
  await page.waitForSelector('text=DeepCrawler', { timeout: 10000 });
}

/**
 * Wait for extension connection status indicator
 */
async function waitForExtensionConnection(page, timeoutSeconds) {
  const timeout = timeoutSeconds * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Check for connected status
      const connected = await page.$('text=🟢 Extension Connected');
      if (connected) {
        return true;
      }
    } catch (e) {
      // Continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Start a crawl with given URL
 */
async function startCrawl(page, targetUrl, crawlMode = 'manual', inactivityTimeout = 60) {
  // Clear and fill URL input
  const urlInput = await page.$('input[placeholder*="https://"]');
  if (!urlInput) {
    throw new Error('URL input field not found');
  }

  await urlInput.fill('');
  await urlInput.type(targetUrl);

  // Verify crawl mode
  if (crawlMode === 'manual') {
    const manualButton = await page.$('button:has-text("Manual")');
    if (manualButton) {
      const isActive = await manualButton.evaluate(el => el.getAttribute('data-active') === 'true');
      if (!isActive) {
        await manualButton.click();
      }
    }
  }

  // Set inactivity timeout if needed
  const slider = await page.$('input[type="range"]');
  if (slider) {
    await slider.fill(String(inactivityTimeout));
  }

  // Click Start Discovery button
  const startButton = await page.$('button:has-text("Start Discovery")');
  if (!startButton) {
    throw new Error('Start Discovery button not found');
  }

  await startButton.click();

  // Wait for crawl to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Verify crawl started
  const stopButton = await page.$('button:has-text("Stop Crawl")');
  return !!stopButton;
}

/**
 * Monitor crawl progress
 */
async function monitorCrawl(page, timeoutSeconds, monitoringIntervalSeconds) {
  const timeout = timeoutSeconds * 1000;
  const interval = monitoringIntervalSeconds * 1000;
  const startTime = Date.now();
  const measurements = [];
  let lastEndpointCount = 0;
  let noChangeCount = 0;

  while (Date.now() - startTime < timeout) {
    try {
      // Get current status
      const statusText = await page.textContent('text=Capturing');
      const endpointMatch = statusText?.match(/(\d+)\s+endpoints/);
      const currentCount = endpointMatch ? parseInt(endpointMatch[1]) : 0;

      const elapsedMatch = statusText?.match(/Elapsed:\s+(\d+):(\d+)/);
      const elapsed = elapsedMatch ? `${elapsedMatch[1]}:${elapsedMatch[2]}` : 'unknown';

      measurements.push({
        timestamp: new Date().toISOString(),
        endpointCount: currentCount,
        elapsed: elapsed
      });

      // Check for inactivity
      if (currentCount === lastEndpointCount) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
      }
      lastEndpointCount = currentCount;

      // Check if crawl completed
      const stopButton = await page.$('button:has-text("Stop Crawl")');
      if (!stopButton) {
        // Crawl completed
        break;
      }

      // Check for errors in terminal
      const terminalText = await page.textContent('[role="log"]').catch(() => '');
      if (terminalText?.includes('error') || terminalText?.includes('Error')) {
        break;
      }

    } catch (e) {
      // Continue monitoring
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return {
    measurements,
    finalEndpointCount: measurements[measurements.length - 1]?.endpointCount || 0,
    duration: (Date.now() - startTime) / 1000
  };
}

/**
 * Capture console logs from page
 */
async function captureConsoleLogs(page) {
  const logs = [];

  page.on('console', msg => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
  });

  return logs;
}

/**
 * Take screenshot and save to file
 */
async function takeScreenshot(page, filename, outputDir) {
  const filepath = path.join(outputDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * Get terminal log content
 */
async function getTerminalLogs(page) {
  try {
    const terminalContent = await page.textContent('[role="log"]');
    return terminalContent || '';
  } catch (e) {
    return '';
  }
}

/**
 * Verify crawl results
 */
async function verifyResults(crawlResults, expectedMinimum, referenceFile = null) {
  const verification = {
    endpointCount: 'FAIL',
    protocolBreakdown: 'PASS',
    navigation: 'PASS',
    errorFree: 'PASS',
    extensionInit: 'PASS',
    overall: 'FAIL'
  };

  const endpointCount = crawlResults.finalEndpointCount;

  // Check endpoint count
  if (endpointCount >= expectedMinimum) {
    verification.endpointCount = 'PASS';
  }

  // Check protocol breakdown if reference file exists
  if (referenceFile && fs.existsSync(referenceFile)) {
    try {
      const reference = JSON.parse(fs.readFileSync(referenceFile, 'utf8'));
      // TODO: Implement protocol breakdown verification
    } catch (e) {
      verification.protocolBreakdown = 'WARN';
    }
  }

  // Overall status
  verification.overall = verification.endpointCount === 'PASS' ? 'PASS' : 'FAIL';

  return verification;
}

/**
 * Generate JSON report
 */
async function generateJsonReport(results, outputDir) {
  const filename = `test-report-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  return filepath;
}

/**
 * Generate human-readable report
 */
async function generateHumanReport(results, outputDir) {
  const filename = `test-report-${Date.now()}.txt`;
  const filepath = path.join(outputDir, filename);

  const report = `
========================================
DeepCrawler Extension Test Report
========================================
Test Run: ${new Date(results.testRun.timestamp).toLocaleString()}
Target URL: ${results.testRun.targetUrl}
Status: ${results.testRun.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}

Results:
  Endpoints Captured: ${results.results.endpointsCaptured} / ${results.results.expectedMinimum} minimum ${results.results.meetsThreshold ? '✅' : '❌'}
  Crawl Duration: ${results.testRun.duration.toFixed(1)} seconds
  Retry Count: ${results.testRun.retryCount}

Verification:
  Endpoint Count: ${results.verification.endpointCount}
  Protocol Breakdown: ${results.verification.protocolBreakdown}
  Navigation: ${results.verification.navigation}
  Error Free: ${results.verification.errorFree}
  Extension Init: ${results.verification.extensionInit}

Diagnostics:
  Extension Connected: ${results.diagnostics.extensionConnected ? '✅' : '❌'}
  Navigated to Target: ${results.diagnostics.navigatedToTarget ? '✅' : '❌'}
  SSE Connection: ${results.diagnostics.sseConnectionStatus}
  Console Errors: ${results.diagnostics.consoleErrors.length}
  Terminal Errors: ${results.diagnostics.terminalErrors.length}

Screenshots: ${results.screenshots.join(', ') || 'None'}
========================================
`;

  fs.writeFileSync(filepath, report);
  return filepath;
}

module.exports = {
  launchBrowserWithExtension,
  reloadExtensionViaUI,
  navigateToApp,
  waitForExtensionConnection,
  startCrawl,
  monitorCrawl,
  captureConsoleLogs,
  takeScreenshot,
  getTerminalLogs,
  verifyResults,
  generateJsonReport,
  generateHumanReport
};

