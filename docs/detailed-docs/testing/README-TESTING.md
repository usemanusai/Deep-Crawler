# DeepCrawler Extension E2E Testing Suite

## Overview

Comprehensive automated end-to-end testing for the DeepCrawler Chrome extension. This suite validates the complete workflow from extension reload through crawl execution to results verification.

## Features

✅ **Automated Extension Management**
- Automatic extension reload
- Connection status monitoring
- Service worker verification

✅ **Intelligent Crawl Orchestration**
- URL input and configuration
- Crawl mode selection (manual/auto)
- Inactivity timeout management
- Real-time progress monitoring

✅ **Advanced Error Detection**
- Extension connection failures
- Zero endpoint capture detection
- SSE connection failure handling
- Navigation verification
- Polling error detection

✅ **Automatic Recovery**
- Transient failure retry logic
- Configurable retry attempts
- Intelligent failure diagnosis
- Recovery recommendations

✅ **Comprehensive Reporting**
- JSON format reports
- Human-readable summaries
- Screenshot capture
- Console log capture
- Terminal log capture

✅ **Reference File Comparison**
- Compare against expected endpoints
- Protocol breakdown analysis
- Missing/extra endpoint detection
- Detailed recommendations

✅ **Continuous Monitoring**
- Watch mode for continuous testing
- Configurable test intervals
- Multi-URL test suites
- Performance metrics

## Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev playwright
npx playwright install chromium
```

### 2. Start Backend

```bash
npm run dev
```

### 3. Run Tests

```bash
# Default test (miniapps.ai)
npm run test:e2e

# Verbose output
npm run test:e2e:verbose

# Continuous monitoring
npm run test:e2e:watch

# Custom URL
npm run test:e2e:custom
```

## File Structure

```
deep-crawler-bot/
├── test-deepcrawler-e2e.js      # Main test orchestrator
├── run-tests.js                  # Test runner with CLI
├── test-config.json              # Configuration file
├── test-cases.json               # Test case definitions
├── lib/
│   ├── test-helpers.js           # Browser automation helpers
│   ├── error-detection.js        # Failure mode detection
│   └── reference-analyzer.js     # Reference file comparison
├── TEST-GUIDE.md                 # Detailed usage guide
├── TESTING-SETUP.md              # Installation guide
└── test-results/                 # Generated reports
    ├── test-report-*.json
    └── test-report-*.txt
```

## Configuration

### test-config.json

```json
{
  "globalConfig": {
    "extensionId": "hegjkinbjlahdpfoglnbilcoofjmfdpp",
    "backendUrl": "http://localhost:3002",
    "maxRetries": 3,
    "crawlTimeout": 120,
    "extensionConnectionTimeout": 10
  }
}
```

### Environment Variables

```bash
# Custom backend URL
export BACKEND_URL=http://localhost:3002

# Custom extension ID
export EXTENSION_ID=hegjkinbjlahdpfoglnbilcoofjmfdpp

# Verbose logging
export VERBOSE=true
```

## Usage Examples

### Basic Testing

```bash
# Run default test
node run-tests.js

# Run with custom URL
node run-tests.js --url https://example.com --min-endpoints 20

# Run named test suite
node run-tests.js --suite miniapps
```

### Advanced Testing

```bash
# Continuous monitoring (every 60 seconds)
node run-tests.js --watch --interval 60

# Verbose output with debugging
node run-tests.js --verbose

# Custom timeout
node run-tests.js --timeout 180

# Help
node run-tests.js --help
```

### npm Scripts

```bash
npm run test:e2e              # Default test
npm run test:e2e:verbose      # Verbose output
npm run test:e2e:watch        # Continuous monitoring
npm run test:e2e:custom       # Custom URL test
npm run test:e2e:suite        # Named test suite
npm run test:e2e:help         # Show help
```

## Test Results

### Report Format

Each test generates:

1. **JSON Report** (`test-report-{timestamp}.json`)
   - Structured data for parsing
   - Complete test metrics
   - Diagnostic information

2. **Human Report** (`test-report-{timestamp}.txt`)
   - Readable summary
   - Pass/fail status
   - Verification results

3. **Screenshots** (if enabled)
   - Results page screenshot
   - Error state screenshots

### Example Report

```
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

Diagnostics:
  Extension Connected: ✅
  Navigated to Target: ✅
  SSE Connection: active
  Console Errors: 0
  Terminal Errors: 0

========================================
```

## Failure Modes

### Extension Connection Failure
- **Detection:** Status shows "⚪ Extension Disconnected"
- **Recovery:** Automatic retry with extension reload
- **Max Retries:** 3

### Zero Endpoints Captured
- **Detection:** 0 endpoints after 30 seconds
- **Diagnosis:** Checks navigation, interceptor, message passing
- **Recovery:** Automatic retry

### Extension Not Navigating
- **Detection:** No tab with target URL after 5 seconds
- **Diagnosis:** Checks pending crawl creation, message receipt
- **Recovery:** Automatic retry

### SSE Connection Failure
- **Detection:** "SSE connection lost" in logs
- **Status:** Warning (polling mode should activate)
- **Recovery:** Continue monitoring

### Insufficient Endpoints
- **Detection:** Captured < expected minimum
- **Status:** Fail (indicates code issue)
- **Recovery:** No automatic recovery

## Troubleshooting

### Port Already in Use

```bash
lsof -i :3002 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Extension Not Loading

```bash
# Verify extension files
ls -la extension/manifest.json

# Check extension ID
grep "\"id\"" extension/manifest.json
```

### Playwright Issues

```bash
# Reinstall
npm install --save-dev playwright
npx playwright install chromium
```

### Backend Connection Failed

```bash
# Check if running
curl http://localhost:3002

# Restart
npm run dev
```

## Performance

Typical test execution times:

- Extension reload: 2-3s
- App navigation: 3-5s
- Extension connection: 2-5s
- Crawl execution: 60-120s
- Results verification: 1-2s
- Report generation: 1s

**Total: 70-140 seconds per test**

## Integration

### GitHub Actions

```yaml
- run: npm run test:e2e
```

### GitLab CI

```yaml
script:
  - npm run test:e2e
```

### Jenkins

```groovy
stage('Test') {
  steps {
    sh 'npm run test:e2e'
  }
}
```

## Advanced Features

### Reference File Comparison

Compare captured endpoints against a reference file:

```bash
node run-tests.js --reference-file path/to/reference.json
```

### Multi-URL Testing

Define test suites in `test-cases.json`:

```json
{
  "suites": {
    "smoke": {
      "testCases": ["miniapps-primary"],
      "timeout": 150
    },
    "full": {
      "testCases": ["miniapps-primary", "example-basic"],
      "timeout": 300
    }
  }
}
```

### Continuous Monitoring

```bash
npm run test:e2e:watch
```

Runs tests every 60 seconds indefinitely.

## Documentation

- **TEST-GUIDE.md** - Detailed usage guide
- **TESTING-SETUP.md** - Installation and setup
- **test-deepcrawler-e2e.js** - Main implementation
- **run-tests.js** - Test runner
- **lib/test-helpers.js** - Helper functions
- **lib/error-detection.js** - Error detection logic
- **lib/reference-analyzer.js** - Reference comparison

## Support

For issues or questions:

1. Check TEST-GUIDE.md for detailed usage
2. Enable verbose mode: `npm run test:e2e:verbose`
3. Review test-results/ for error logs
4. Check extension console in chrome://extensions/

## License

Same as DeepCrawler project

## Contributing

Contributions welcome! Please:

1. Test your changes: `npm run test:e2e`
2. Follow existing code style
3. Update documentation
4. Submit pull request

## Changelog

### v1.0.0 (Initial Release)
- Automated extension reload
- Connection monitoring
- Crawl orchestration
- Error detection and recovery
- Comprehensive reporting
- Reference file comparison
- Continuous monitoring mode

