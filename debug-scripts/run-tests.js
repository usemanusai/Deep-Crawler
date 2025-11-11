#!/usr/bin/env node

/**
 * DeepCrawler Test Runner
 * 
 * Orchestrates test execution with support for:
 * - Single URL testing
 * - Multi-URL test suites
 * - Continuous monitoring mode
 * - Detailed reporting
 * 
 * Usage:
 *   node run-tests.js                          # Run default miniapps.ai test
 *   node run-tests.js --url https://example.com --min-endpoints 20
 *   node run-tests.js --suite miniapps         # Run named test suite
 *   node run-tests.js --watch --interval 60    # Run continuously every 60s
 *   node run-tests.js --verbose                # Enable verbose logging
 */

const fs = require('fs');
const path = require('path');
const { runDeepCrawlerTest, TEST_CONFIG } = require('./test-deepcrawler-e2e');

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArguments() {
  const args = process.argv.slice(2);
  const config = { ...TEST_CONFIG };
  let testSuite = null;
  let watchMode = false;
  let watchInterval = 60;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--url' && args[i + 1]) {
      config.targetUrl = args[++i];
    } else if (arg === '--min-endpoints' && args[i + 1]) {
      config.expectedMinEndpoints = parseInt(args[++i]);
    } else if (arg === '--suite' && args[i + 1]) {
      testSuite = args[++i];
    } else if (arg === '--watch') {
      watchMode = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        watchInterval = parseInt(args[++i]);
      }
    } else if (arg === '--interval' && args[i + 1]) {
      watchInterval = parseInt(args[++i]);
    } else if (arg === '--verbose') {
      config.verbose = true;
    } else if (arg === '--timeout' && args[i + 1]) {
      config.crawlTimeout = parseInt(args[++i]);
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  return { config, testSuite, watchMode, watchInterval };
}

function printHelp() {
  console.log(`
DeepCrawler Test Runner

Usage:
  node run-tests.js [options]

Options:
  --url URL                    Target URL to crawl (default: https://miniapps.ai)
  --min-endpoints N            Expected minimum endpoints (default: 84)
  --suite NAME                 Run named test suite from test-config.json
  --watch                      Run tests continuously
  --interval N                 Interval between test runs in watch mode (default: 60s)
  --timeout N                  Crawl timeout in seconds (default: 120)
  --verbose                    Enable verbose logging
  --help                       Show this help message

Examples:
  # Run default test
  node run-tests.js

  # Test custom URL
  node run-tests.js --url https://example.com --min-endpoints 20

  # Run named test suite
  node run-tests.js --suite miniapps

  # Continuous monitoring
  node run-tests.js --watch --interval 60

  # Verbose output
  node run-tests.js --verbose
`);
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

async function runSingleTest(config) {
  console.log('\n' + '='.repeat(60));
  console.log(`Starting test: ${config.targetUrl}`);
  console.log('='.repeat(60) + '\n');

  const results = await runDeepCrawlerTest(config);

  console.log('\n' + '='.repeat(60));
  console.log(`Test completed: ${results.testRun.status}`);
  console.log('='.repeat(60) + '\n');

  return results;
}

async function runTestSuite(suiteName) {
  const configPath = path.join(__dirname, 'test-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Test config file not found: ${configPath}`);
    process.exit(1);
  }

  const testConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const suite = testConfig.testSuites[suiteName];

  if (!suite) {
    console.error(`❌ Test suite not found: ${suiteName}`);
    console.log(`Available suites: ${Object.keys(testConfig.testSuites).join(', ')}`);
    process.exit(1);
  }

  const config = {
    ...TEST_CONFIG,
    ...testConfig.globalConfig,
    ...suite
  };

  return runSingleTest(config);
}

async function runWatchMode(config, interval) {
  console.log(`\n🔄 Watch mode enabled - running tests every ${interval}s\n`);

  let testCount = 0;
  const results = [];

  while (true) {
    testCount++;
    console.log(`\n[${new Date().toLocaleTimeString()}] Test run #${testCount}`);

    try {
      const result = await runSingleTest(config);
      results.push(result);

      // Print summary
      const passCount = results.filter(r => r.testRun.status === 'PASS').length;
      const failCount = results.filter(r => r.testRun.status === 'FAIL').length;
      console.log(`\nWatch mode summary: ${passCount} passed, ${failCount} failed out of ${testCount} runs`);

    } catch (error) {
      console.error(`❌ Test error: ${error.message}`);
    }

    console.log(`\nNext test in ${interval}s... (Press Ctrl+C to stop)`);
    await sleep(interval * 1000);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  try {
    const { config, testSuite, watchMode, watchInterval } = parseArguments();

    if (watchMode) {
      await runWatchMode(config, watchInterval);
    } else if (testSuite) {
      await runTestSuite(testSuite);
    } else {
      const results = await runSingleTest(config);
      process.exit(results.testRun.status === 'PASS' ? 0 : 1);
    }

  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  main().catch(error => {
    console.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { parseArguments, runSingleTest, runTestSuite, runWatchMode };

