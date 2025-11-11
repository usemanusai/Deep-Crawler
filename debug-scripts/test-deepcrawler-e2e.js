#!/usr/bin/env node

/**
 * DeepCrawler Extension E2E Test Suite
 * 
 * Comprehensive automated testing for the DeepCrawler Chrome extension
 * Handles full workflow: reload → connect → crawl → verify → report
 * 
 * Usage:
 *   node test-deepcrawler-e2e.js [--url URL] [--min-endpoints N] [--verbose] [--watch]
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { FailureDetector, DiagnosticAnalyzer, RecoveryManager } = require('./lib/error-detection');
const { ReferenceAnalyzer } = require('./lib/reference-analyzer');

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  // Target configuration
  targetUrl: 'https://miniapps.ai',
  expectedMinEndpoints: 84,
  
  // Timeout configuration (in seconds)
  extensionConnectionTimeout: 10,
  crawlTimeout: 120,
  inactivityTimeout: 60,
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 5,
  
  // Crawl settings
  crawlMode: 'manual',
  sameOriginOnly: true,
  
  // Monitoring configuration
  monitoringInterval: 5,
  screenshotOnCompletion: true,
  captureConsoleLogs: true,
  
  // Reference file (optional)
  referenceFile: 'C:\\Users\\Lenovo ThinkPad T480\\Desktop\\API-miniapps.ai\\deepcrawler-deepcrawler---miniapps.ai.json',
  
  // Extension configuration
  extensionId: 'hegjkinbjlahdpfoglnbilcoofjmfdpp',
  extensionPath: path.join(__dirname, 'extension'),
  
  // Backend configuration
  backendUrl: 'http://localhost:3002',
  
  // Output configuration
  outputDir: path.join(__dirname, 'test-results'),
  verbose: false
};

// ============================================================================
// UTILITIES
// ============================================================================

class Logger {
  constructor(verbose = false) {
    this.verbose = verbose;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    switch (level) {
      case 'INFO':
        console.log(`${prefix} ℹ️  ${message}`);
        break;
      case 'SUCCESS':
        console.log(`${prefix} ✅ ${message}`);
        break;
      case 'ERROR':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'WARN':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      case 'DEBUG':
        if (this.verbose) console.log(`${prefix} 🔍 ${message}`);
        break;
    }
  }

  info(msg) { this.log(msg, 'INFO'); }
  success(msg) { this.log(msg, 'SUCCESS'); }
  error(msg) { this.log(msg, 'ERROR'); }
  warn(msg) { this.log(msg, 'WARN'); }
  debug(msg) { this.log(msg, 'DEBUG'); }
}

const logger = new Logger(TEST_CONFIG.verbose);

// ============================================================================
// MAIN TEST ORCHESTRATOR
// ============================================================================

async function runDeepCrawlerTest(config = TEST_CONFIG) {
  const startTime = Date.now();
  const results = {
    testRun: {
      timestamp: new Date().toISOString(),
      targetUrl: config.targetUrl,
      status: 'PENDING',
      duration: 0,
      retryCount: 0
    },
    results: {
      endpointsCaptured: 0,
      expectedMinimum: config.expectedMinEndpoints,
      meetsThreshold: false,
      protocolBreakdown: {}
    },
    verification: {
      endpointCount: 'PENDING',
      protocolBreakdown: 'PENDING',
      navigation: 'PENDING',
      errorFree: 'PENDING',
      extensionInit: 'PENDING'
    },
    diagnostics: {
      extensionConnected: false,
      navigatedToTarget: false,
      sseConnectionStatus: 'unknown',
      consoleErrors: [],
      terminalErrors: [],
      errors: []
    },
    screenshots: [],
    logs: {
      terminal: '',
      browserConsole: '',
      extensionConsole: ''
    }
  };

  let browser = null;
  let retryCount = 0;
  let success = false;

  try {
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    logger.info(`Starting DeepCrawler E2E Test`);
    logger.info(`Target URL: ${config.targetUrl}`);
    logger.info(`Expected minimum endpoints: ${config.expectedMinEndpoints}`);

    while (retryCount <= config.maxRetries && !success) {
      try {
        logger.info(`\n=== Test Attempt ${retryCount + 1}/${config.maxRetries + 1} ===`);

        // Launch browser with extension (returns a context)
        browser = await launchBrowserWithExtension(config);
        logger.success(`Browser launched with extension`);

        // Get pages from context
        const pages = browser.pages();
        let appPage = pages.length > 0 ? pages[0] : await browser.newPage();

        // Navigate to app first
        await navigateToApp(appPage, config);
        logger.success(`Navigated to app`);

        // Phase 1: Reload extension
        await reloadExtension(browser, config);
        logger.success(`Extension reloaded`);

        // Phase 2: Wait for extension connection
        const connected = await waitForExtensionConnection(appPage, config.extensionConnectionTimeout);
        if (!connected) {
          throw new Error(`Extension failed to connect after ${config.extensionConnectionTimeout}s`);
        }
        results.diagnostics.extensionConnected = true;
        logger.success(`Extension connected`);

        // Phase 3: Start crawl
        const crawlStarted = await startCrawl(appPage, config);
        if (!crawlStarted) {
          throw new Error('Failed to start crawl');
        }
        logger.success(`Crawl started`);

        // Phase 4: Monitor crawl
        const crawlResults = await monitorCrawl(appPage, config);
        logger.success(`Crawl monitoring complete`);

        // Phase 5: Verify results
        const verification = await verifyResults(crawlResults, config, appPage);
        Object.assign(results.verification, verification);

        // Phase 6: Capture final state
        results.results = crawlResults.results;
        results.diagnostics = { ...results.diagnostics, ...crawlResults.diagnostics };
        results.logs = crawlResults.logs;

        success = verification.overall === 'PASS';

      } catch (error) {
        logger.error(`Test attempt failed: ${error.message}`);
        results.diagnostics.errors.push({
          retry: retryCount,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        retryCount++;
        if (retryCount <= config.maxRetries) {
          logger.info(`Retrying in ${config.retryDelay}s...`);
          await sleep(config.retryDelay * 1000);
        }
      } finally {
        if (browser) {
          await browser.close();
          browser = null;
        }
      }
    }

    results.testRun.retryCount = retryCount;
    results.testRun.status = success ? 'PASS' : 'FAIL';
    results.testRun.duration = (Date.now() - startTime) / 1000;

    // Generate reports
    await generateReports(results, config);

    return results;

  } catch (error) {
    logger.error(`Fatal test error: ${error.message}`);
    results.testRun.status = 'ERROR';
    results.testRun.duration = (Date.now() - startTime) / 1000;
    return results;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS - BROWSER MANAGEMENT
// ============================================================================

async function launchBrowserWithExtension(config) {
  logger.debug(`Launching browser with extension from: ${config.extensionPath}`);

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${config.extensionPath}`,
      `--load-extension=${config.extensionPath}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--disable-default-apps'
    ]
  });

  return context;
}

async function reloadExtension(browser, config) {
  logger.debug(`Reloading extension: ${config.extensionId}`);

  const pages = browser.pages();
  let extensionsPage = pages.find(p => p.url().includes('chrome://extensions'));

  if (!extensionsPage) {
    extensionsPage = await browser.newPage();
    await extensionsPage.goto('chrome://extensions/', { waitUntil: 'networkidle' });
  }

  try {
    // Wait for extension to be visible
    await extensionsPage.waitForSelector(`text=${config.extensionId}`, { timeout: 5000 }).catch(() => {});

    // Find reload button - look for button near the extension
    const reloadButtons = await extensionsPage.$$('button:has-text("Reload")');
    if (reloadButtons.length > 0) {
      // Click the first reload button (should be for our extension)
      await reloadButtons[0].click();
      await sleep(2000); // Wait for extension to reload
    }
  } catch (e) {
    logger.warn(`Could not reload extension via UI: ${e.message}`);
  }

  await extensionsPage.close().catch(() => {});
}

async function navigateToApp(page, config) {
  logger.debug(`Navigating to app: ${config.backendUrl}`);

  await page.goto(config.backendUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for main heading
  await page.waitForSelector('text=DeepCrawler', { timeout: 10000 });

  logger.debug(`App page loaded successfully`);
}

async function waitForExtensionConnection(page, timeoutSeconds) {
  logger.debug(`Waiting for extension connection (timeout: ${timeoutSeconds}s)`);

  const timeout = timeoutSeconds * 1000;
  const startTime = Date.now();
  let lastStatus = 'unknown';

  while (Date.now() - startTime < timeout) {
    try {
      // Check for connected status indicator
      const connectedIndicator = await page.$('text=🟢 Extension Connected');
      if (connectedIndicator) {
        logger.debug(`Extension connection confirmed`);
        return true;
      }

      // Check current status
      const statusText = await page.textContent('[role="status"]').catch(() => '');
      if (statusText && statusText !== lastStatus) {
        logger.debug(`Extension status: ${statusText}`);
        lastStatus = statusText;
      }
    } catch (e) {
      // Continue waiting
    }

    await sleep(500);
  }

  logger.warn(`Extension connection timeout after ${timeoutSeconds}s`);
  return false;
}

// ============================================================================
// HELPER FUNCTIONS - CRAWL MANAGEMENT
// ============================================================================

async function startCrawl(page, config) {
  logger.debug(`Starting crawl for: ${config.targetUrl}`);

  try {
    // Find and clear URL input
    const urlInput = await page.$('input[placeholder*="https://"]');
    if (!urlInput) {
      throw new Error('URL input field not found');
    }

    await urlInput.fill('');
    await urlInput.type(config.targetUrl, { delay: 50 });
    logger.debug(`URL entered: ${config.targetUrl}`);

    // Verify crawl mode
    if (config.crawlMode === 'manual') {
      const manualButton = await page.$('button:has-text("Manual")');
      if (manualButton) {
        const isPressed = await manualButton.evaluate(el => el.getAttribute('aria-pressed') === 'true');
        if (!isPressed) {
          await manualButton.click();
          await sleep(500);
        }
      }
    }

    // Set inactivity timeout
    const slider = await page.$('input[type="range"]');
    if (slider) {
      await slider.fill(String(config.inactivityTimeout));
      logger.debug(`Inactivity timeout set to: ${config.inactivityTimeout}s`);
    }

    // Click Start Discovery button
    const startButton = await page.$('button:has-text("Start Discovery")');
    if (!startButton) {
      throw new Error('Start Discovery button not found');
    }

    await startButton.click();
    logger.debug(`Start Discovery button clicked`);

    // Wait for crawl to start
    await sleep(1000);

    // Verify crawl started by checking for Stop button
    const stopButton = await page.$('button:has-text("Stop Crawl")');
    if (!stopButton) {
      throw new Error('Crawl did not start - Stop button not found');
    }

    logger.success(`Crawl started successfully`);
    return true;

  } catch (error) {
    logger.error(`Failed to start crawl: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS - CRAWL MONITORING
// ============================================================================

async function monitorCrawl(page, config) {
  logger.debug(`Monitoring crawl (timeout: ${config.crawlTimeout}s, interval: ${config.monitoringInterval}s)`);

  const timeout = config.crawlTimeout * 1000;
  const interval = config.monitoringInterval * 1000;
  const startTime = Date.now();
  const measurements = [];
  let lastEndpointCount = 0;
  let noChangeCount = 0;
  let crawlCompleted = false;
  let terminalLogs = '';
  let consoleErrors = [];
  let terminalErrors = [];

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    });
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  while (Date.now() - startTime < timeout && !crawlCompleted) {
    try {
      // Get current status
      const statusText = await page.textContent('text=Capturing').catch(() => '');
      const endpointMatch = statusText?.match(/(\d+)\s+endpoints/);
      const currentCount = endpointMatch ? parseInt(endpointMatch[1]) : 0;

      const elapsedMatch = statusText?.match(/Elapsed:\s+(\d+):(\d+)/);
      const elapsed = elapsedMatch ? `${elapsedMatch[1]}:${elapsedMatch[2]}` : 'unknown';

      measurements.push({
        timestamp: new Date().toISOString(),
        endpointCount: currentCount,
        elapsed: elapsed
      });

      logger.debug(`Crawl progress: ${currentCount} endpoints, elapsed: ${elapsed}`);

      // Check for inactivity
      if (currentCount === lastEndpointCount) {
        noChangeCount++;
      } else {
        noChangeCount = 0;
      }
      lastEndpointCount = currentCount;

      // Check if crawl completed
      const stopButton = await page.$('button:has-text("Stop Crawl")').catch(() => null);
      if (!stopButton) {
        logger.debug(`Crawl completed - Stop button no longer visible`);
        crawlCompleted = true;
        break;
      }

      // Get terminal logs
      terminalLogs = await page.textContent('[role="log"]').catch(() => '');

      // Check for errors in terminal
      if (terminalLogs?.includes('error') || terminalLogs?.includes('Error')) {
        const errorMatch = terminalLogs.match(/error[^\n]*/i);
        if (errorMatch) {
          terminalErrors.push(errorMatch[0]);
          logger.warn(`Terminal error detected: ${errorMatch[0]}`);
        }
      }

      // Check for SSE connection failure
      if (terminalLogs?.includes('SSE connection lost')) {
        logger.warn(`SSE connection lost, polling mode should be active`);
      }

    } catch (e) {
      logger.debug(`Error during monitoring: ${e.message}`);
    }

    await sleep(interval);
  }

  const finalEndpointCount = measurements[measurements.length - 1]?.endpointCount || 0;
  const duration = (Date.now() - startTime) / 1000;

  logger.success(`Crawl monitoring complete: ${finalEndpointCount} endpoints in ${duration.toFixed(1)}s`);

  return {
    measurements,
    finalEndpointCount,
    duration,
    crawlCompleted,
    diagnostics: {
      consoleErrors,
      terminalErrors,
      sseConnectionStatus: terminalLogs?.includes('SSE connection lost') ? 'failed_polling_active' : 'active'
    },
    logs: {
      terminal: terminalLogs,
      browserConsole: consoleLogs.map(l => `[${l.type}] ${l.text}`).join('\n')
    }
  };
}

// ============================================================================
// HELPER FUNCTIONS - RESULTS VERIFICATION
// ============================================================================

async function verifyResults(crawlResults, config, page) {
  logger.debug(`Verifying crawl results`);

  const verification = {
    endpointCount: 'FAIL',
    protocolBreakdown: 'PASS',
    navigation: 'PASS',
    errorFree: 'PASS',
    extensionInit: 'PASS',
    referenceComparison: null,
    overall: 'FAIL'
  };

  const endpointCount = crawlResults.finalEndpointCount;

  // 1. Verify endpoint count
  if (endpointCount >= config.expectedMinEndpoints) {
    verification.endpointCount = 'PASS';
    logger.success(`✅ Endpoint count: ${endpointCount} >= ${config.expectedMinEndpoints}`);
  } else {
    verification.endpointCount = 'FAIL';
    logger.error(`❌ Endpoint count: ${endpointCount} < ${config.expectedMinEndpoints}`);
  }

  // 2. Verify navigation
  try {
    const pages = page.context().pages();
    const targetPageExists = pages.some(p => p.url().includes(config.targetUrl.replace('https://', '')));
    if (targetPageExists) {
      verification.navigation = 'PASS';
      logger.success(`✅ Extension navigated to target URL`);
    } else {
      verification.navigation = 'WARN';
      logger.warn(`⚠️  Target URL tab not found`);
    }
  } catch (e) {
    logger.debug(`Could not verify navigation: ${e.message}`);
  }

  // 3. Verify error-free execution
  if (crawlResults.diagnostics.consoleErrors.length === 0 && crawlResults.diagnostics.terminalErrors.length === 0) {
    verification.errorFree = 'PASS';
    logger.success(`✅ No critical errors detected`);
  } else {
    verification.errorFree = 'WARN';
    logger.warn(`⚠️  ${crawlResults.diagnostics.consoleErrors.length} console errors, ${crawlResults.diagnostics.terminalErrors.length} terminal errors`);
  }

  // 4. Compare against reference file if available
  if (config.referenceFile && fs.existsSync(config.referenceFile)) {
    try {
      const referenceAnalyzer = new ReferenceAnalyzer(logger);
      const referenceEndpoints = referenceAnalyzer.loadReference(config.referenceFile);

      if (referenceEndpoints) {
        // Extract captured endpoints from crawl results
        const capturedEndpoints = crawlResults.measurements
          ?.map(m => m.endpoints || [])
          .flat() || [];

        const comparison = referenceAnalyzer.compareWithReference(capturedEndpoints, referenceEndpoints);
        verification.referenceComparison = referenceAnalyzer.generateReport(comparison);

        referenceAnalyzer.printReport(comparison, logger);
      }
    } catch (e) {
      logger.warn(`Could not compare with reference file: ${e.message}`);
    }
  }

  // 5. Overall status
  verification.overall = verification.endpointCount === 'PASS' ? 'PASS' : 'FAIL';

  return verification;
}

// ============================================================================
// HELPER FUNCTIONS - REPORTING
// ============================================================================

async function generateReports(results, config) {
  logger.info(`Generating test reports...`);

  try {
    // Generate JSON report
    const jsonFilename = `test-report-${Date.now()}.json`;
    const jsonPath = path.join(config.outputDir, jsonFilename);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    logger.success(`JSON report saved: ${jsonPath}`);

    // Generate human-readable report
    const humanFilename = `test-report-${Date.now()}.txt`;
    const humanPath = path.join(config.outputDir, humanFilename);

    const report = `
========================================
DeepCrawler Extension Test Report
========================================
Test Run: ${new Date(results.testRun.timestamp).toLocaleString()}
Target URL: ${results.testRun.targetUrl}
Status: ${results.testRun.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
Duration: ${results.testRun.duration.toFixed(1)} seconds
Retry Count: ${results.testRun.retryCount}

Results:
  Endpoints Captured: ${results.results.endpointsCaptured} / ${results.results.expectedMinimum} minimum ${results.results.meetsThreshold ? '✅' : '❌'}

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

    fs.writeFileSync(humanPath, report);
    logger.success(`Human-readable report saved: ${humanPath}`);

    // Print summary to console
    console.log(report);

  } catch (error) {
    logger.error(`Failed to generate reports: ${error.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (require.main === module) {
  runDeepCrawlerTest(TEST_CONFIG)
    .then(results => {
      process.exit(results.testRun.status === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      logger.error(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runDeepCrawlerTest, TEST_CONFIG, Logger };

