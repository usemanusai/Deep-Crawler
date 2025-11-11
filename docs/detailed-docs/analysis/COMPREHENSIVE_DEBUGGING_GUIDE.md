# DeepCrawler Extension - Comprehensive Debugging Guide

## 🎯 Problem Statement

The DeepCrawler extension is returning 0 endpoints despite:
- Backend working correctly (verified with tests)
- Extension code being correct
- Network capture logic being sound

**Root Cause**: The Chrome extension is NOT LOADED in the browser.

## 🔍 Diagnosis

### Current State
- ❌ Extension status: `disconnected`
- ❌ Last heartbeat: From test script (not from actual extension)
- ❌ Pending crawls: Returns 0 (no sessions created)
- ❌ Network data: Never submitted (no PUT requests)

### Why This Happens
1. Extension code is correct and ready
2. Backend is working correctly
3. **BUT**: The extension is not loaded in Chrome
4. Without loading, no heartbeats are sent
5. Without heartbeats, backend thinks extension is disconnected
6. Without connection, crawls use server-side fallback
7. Server-side crawl returns 0 endpoints (no authentication)

## ✅ Solution: Load Extension in Chrome

### Prerequisites
- Chrome browser installed
- Backend running on port 3002
- Extension files in: `hyperbrowser-app-examples/deep-crawler-bot/extension`

### Step-by-Step Instructions

#### 1. Open Chrome Extensions Page
```
1. Open Chrome
2. Type in address bar: chrome://extensions/
3. Press Enter
```

#### 2. Enable Developer Mode
```
1. Look for "Developer mode" toggle (top-right corner)
2. Click to enable
3. New buttons should appear: "Load unpacked", "Pack extension", etc.
```

#### 3. Load the Extension
```
1. Click "Load unpacked" button
2. Navigate to: hyperbrowser-app-examples/deep-crawler-bot/extension
3. Click "Select Folder"
4. Extension should appear in the list
```

#### 4. Verify Extension Loaded
```
1. Look for "DeepCrawler Session Bridge" in the list
2. Verify it's enabled (toggle is ON)
3. Note the extension ID (long alphanumeric string)
```

#### 5. Check Service Worker Logs
```
1. Find "DeepCrawler Session Bridge" in the list
2. Click "Service Worker" link
3. DevTools window opens
4. Go to "Console" tab
5. You should see logs starting with "[DeepCrawler]"
```

## 🧪 Verification Steps

### Step 1: Verify Heartbeat
```bash
# Terminal 1: Run monitoring script
cd hyperbrowser-app-examples/deep-crawler-bot
node test-extension-load.js
```

Expected output:
```
✅ Extension is already connected!
   The extension is loaded and sending heartbeats.
```

### Step 2: Check Service Worker Console
Expected logs:
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Backend URL: http://localhost:3002
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
[DeepCrawler] Initial heartbeat response: 200
[DeepCrawler] Initial heartbeat successful
[DeepCrawler] Connected to backend
[DeepCrawler] Sending periodic heartbeat...
[DeepCrawler] Heartbeat successful
```

### Step 3: Test Network Capture
```
1. Open new tab: http://localhost:3002/api/test
2. Open DevTools (F12)
3. Go to Console tab
4. Type: window.__deepcrawlerRequests
5. Should show array with 6+ requests
```

### Step 4: Test Full Crawl
```
1. Open: http://localhost:3002
2. Enter URL: https://miniapps.ai
3. Click "Start Discovery"
4. Wait for completion
5. Should show: "Found 10+ API endpoints"
```

## 🐛 Troubleshooting

### Issue: Extension Not Appearing
**Solution**:
- Verify path: `hyperbrowser-app-examples/deep-crawler-bot/extension`
- Check manifest.json exists
- Refresh extensions page (F5)
- Try reloading extension (toggle off/on)

### Issue: Extension Shows Error
**Solution**:
- Click extension to see error details
- Check manifest.json syntax (use JSON validator)
- Verify all .js files exist
- Check file permissions

### Issue: No Heartbeat Logs
**Solution**:
- Verify backend is running: `npm run dev`
- Check BACKEND_URL in background.js
- Verify EXTENSION_API_KEY matches
- Try reloading extension
- Check browser console for errors

### Issue: Heartbeat Fails with 404
**Solution**:
- Verify backend is running on port 3002
- Check firewall settings
- Try accessing http://localhost:3002 directly
- Check backend logs for errors

### Issue: Crawl Still Returns 0 Endpoints
**Solution**:
- Verify extension is connected (check status)
- Verify network capture is working (check window.__deepcrawlerRequests)
- Check Service Worker console for errors
- Check backend logs for PUT requests
- Try different URL (e.g., http://localhost:3002/api/test)

## 📊 Expected Results

### After Loading Extension
- ✅ Extension appears in chrome://extensions/
- ✅ Service Worker console shows heartbeat logs
- ✅ Backend status shows `connected: true`
- ✅ test-extension-load.js shows "Extension connected"

### After Testing Network Capture
- ✅ window.__deepcrawlerRequests shows 6+ requests
- ✅ Page console shows "[DeepCrawler] Captured fetch" logs
- ✅ Network tab shows actual requests

### After Running Full Crawl
- ✅ Crawl completes successfully
- ✅ Shows "Found 10+ API endpoints"
- ✅ Endpoints list shows actual APIs
- ✅ Backend logs show PUT requests with network data

## 🎓 How It Works

### Extension Flow
```
1. Extension loads in Chrome
2. background.js initializes
3. Sends heartbeat every 30 seconds
4. Polls for pending crawls every 5 seconds
5. When crawl found:
   - Creates new tab with URL
   - Sends START_CRAWL to content script
   - Content script captures network requests
   - Sends PUT requests with data every 500ms
6. Backend processes data and completes crawl
```

### Network Capture Flow
```
1. network-interceptor.js runs in MAIN world
2. Intercepts window.fetch and XMLHttpRequest
3. Stores requests in window.__deepcrawlerRequests
4. Sends postMessage to content script
5. Content script stores in NETWORK_REQUESTS array
6. Periodically sends to backend via PUT
```

## 🚀 Next Steps

1. ✅ Load extension in Chrome (follow steps above)
2. ✅ Verify heartbeat in Service Worker console
3. ✅ Run `node test-extension-load.js`
4. ✅ Test network capture on test page
5. ✅ Run full crawl on http://localhost:3002
6. ✅ Verify 10+ endpoints discovered

---

**Status**: Extension ready to load  
**Next Action**: Follow loading instructions above

