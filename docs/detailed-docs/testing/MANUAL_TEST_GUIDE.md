# Manual Testing Guide for DeepCrawler Extension

## Prerequisites

1. **Dev Server Running**: `npm run dev` on port 3002
2. **Chrome Browser**: With extension loaded
3. **DevTools Open**: For debugging

## Step 1: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to: `hyperbrowser-app-examples/deep-crawler-bot/extension`
6. Click "Select Folder"
7. Extension should appear as "DeepCrawler Session Bridge"

## Step 2: Verify Extension is Loaded

1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Verify it shows "Enabled"
4. Click "Details" to see:
   - Version: 1.0.0
   - Permissions: tabs, activeTab, scripting, storage, cookies
   - Host permissions: <all_urls>, http://localhost:3002/*, http://localhost/*

## Step 3: Check Service Worker

1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Under "Inspect views", click "Service Worker"
4. This opens DevTools for the background script
5. Go to Console tab
6. You should see logs like:
   ```
   [DeepCrawler] Initializing connection to backend...
   [DeepCrawler] Starting heartbeat immediately...
   [DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
   [DeepCrawler] Initial heartbeat response: 200
   [DeepCrawler] Sending periodic heartbeat...
   [DeepCrawler] Heartbeat successful
   ```

## Step 4: Verify Backend Sees Extension

1. Open dev server terminal
2. Look for logs like:
   ```
   [Extension API] /ping received
   [Extension API] /status { connected: true, lastHeartbeatMs: ... }
   ```

## Step 5: Test Network Capture

1. Open `http://localhost:3002/api/test` in a new tab
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests`
5. Should show array with captured requests like:
   ```
   [
     { method: 'GET', url: 'http://localhost:3002/api/test/users', status: 200, ... },
     { method: 'POST', url: 'http://localhost:3002/api/test/users', status: 201, ... },
     ...
   ]
   ```

## Step 6: Test Content Script

1. Open `http://localhost:3002/api/test` in a new tab
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Type: `chrome.runtime.sendMessage({type: 'GET_NETWORK_REQUESTS'}, r => console.log('Requests:', r.requests.length))`
5. Should show: `Requests: 6` (or more)

## Step 7: Test Full Crawl

1. Open `http://localhost:3002` in a new tab
2. Enter URL: `http://localhost:3002/api/test`
3. Click "Start Discovery"
4. Watch the progress:
   - Should show "Waiting for extension to capture network requests..."
   - Should show "Received X endpoints so far"
   - Should complete with "Found 6+ endpoints"

## Step 8: Check All Logs

### Service Worker Console
- Should show heartbeat logs every 30 seconds
- Should show START_CRAWL messages when crawl starts

### Page Console (http://localhost:3002/api/test)
- Should show network capture logs
- Should show requests being captured

### Dev Server Terminal
- Should show [Extension API] logs
- Should show [Extension Crawl] logs

## Debugging Checklist

- [ ] Extension is enabled in chrome://extensions/
- [ ] Service Worker console shows heartbeat logs
- [ ] Backend logs show /ping requests
- [ ] window.__deepcrawlerRequests contains requests
- [ ] chrome.runtime.sendMessage returns requests
- [ ] Network tab shows API calls
- [ ] Crawl returns 6+ endpoints
- [ ] No errors in any console

## Expected Results

### Extension Status
```
connected: true
lastHeartbeatMs: <recent timestamp>
```

### Network Requests Captured
```
6+ requests from http://localhost:3002/api/test
```

### Crawl Results
```
Found 6 unique endpoints:
- GET /api/test/users
- POST /api/test/users
- PUT /api/test/users/1
- DELETE /api/test/users/1
- GET /api/test/posts
- GET /api/test/comments
```

## Troubleshooting

### Extension Not Connecting
1. Check Service Worker console for errors
2. Verify BACKEND_URL is correct (http://localhost:3002)
3. Verify EXTENSION_API_KEY is correct (deepcrawler-extension-v1)
4. Check backend logs for /ping requests

### No Network Requests Captured
1. Check page console for network interceptor logs
2. Verify network-interceptor.js is injected (should see "[DeepCrawler] Network interceptor script loaded")
3. Check Network tab to see if requests are being made
4. Verify content.js is receiving messages

### Crawl Returns 0 Endpoints
1. Check if network requests are being captured
2. Check if content.js is sending PUT requests to backend
3. Check backend logs for PUT requests
4. Verify API detection logic is working

## Quick Test Commands

### Check Extension Status
```bash
curl -H "X-Extension-Key: deepcrawler-extension-v1" http://localhost:3002/api/extension/status
```

### Send Heartbeat
```bash
curl -X POST -H "X-Extension-Key: deepcrawler-extension-v1" http://localhost:3002/api/extension/ping
```

### Initiate Crawl
```bash
curl -X POST -H "X-Extension-Key: deepcrawler-extension-v1" -H "Content-Type: application/json" \
  -d '{"requestId":"test-123","url":"http://localhost:3002/api/test","sameOriginOnly":true}' \
  http://localhost:3002/api/extension/crawl
```

---

**Status**: Manual testing guide ready
**Next Action**: Follow steps to manually test with actual Chrome extension

