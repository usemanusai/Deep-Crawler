# DeepCrawler Extension E2E Testing Guide

## Overview

This guide covers the automated end-to-end testing suite for the DeepCrawler Chrome extension. The test suite validates the complete workflow: extension reload → connection → crawl → verification → reporting.

## Prerequisites

1. **Node.js** (v14+)
2. **Playwright** (installed via npm)
3. **Chrome/Chromium** browser
4. **DeepCrawler backend** running on `http://localhost:3002`
5. **Extension files** in `./extension` directory

## Installation

### 1. Install Playwright

```bash
npm install --save-dev playwright
```

### 2. Verify Setup

```bash
# Check if backend is running
curl http://localhost:3002

# Check if extension files exist
ls -la extension/
```

## Quick Start

### Run Default Test (miniapps.ai)

```bash
node run-tests.js
```

This will:
1. Launch Chrome with the DeepCrawler extension
2. Reload the extension
3. Navigate to http://localhost:3002
4. Wait for extension connection
5. Start crawling https://miniapps.ai
6. Monitor for 120 seconds
7. Verify results (expecting 84+ endpoints)
8. Generate reports

### Expected Output

```
[22:30:15] ℹ️  Starting DeepCrawler E2E Test
[22:30:15] ℹ️  Target URL: https://miniapps.ai
[22:30:15] ℹ️  Expected minimum endpoints: 84

=== Test Attempt 1/4 ===

[22:30:20] ✅ Browser launched with extension
[22:30:22] ✅ Extension reloaded
[22:30:25] ✅ Navigated to app
[22:30:30] ✅ Extension connected
[22:30:32] ✅ Crawl started
[22:31:35] ✅ Crawl monitoring complete: 87 endpoints in 63.2s

========================================
DeepCrawler Extension Test Report
========================================
Test Run: 1/8/2025, 10:30:15 PM
Target URL: https://miniapps.ai
Status: ✅ PASS
Duration: 65.3 seconds
Retry Count: 0

Results:
  Endpoints Captured: 87 / 84 minimum ✅

Verification:
  Endpoint Count: PASS
  Protocol Breakdown: PASS
  Navigation: PASS
  Error Free: PASS
  Extension Init: PASS

========================================
```

## Usage Examples

### Test Custom URL

```bash
node run-tests.js --url https://example.com --min-endpoints 20
```

### Run Named Test Suite

```bash
# List available suites in test-config.json
node run-tests.js --suite miniapps
node run-tests.js --suite example
```

### Continuous Monitoring

```bash
# Run tests every 60 seconds
node run-tests.js --watch --interval 60

# Run tests every 30 seconds
node run-tests.js --watch --interval 30
```

### Verbose Logging

```bash
node run-tests.js --verbose
```

Shows detailed debug information for troubleshooting.

### Custom Timeout

```bash
# Set crawl timeout to 180 seconds
node run-tests.js --timeout 180
```

## Test Configuration

Edit `test-config.json` to customize test behavior:

```json
{
  "testSuites": {
    "miniapps": {
      "targetUrl": "https://miniapps.ai",
      "expectedMinEndpoints": 84,
      "crawlMode": "manual",
      "inactivityTimeout": 60,
      "crawlTimeout": 120
    }
  },
  "globalConfig": {
    "extensionId": "hegjkinbjlahdpfoglnbilcoofjmfdpp",
    "backendUrl": "http://localhost:3002",
    "maxRetries": 3,
    "verbose": false
  }
}
```

## Test Results

### Output Files

Test results are saved to `./test-results/`:

- `test-report-{timestamp}.json` - Detailed JSON report
- `test-report-{timestamp}.txt` - Human-readable report
- `test-results-{timestamp}.png` - Screenshot of results page

### JSON Report Format

```json
{
  "testRun": {
    "timestamp": "2025-01-08T22:30:00Z",
    "targetUrl": "https://miniapps.ai",
    "status": "PASS",
    "duration": 65.3,
    "retryCount": 0
  },
  "results": {
    "endpointsCaptured": 87,
    "expectedMinimum": 84,
    "meetsThreshold": true,
    "protocolBreakdown": {
      "data:": 46,
      "https://": 40,
      "blob:": 1
    }
  },
  "verification": {
    "endpointCount": "PASS",
    "protocolBreakdown": "PASS",
    "navigation": "PASS",
    "errorFree": "PASS",
    "extensionInit": "PASS"
  },
  "diagnostics": {
    "extensionConnected": true,
    "navigatedToTarget": true,
    "sseConnectionStatus": "active",
    "consoleErrors": [],
    "terminalErrors": []
  }
}
```

## Failure Modes & Recovery

### Extension Connection Failure

**Symptom:** Status shows "⚪ Extension Disconnected" after 10 seconds

**Diagnosis:**
- Check if extension service worker is running
- Verify backend is accessible at http://localhost:3002
- Check browser console for errors

**Recovery:**
- Automatic retry (up to 3 times)
- Manual: Reload extension in chrome://extensions/

### Zero Endpoints Captured

**Symptom:** Endpoint count remains 0 after 30 seconds

**Diagnosis:**
- Check if extension navigated to target URL
- Verify network interceptor was injected
- Check if backend is returning pending crawls

**Recovery:**
- Automatic retry (up to 3 times)
- Manual: Check extension console logs

### SSE Connection Failure

**Symptom:** Terminal shows "SSE connection lost"

**Diagnosis:**
- SSE connection failed but polling mode should activate
- Check backend logs for errors

**Recovery:**
- Non-fatal if polling mode activates
- Test continues with polling

### Extension Not Navigating

**Symptom:** No new tab opens with target URL

**Diagnosis:**
- Check if pending crawl was created
- Verify extension received START_CRAWL message
- Check if tab creation failed

**Recovery:**
- Automatic retry (up to 3 times)
- Manual: Check extension background script logs

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3002
lsof -i :3002 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Extension Not Loading

```bash
# Verify extension path
ls -la extension/manifest.json

# Check extension ID
grep "\"id\"" extension/manifest.json
```

### Backend Not Running

```bash
# Start backend
npm run dev

# Verify it's running
curl http://localhost:3002
```

### Playwright Not Installed

```bash
npm install --save-dev playwright
npx playwright install
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: DeepCrawler Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run dev &
      - run: sleep 5
      - run: node run-tests.js
```

## Performance Metrics

Typical test execution times:

- Extension reload: 2-3 seconds
- App navigation: 3-5 seconds
- Extension connection: 2-5 seconds
- Crawl execution: 60-120 seconds
- Results verification: 1-2 seconds
- Report generation: 1 second

**Total: 70-140 seconds per test**

## Advanced Usage

### Custom Test Suite

Create a new test suite in `test-config.json`:

```json
{
  "testSuites": {
    "mysite": {
      "name": "My Site Test",
      "targetUrl": "https://mysite.com",
      "expectedMinEndpoints": 50,
      "crawlMode": "manual",
      "inactivityTimeout": 60,
      "crawlTimeout": 120
    }
  }
}
```

Run it:

```bash
node run-tests.js --suite mysite
```

### Reference File Comparison

If you have a reference file with expected endpoints:

```bash
node run-tests.js --reference-file path/to/reference.json
```

The test will compare captured endpoints against the reference and report:
- Missing endpoints
- Extra endpoints
- Protocol breakdown differences

## Support & Debugging

### Enable Debug Logging

```bash
DEBUG=* node run-tests.js --verbose
```

### Capture Full Logs

All logs are saved to `test-results/` directory:

```bash
# View latest report
cat test-results/test-report-*.txt | tail -50

# View JSON report
cat test-results/test-report-*.json | jq .
```

### Manual Testing

If automated tests fail, manually test:

1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `./extension` directory
5. Navigate to http://localhost:3002
6. Verify extension shows "🟢 Extension Connected"
7. Enter URL and click "Start Discovery"
8. Monitor crawl progress

## FAQ

**Q: How long does a test take?**
A: Typically 70-140 seconds depending on target website and network speed.

**Q: Can I run multiple tests in parallel?**
A: Not recommended - use watch mode for sequential testing.

**Q: What if the backend crashes during a test?**
A: Test will fail and retry. Ensure backend is stable before running tests.

**Q: How do I update expected endpoint count?**
A: Edit `test-config.json` or use `--min-endpoints` flag.

**Q: Can I test against a different backend?**
A: Yes, edit `backendUrl` in `test-config.json` or set environment variable.

## Next Steps

1. Run your first test: `node run-tests.js`
2. Review the generated report in `test-results/`
3. Customize test configuration in `test-config.json`
4. Set up continuous monitoring with `--watch` mode
5. Integrate into your CI/CD pipeline

