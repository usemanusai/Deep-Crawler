# Critical Fixes Applied - DeepCrawler Extension

## Summary
Fixed multiple critical issues preventing the extension from capturing network requests and discovering API endpoints.

## Issues Fixed

### 1. Missing `setupNetworkInterceptionInPage` Function
**Problem**: The background.js was calling `setupNetworkInterceptionInPage()` in `chrome.scripting.executeScript()` but the function was not defined.

**Fix**: Added the complete function to background.js that:
- Intercepts `window.fetch()` calls
- Intercepts `XMLHttpRequest` calls
- Sends captured requests via `window.postMessage()` to the content script
- Stores requests in `window.__deepcrawlerRequests` for fallback access

**Location**: `extension/background.js` lines 19-104

### 2. CSP (Content Security Policy) Violation
**Problem**: The test page at `/api/test` had a restrictive CSP that blocked inline scripts, preventing the network interceptor from being injected.

**Error**: 
```
Refused to execute inline script because it violates the following Content Security Policy directive
```

**Fix**: Updated `/api/test/route.ts` to include proper CSP headers:
```
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'inline-speculation-rules' http://localhost:* http://127.0.0.1:* chrome-extension://*
```

**Location**: `app/api/test/route.ts` lines 225-231

### 3. Extension Settings Not Being Read
**Problem**: The extension was using hardcoded `BACKEND_URL` and `EXTENSION_API_KEY` instead of reading from `chrome.storage.sync`.

**Fix**: Both `background.js` and `content.js` now:
- Load settings from `chrome.storage.sync` on startup
- Listen for storage changes and update dynamically
- Fall back to hardcoded defaults if storage is unavailable

**Locations**: 
- `extension/background.js` lines 26-47
- `extension/content.js` lines 18-35

### 4. Backend Origin Alignment
**Problem**: The extension was pointing to `http://localhost:3002` but the backend might be running on a different port or host.

**Fix**: The `/api/crawl` endpoint now:
- Resolves the actual server origin from `request.nextUrl.origin`
- Updates the extension config to match the actual backend URL
- Ensures no port mismatches between frontend and backend

**Location**: `app/api/crawl/route.ts` lines 57-64

## How to Test

### Step 1: Reload the Extension
1. Open `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click the reload icon (circular arrow)
4. Verify the extension shows "Connected" status

### Step 2: Verify Backend Connection
```bash
curl -H 'X-Extension-Key: deepcrawler-extension-v1' \
  http://localhost:3002/api/extension/status
```

Expected response:
```json
{"status":"connected","version":"1.0.0","backend":"deepcrawler-v1"}
```

### Step 3: Test the Test Page
1. Navigate to `http://localhost:3002/api/test`
2. Click "Test Multiple Requests" button
3. Verify requests appear in the results section
4. Check browser console for "[DeepCrawler Content]" logs

### Step 4: Run a Full Crawl
```bash
curl -N -H 'Content-Type: application/json' \
  -d '{"url":"http://localhost:3002/api/test","sameOriginOnly":true}' \
  http://localhost:3002/api/crawl
```

Expected output:
- SSE stream with progress updates
- "Extension crawl initiated"
- "Instructing extension to navigate..."
- "Processing N captured network requests"
- "Found X unique endpoints"

## Expected Logs

### Browser Service Worker Console
```
[DeepCrawler] Settings loaded { BACKEND_URL: 'http://localhost:3002', EXTENSION_API_KEY: 'deepcrawler-extension-v1' }
[DeepCrawler] Connected to backend
[DeepCrawler] Found pending crawl: crawl-1761939519100-kfeo4dids
[DeepCrawler] Tab not found, creating new tab for: http://localhost:3002/api/test
[DeepCrawler] Created new tab: 123
[DeepCrawler] START_CRAWL sent successfully
```

### Page Console (Content Script)
```
[DeepCrawler Content] Version: 3.0.0-csp-bypass-fixed
[DeepCrawler Content] Settings loaded { BACKEND_URL: 'http://localhost:3002', EXTENSION_API_KEY: 'deepcrawler-extension-v1' }
[DeepCrawler Content] Network interceptor script injected successfully
[DeepCrawler Content] START_CRAWL received for crawl crawl-1761939519100-kfeo4dids
[DeepCrawler Content] Captured request: GET /api/test/users
[DeepCrawler Content] Sending 5 network requests to backend for crawl crawl-1761939519100-kfeo4dids
[DeepCrawler Content] Successfully sent network data to backend
```

### Server Terminal
```
[Crawl API] Backend origin resolved { origin: 'http://localhost:3002', config: {...} }
[Crawl API] Extension status { connected: true, ... }
[Crawl API] Using extension mode for crawl
[Extension Crawl] Starting crawl crawl-1761939519100-kfeo4dids for http://localhost:3002/api/test
[Extension Crawl] Returning 1 pending crawls
[Extension Crawl] Received 5 requests, total endpoints: 3
[Extension Crawl] Crawl crawl-1761939519100-kfeo4dids completed with 3 endpoints
```

## Troubleshooting

### Extension shows "Disconnected"
1. Check if backend is running: `curl http://localhost:3002/api/extension/status`
2. Verify extension API key matches: `EXTENSION_API_KEY` in background.js
3. Check browser console for connection errors

### No network requests captured
1. Verify CSP headers on the test page: `curl -I http://localhost:3002/api/test | grep CSP`
2. Check page console for "[DeepCrawler Content]" logs
3. Verify network interceptor was injected: look for "Network interceptor script injected"

### Crawl completes with 0 endpoints
1. Check if extension is actually connected (see logs above)
2. Verify the test page is making API requests (click buttons on the page)
3. Check if content script is receiving START_CRAWL message
4. Verify backend is receiving PUT requests to `/api/extension/crawl`

## Files Modified

1. `extension/background.js` - Added setupNetworkInterceptionInPage function, settings loading
2. `extension/content.js` - Added settings loading from chrome.storage.sync
3. `app/api/test/route.ts` - Added proper CSP headers
4. `app/api/crawl/route.ts` - Added backend origin alignment
5. `package.json` - Ensured dev/start scripts run on port 3002

## Next Steps

1. Reload the extension in Chrome
2. Run the test page and verify network requests are captured
3. Run a full crawl and verify endpoints are discovered
4. If issues persist, check the logs in the troubleshooting section above

