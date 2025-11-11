# DeepCrawler Testing Setup Guide

## Complete Installation & Configuration

This guide walks through setting up the automated E2E testing suite for the DeepCrawler Chrome extension.

## Prerequisites

- **Node.js** v14 or higher
- **npm** or **yarn**
- **Chrome/Chromium** browser
- **Git** (for version control)
- **4GB+ RAM** (for browser automation)

## Step 1: Install Dependencies

### Install Playwright

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm install --save-dev playwright
```

### Verify Installation

```bash
npx playwright --version
# Should output: Version X.X.X
```

### Install Chromium (if not already installed)

```bash
npx playwright install chromium
```

## Step 2: Verify Project Structure

Ensure these files exist:

```
deep-crawler-bot/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── network-interceptor.js
├── app/
│   ├── api/
│   │   └── extension/
│   │       └── crawl/
│   │           ├── route.ts
│   │           └── pending/
│   │               └── route.ts
│   └── page.tsx
├── lib/
│   ├── extensionSessions.ts
│   ├── test-helpers.js
│   ├── error-detection.js
│   └── reference-analyzer.js
├── test-deepcrawler-e2e.js
├── run-tests.js
├── test-config.json
├── test-cases.json
└── TEST-GUIDE.md
```

## Step 3: Configure Backend

### Start Development Server

```bash
npm run dev
```

Expected output:
```
> next dev -p 3002
  ▲ Next.js 15.1.8
  - Local:        http://localhost:3002
  - Environments: .env.local

✓ Ready in 2.5s
```

### Verify Backend is Running

```bash
curl http://localhost:3002
# Should return HTML content
```

## Step 4: Configure Extension

### Verify Extension Files

```bash
ls -la extension/
# Should show: manifest.json, background.js, content.js, network-interceptor.js
```

### Check Extension ID

```bash
grep "\"id\"" extension/manifest.json
# Should output the extension ID
```

### Update Extension ID in Config (if needed)

Edit `test-config.json`:

```json
{
  "globalConfig": {
    "extensionId": "YOUR_EXTENSION_ID_HERE"
  }
}
```

## Step 5: Create Output Directory

```bash
mkdir -p test-results
chmod 755 test-results
```

## Step 6: Run First Test

### Quick Test

```bash
node run-tests.js
```

Expected output:
```
[22:30:15] ℹ️  Starting DeepCrawler E2E Test
[22:30:15] ℹ️  Target URL: https://miniapps.ai
[22:30:15] ℹ️  Expected minimum endpoints: 84

=== Test Attempt 1/4 ===

[22:30:20] ✅ Browser launched with extension
[22:30:22] ✅ Extension reloaded
...
[22:31:35] ✅ Crawl monitoring complete: 87 endpoints in 63.2s
```

### Verify Test Results

```bash
ls -la test-results/
# Should show: test-report-*.json and test-report-*.txt
```

### View Test Report

```bash
cat test-results/test-report-*.txt
```

## Step 7: Configure Test Parameters

### Edit test-config.json

```json
{
  "globalConfig": {
    "extensionId": "hegjkinbjlahdpfoglnbilcoofjmfdpp",
    "backendUrl": "http://localhost:3002",
    "maxRetries": 3,
    "extensionConnectionTimeout": 10,
    "crawlTimeout": 120,
    "verbose": false
  }
}
```

### Common Configurations

**For faster testing:**
```json
{
  "crawlTimeout": 60,
  "inactivityTimeout": 30,
  "monitoringInterval": 2
}
```

**For more thorough testing:**
```json
{
  "crawlTimeout": 180,
  "inactivityTimeout": 90,
  "maxRetries": 5
}
```

**For debugging:**
```json
{
  "verbose": true,
  "captureConsoleLogs": true,
  "screenshotOnCompletion": true
}
```

## Step 8: Add Test Scripts to package.json

```json
{
  "scripts": {
    "test:e2e": "node run-tests.js",
    "test:e2e:verbose": "node run-tests.js --verbose",
    "test:e2e:watch": "node run-tests.js --watch --interval 60",
    "test:e2e:custom": "node run-tests.js --url https://example.com --min-endpoints 20",
    "test:e2e:suite": "node run-tests.js --suite miniapps"
  }
}
```

Then run tests with:

```bash
npm run test:e2e
npm run test:e2e:verbose
npm run test:e2e:watch
```

## Step 9: Troubleshooting

### Port Already in Use

```bash
# Find process on port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or use this one-liner
lsof -i :3002 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Extension Not Loading

```bash
# Verify extension path
ls -la extension/manifest.json

# Check for syntax errors
cat extension/manifest.json | jq .

# Reload extension manually in chrome://extensions/
```

### Playwright Not Found

```bash
# Reinstall Playwright
npm install --save-dev playwright

# Install browsers
npx playwright install
```

### Backend Connection Failed

```bash
# Check if backend is running
curl http://localhost:3002

# Check backend logs
npm run dev 2>&1 | grep -i error

# Restart backend
npm run dev
```

### Test Timeout

Increase timeout in test-config.json:

```json
{
  "globalConfig": {
    "crawlTimeout": 180,
    "extensionConnectionTimeout": 15
  }
}
```

## Step 10: Continuous Integration Setup

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: DeepCrawler E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run dev &
      - run: sleep 5
      - run: npm run test:e2e
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
test:
  image: node:18
  script:
    - npm install
    - npm run dev &
    - sleep 5
    - npm run test:e2e
  artifacts:
    paths:
      - test-results/
```

## Step 11: Monitoring & Alerts

### Set Up Continuous Monitoring

```bash
# Run tests every 60 seconds
npm run test:e2e:watch

# Or with custom interval
node run-tests.js --watch --interval 30
```

### Parse Results for Alerts

```bash
# Check if last test passed
if grep -q '"status": "PASS"' test-results/test-report-*.json; then
  echo "✅ Test passed"
else
  echo "❌ Test failed"
  # Send alert
fi
```

## Step 12: Performance Optimization

### Reduce Test Time

```json
{
  "crawlTimeout": 60,
  "inactivityTimeout": 30,
  "monitoringInterval": 3
}
```

### Parallel Testing (Advanced)

Create multiple test runners:

```bash
# Terminal 1
node run-tests.js --suite miniapps

# Terminal 2
node run-tests.js --suite example
```

## Verification Checklist

- [ ] Node.js installed (v14+)
- [ ] Playwright installed
- [ ] Backend running on port 3002
- [ ] Extension files present
- [ ] test-config.json configured
- [ ] test-results directory created
- [ ] First test runs successfully
- [ ] Test reports generated
- [ ] npm scripts added to package.json

## Next Steps

1. **Run your first test:** `npm run test:e2e`
2. **Review the report:** `cat test-results/test-report-*.txt`
3. **Customize configuration:** Edit `test-config.json`
4. **Set up continuous monitoring:** `npm run test:e2e:watch`
5. **Integrate with CI/CD:** Add GitHub Actions workflow

## Support

For issues or questions:

1. Check TEST-GUIDE.md for detailed usage
2. Review test-deepcrawler-e2e.js for implementation details
3. Check test-results/ for error logs
4. Enable verbose mode: `npm run test:e2e:verbose`

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)

