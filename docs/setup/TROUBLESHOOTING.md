# DeepCrawler E2E Testing - Troubleshooting Guide

## Common Issues & Solutions

### 1. Port Already in Use (3002)

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3002
```

**Solution:**

```bash
# Find process on port 3002
lsof -i :3002

# Kill the process
kill -9 <PID>

# Or use one-liner
lsof -i :3002 | grep -v COMMAND | awk '{print $2}' | xargs kill -9

# Verify port is free
lsof -i :3002
```

**Windows:**
```bash
# Find process
netstat -ano | findstr :3002

# Kill process
taskkill /PID <PID> /F
```

### 2. Playwright Not Installed

**Error:**
```
Error: Cannot find module 'playwright'
```

**Solution:**

```bash
# Install Playwright
npm install --save-dev playwright

# Install browsers
npx playwright install chromium

# Verify installation
npx playwright --version
```

### 3. Extension Not Loading

**Error:**
```
Extension failed to load from path
```

**Solution:**

```bash
# Verify extension files exist
ls -la extension/
# Should show: manifest.json, background.js, content.js, network-interceptor.js

# Check manifest syntax
cat extension/manifest.json | jq .

# Verify extension ID
grep "\"id\"" extension/manifest.json

# Update test-config.json with correct ID
```

### 4. Backend Connection Failed

**Error:**
```
[Extension] Failed to connect to backend
```

**Solution:**

```bash
# Check if backend is running
curl http://localhost:3002

# Start backend
npm run dev

# Check backend logs
npm run dev 2>&1 | grep -i error

# Verify backend URL in config
cat test-config.json | grep backendUrl
```

### 5. Extension Connection Timeout

**Error:**
```
Extension failed to connect after 10s
```

**Solution:**

```bash
# Increase timeout in test-config.json
{
  "globalConfig": {
    "extensionConnectionTimeout": 15
  }
}

# Or via command line
node run-tests.js --timeout 15

# Check extension service worker
# 1. Open chrome://extensions/
# 2. Find DeepCrawler extension
# 3. Click "Service Worker" to view logs
```

### 6. Zero Endpoints Captured

**Error:**
```
Endpoint count: 0 < 84
```

**Solution:**

```bash
# Check if extension navigated to target URL
# 1. Open chrome://extensions/
# 2. Click "Service Worker" for DeepCrawler
# 3. Look for "Created new tab" message

# Check network interceptor injection
# 1. Open DevTools on target page (F12)
# 2. Check console for "Network interceptor script loaded"

# Check message passing
# 1. Open extension background script logs
# 2. Look for "START_CRAWL" message

# Enable verbose logging
node run-tests.js --verbose

# Check terminal logs
cat test-results/test-report-*.txt | grep -i "endpoint\|crawl\|error"
```

### 7. SSE Connection Lost

**Error:**
```
SSE connection lost - switching to polling mode
```

**Solution:**

This is a warning, not a critical error. Polling mode should activate automatically.

```bash
# Check if polling is working
cat test-results/test-report-*.txt | grep -i "polling"

# If polling also fails, check backend logs
npm run dev 2>&1 | grep -i "pending\|crawl"

# Increase inactivity timeout
{
  "globalConfig": {
    "inactivityTimeout": 90
  }
}
```

### 8. Test Timeout

**Error:**
```
Test timed out after 120 seconds
```

**Solution:**

```bash
# Increase crawl timeout
node run-tests.js --timeout 180

# Or in test-config.json
{
  "globalConfig": {
    "crawlTimeout": 180
  }
}

# Check if target website is slow
curl -w "@curl-format.txt" -o /dev/null -s https://miniapps.ai

# Reduce monitoring interval for faster detection
{
  "globalConfig": {
    "monitoringInterval": 2
  }
}
```

### 9. Insufficient Endpoints Captured

**Error:**
```
Endpoints Captured: 45 / 84 minimum
```

**Solution:**

```bash
# Check reference file comparison
cat test-results/test-report-*.txt | grep -A 20 "Reference File Comparison"

# Identify missing protocol types
# Look for: "Low coverage for data: URLs" or "Low coverage for blob: URLs"

# Check network interceptor logs
# 1. Open extension background script
# 2. Look for data URL extraction logs
# 3. Check for blob URL interception

# Enable verbose logging
node run-tests.js --verbose

# Check if target website changed
# Compare against reference file
node run-tests.js --reference-file path/to/reference.json
```

### 10. Browser Crash

**Error:**
```
Browser crashed or closed unexpectedly
```

**Solution:**

```bash
# Check system resources
free -h  # Linux
Get-Process | Sort-Object -Property WorkingSet -Descending | Select-Object -First 10  # Windows

# Disable headless mode to see what's happening
{
  "globalConfig": {
    "headless": false
  }
}

# Reduce browser memory usage
# Disable screenshots
{
  "globalConfig": {
    "screenshotOnCompletion": false
  }
}

# Disable console log capture
{
  "globalConfig": {
    "captureConsoleLogs": false
  }
}
```

### 11. File Permission Errors

**Error:**
```
EACCES: permission denied, open 'test-results/...'
```

**Solution:**

```bash
# Create test-results directory with proper permissions
mkdir -p test-results
chmod 755 test-results

# Or run with sudo (not recommended)
sudo node run-tests.js
```

### 12. Reference File Not Found

**Error:**
```
Reference file not found: C:\Users\...
```

**Solution:**

```bash
# Verify reference file path
ls -la "C:\Users\Lenovo ThinkPad T480\Desktop\API-miniapps.ai\deepcrawler-deepcrawler---miniapps.ai.json"

# Update path in test-config.json
{
  "globalConfig": {
    "referenceFile": "/correct/path/to/reference.json"
  }
}

# Or disable reference comparison
# Remove referenceFile from config
```

## Debugging Techniques

### Enable Verbose Logging

```bash
node run-tests.js --verbose
```

### Capture Full Logs

```bash
# Capture all output
node run-tests.js > test-output.log 2>&1

# View logs
cat test-output.log | grep -i error
```

### Manual Testing

```bash
# 1. Start backend
npm run dev

# 2. Open chrome://extensions/
# 3. Load unpacked extension from ./extension

# 4. Navigate to http://localhost:3002

# 5. Open DevTools (F12)

# 6. Check console for errors

# 7. Enter URL and click "Start Discovery"

# 8. Monitor extension logs in chrome://extensions/
```

### Check Extension Logs

```bash
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Service Worker" for DeepCrawler
# 4. View console output
# 5. Look for error messages
```

### Monitor Network Requests

```bash
# 1. Open DevTools (F12)
# 2. Go to Network tab
# 3. Start crawl
# 4. Monitor requests to backend
# 5. Check for 404 or 500 errors
```

### Check Backend Logs

```bash
# Terminal where backend is running
npm run dev

# Look for:
# - "pending crawl" messages
# - "Extension Crawl" messages
# - Error messages
```

## Performance Issues

### Slow Test Execution

```bash
# Reduce monitoring interval
{
  "globalConfig": {
    "monitoringInterval": 2
  }
}

# Reduce crawl timeout
{
  "globalConfig": {
    "crawlTimeout": 60
  }
}

# Disable screenshots
{
  "globalConfig": {
    "screenshotOnCompletion": false
  }
}
```

### High Memory Usage

```bash
# Disable console log capture
{
  "globalConfig": {
    "captureConsoleLogs": false
  }
}

# Disable screenshots
{
  "globalConfig": {
    "screenshotOnCompletion": false
  }
}

# Run tests sequentially instead of parallel
```

## Getting Help

### Check Logs

```bash
# View latest test report
cat test-results/test-report-*.txt | tail -100

# View JSON report
cat test-results/test-report-*.json | jq .

# View error details
cat test-results/test-report-*.json | jq '.diagnostics.errors'
```

### Enable Debug Mode

```bash
DEBUG=* node run-tests.js --verbose
```

### Check Documentation

- TEST-GUIDE.md - Detailed usage guide
- TESTING-SETUP.md - Installation guide
- README-TESTING.md - Feature overview

### Report Issues

When reporting issues, include:

1. Error message
2. Test configuration (test-config.json)
3. Test output (test-report-*.txt)
4. System information (OS, Node version, Chrome version)
5. Steps to reproduce

## Quick Reference

| Issue | Command |
|-------|---------|
| Port in use | `lsof -i :3002 \| grep -v COMMAND \| awk '{print $2}' \| xargs kill -9` |
| Install Playwright | `npm install --save-dev playwright && npx playwright install chromium` |
| Verbose logging | `node run-tests.js --verbose` |
| Increase timeout | `node run-tests.js --timeout 180` |
| View latest report | `cat test-results/test-report-*.txt \| tail -50` |
| Check backend | `curl http://localhost:3002` |
| Start backend | `npm run dev` |
| View extension logs | Open chrome://extensions/ → Service Worker |
| Manual test | Start backend, load extension, navigate to http://localhost:3002 |

## Still Having Issues?

1. Check this troubleshooting guide
2. Review TEST-GUIDE.md
3. Enable verbose logging
4. Check test-results/ for detailed logs
5. Review extension logs in chrome://extensions/
6. Check backend logs in terminal
7. Try manual testing to isolate the issue

