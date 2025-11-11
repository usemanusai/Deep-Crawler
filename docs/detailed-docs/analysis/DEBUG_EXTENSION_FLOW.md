# Debug Extension Data Flow

## 🎯 Complete Data Flow Debugging Guide

### Step 1: Verify Extension is Loaded

1. Open Chrome
2. Go to `chrome://extensions/`
3. Find "DeepCrawler Session Bridge"
4. Verify it shows "Enabled"
5. Click "Details" to see more info

### Step 2: Check Service Worker Console

1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Service Worker" link under "Inspect views"
4. This opens DevTools for the background script
5. Look for logs like:
   ```
   [DeepCrawler] Initializing connection to backend...
   [DeepCrawler] Starting heartbeat immediately...
   [DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
   [DeepCrawler] Initial heartbeat response: 200
   ```

### Step 3: Test Heartbeat

1. Open Service Worker console (see Step 2)
2. Look for periodic logs:
   ```
   [DeepCrawler] Sending periodic heartbeat...
   [DeepCrawler] Heartbeat successful
   ```
3. Should see these every 30 seconds

### Step 4: Check Backend Logs

1. Open dev server terminal
2. Look for logs like:
   ```
   [Extension API] /ping received
   [Extension API] /status { connected: true, lastHeartbeatMs: ... }
   ```

### Step 5: Test Network Capture

1. Open `http://localhost:3002/api/test`
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests`
5. Should show array with captured requests

### Step 6: Test Content Script

1. Open `http://localhost:3002/api/test`
2. Open Chrome DevTools (F12)
3. Go to Console tab
4. Type: `chrome.runtime.sendMessage({type: 'GET_NETWORK_REQUESTS'}, r => console.log('Requests:', r.requests.length))`
5. Should show number > 0

### Step 7: Test Crawl

1. Open `http://localhost:3002`
2. Enter URL: `http://localhost:3002/api/test`
3. Click "Start Discovery"
4. Check:
   - Service Worker console for logs
   - Page console for network capture logs
   - Dev server logs for backend logs
   - Results should show 6+ endpoints

### Step 8: Check Network Tab

1. Open `http://localhost:3002/api/test`
2. Open Chrome DevTools (F12)
3. Go to Network tab
4. Click buttons to make API calls
5. Should see requests like:
   - GET /api/test/users
   - POST /api/test/users
   - PUT /api/test/users/1
   - DELETE /api/test/users/1

## 🔍 Debugging Checklist

- [ ] Extension is enabled in chrome://extensions/
- [ ] Service Worker console shows heartbeat logs
- [ ] Backend logs show /ping requests
- [ ] window.__deepcrawlerRequests contains requests
- [ ] chrome.runtime.sendMessage returns requests
- [ ] Network tab shows API calls
- [ ] Crawl returns 6+ endpoints

## 📊 Expected Logs

### Service Worker Console
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
[DeepCrawler] Initial heartbeat response: 200
[DeepCrawler] Sending periodic heartbeat...
[DeepCrawler] Heartbeat successful
```

### Page Console
```
[DeepCrawler] Network interceptor script loaded in page context
[DeepCrawler] Captured fetch: GET http://localhost:3002/api/test/users 200 (1 total)
[DeepCrawler] Captured fetch: POST http://localhost:3002/api/test/users 201 (2 total)
```

### Content Script Console
```
[DeepCrawler Content] Version: 3.0.0-csp-bypass-fixed
[DeepCrawler Content] Settings loaded { BACKEND_URL: 'http://localhost:3002', EXTENSION_API_KEY: 'deepcrawler-extension-v1' }
[DeepCrawler Content] START_CRAWL received for crawl crawl-...
[DeepCrawler Content] Found 6 requests from page load
[DeepCrawler Content] Sending 6 network requests to backend
```

### Backend Logs
```
[Extension API] /ping received
[Extension API] /status { connected: true, lastHeartbeatMs: ... }
[Extension Crawl] Starting crawl crawl-... for http://localhost:3002/api/test
[Extension Crawl] Received 6 requests, total endpoints: 6
```

## 🚀 Quick Test

1. Reload extension
2. Open http://localhost:3002/api/test
3. Click "Test Multiple Requests"
4. Open http://localhost:3002
5. Enter: http://localhost:3002/api/test
6. Click "Start Discovery"
7. Should see 6+ endpoints

---

**Status**: Debugging guide ready
**Next Action**: Follow steps to debug

