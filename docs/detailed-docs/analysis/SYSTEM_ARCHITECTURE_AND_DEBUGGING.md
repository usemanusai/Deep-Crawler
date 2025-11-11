# DeepCrawler System Architecture & Debugging Guide

## 🏗️ System Architecture

### High-Level Flow

```
User UI (http://localhost:3002)
    ↓
    POST /api/crawl
    ↓
Backend checks extension status
    ↓
If extension connected:
    POST /api/extension/crawl (create session)
    ↓
Extension polls GET /api/extension/crawl/pending
    ↓
Extension creates tab with URL
    ↓
Content script captures network requests
    ↓
Extension sends PUT /api/extension/crawl/data
    ↓
Backend processes data and discovers endpoints
    ↓
Crawl completes, returns endpoints to UI
```

### Component Breakdown

#### 1. Backend (Next.js API Routes)

**Files**:
- `app/api/crawl/route.ts` - Main crawl endpoint
- `app/api/extension/status/route.ts` - Extension status check
- `app/api/extension/ping/route.ts` - Heartbeat endpoint
- `app/api/extension/crawl/route.ts` - Crawl session management
- `lib/extensionState.ts` - Extension connection state
- `lib/extensionManager.ts` - Extension routing logic

**Key Functions**:
- `checkExtensionStatus()` - Checks if extension is connected
- `sendCrawlToExtension()` - Sends crawl to extension
- `isExtensionRecentlyAlive()` - Checks if heartbeat is recent

#### 2. Extension (Chrome Extension)

**Files**:
- `extension/manifest.json` - Extension configuration
- `extension/background.js` - Service worker (main logic)
- `extension/content.js` - Content script (page interaction)
- `extension/network-interceptor.js` - Network capture (MAIN world)

**Key Functions**:
- `startHeartbeat()` - Sends heartbeat every 30 seconds
- `startPollingForCrawls()` - Polls for pending crawls every 2 seconds
- `waitForTabLoad()` - Waits for tab to load
- `sendStartCrawlToTab()` - Sends START_CRAWL message

#### 3. Network Capture

**Flow**:
1. `network-interceptor.js` runs in MAIN world
2. Intercepts `window.fetch` and `XMLHttpRequest`
3. Stores requests in `window.__deepcrawlerRequests`
4. Sends `postMessage` to content script
5. Content script stores in `NETWORK_REQUESTS` array
6. Periodically sends to backend via PUT

## 🔍 Debugging Guide

### Issue 1: Extension Not Connected

**Symptoms**:
- Backend shows `connected: false`
- No heartbeat logs in Service Worker console
- `test-extension-load.js` shows "Extension is NOT connected"

**Root Causes**:
1. Extension not loaded in Chrome
2. Extension not sending heartbeats
3. Backend not receiving heartbeats

**Debugging Steps**:

```bash
# Step 1: Check if extension is loaded
# Go to chrome://extensions/ and look for "DeepCrawler Session Bridge"

# Step 2: Check Service Worker console
# Click "Service Worker" link and look for "[DeepCrawler]" logs

# Step 3: Check backend logs
# Look for "[Extension API] /ping" logs

# Step 4: Run test script
node test-extension-load.js
```

**Fixes**:
- Load extension in Chrome (see EXTENSION_LOADING_GUIDE.md)
- Check BACKEND_URL in background.js
- Check EXTENSION_API_KEY matches
- Verify network connectivity

### Issue 2: Pending Crawls Returns 0

**Symptoms**:
- Crawl is initiated but extension doesn't find it
- `GET /api/extension/crawl/pending` returns empty array
- No tab is created

**Root Causes**:
1. Extension not polling
2. Crawl session not created
3. Extension not connected

**Debugging Steps**:

```bash
# Step 1: Check Service Worker console for polling logs
# Should see "[DeepCrawler] Polling for pending crawls..."

# Step 2: Check backend logs for crawl creation
# Should see "[Extension Crawl] ========== STARTING CRAWL =========="

# Step 3: Manually check pending crawls
curl -H "X-Extension-Key: deepcrawler-extension-v1" \
  http://localhost:3002/api/extension/crawl/pending
```

**Fixes**:
- Verify extension is connected
- Check polling interval (should be 2 seconds)
- Check backend logs for crawl creation errors
- Verify crawl session is stored in `activeCrawlSessions`

### Issue 3: Network Capture Not Working

**Symptoms**:
- Tab is created but no network requests captured
- `window.__deepcrawlerRequests` is empty
- Crawl returns 0 endpoints

**Root Causes**:
1. Network interceptor not injected
2. Content script not running
3. Network requests not being captured

**Debugging Steps**:

```bash
# Step 1: Check if network interceptor is injected
# Open page console and type: window.__deepcrawlerRequests
# Should show array with requests

# Step 2: Check content script console
# Should see "[DeepCrawler Content]" logs

# Step 3: Check network-interceptor.js logs
# Should see "[DeepCrawler] Captured fetch" logs

# Step 4: Check manifest.json
# Verify content_scripts are configured correctly
```

**Fixes**:
- Verify manifest.json has correct content_scripts
- Check that network-interceptor.js exists
- Verify world: "MAIN" is set in manifest
- Check CSP headers allow extension scripts
- Try reloading extension

### Issue 4: Data Not Sent to Backend

**Symptoms**:
- Network requests captured but not sent to backend
- No PUT requests in backend logs
- Crawl times out

**Root Causes**:
1. Content script not sending data
2. Backend not receiving PUT requests
3. Network error in submission

**Debugging Steps**:

```bash
# Step 1: Check content script console
# Should see "Sending network data to backend" logs

# Step 2: Check backend logs
# Should see "[Extension Crawl] Received network data" logs

# Step 3: Check network tab in DevTools
# Should see PUT requests to /api/extension/crawl/data

# Step 4: Check for errors
# Look for error messages in any console
```

**Fixes**:
- Verify content script is running
- Check BACKEND_URL in content.js
- Check EXTENSION_API_KEY matches
- Verify network connectivity
- Check backend logs for errors

### Issue 5: Crawl Returns 0 Endpoints

**Symptoms**:
- Crawl completes but shows "Found 0 API endpoints"
- Network requests were captured
- Data was sent to backend

**Root Causes**:
1. No API endpoints in captured requests
2. Endpoint parsing logic not working
3. Wrong URL being crawled

**Debugging Steps**:

```bash
# Step 1: Check captured requests
# Look at network data sent to backend
# Should have 10+ requests

# Step 2: Check endpoint parsing
# Look at backend logs for endpoint extraction
# Should show extracted endpoints

# Step 3: Try different URL
# Use URL with more API endpoints
# e.g., https://api.example.com instead of https://example.com
```

**Fixes**:
- Use URL with actual API endpoints
- Check endpoint parsing logic
- Verify requests are being captured
- Check backend logs for parsing errors

## 📊 Monitoring

### Key Metrics

1. **Extension Connection**:
   - `GET /api/extension/status` → `connected: true/false`
   - Last heartbeat timestamp

2. **Pending Crawls**:
   - `GET /api/extension/crawl/pending` → array of pending crawls
   - Should be 0 when no crawls active

3. **Network Capture**:
   - `window.__deepcrawlerRequests.length` → number of captured requests
   - Should be 6+ for typical page

4. **Crawl Progress**:
   - Backend logs show crawl start/completion
   - PUT requests show data submission
   - Endpoints discovered count

### Logging

**Service Worker Console**:
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Sending initial heartbeat...
[DeepCrawler] Heartbeat successful
[DeepCrawler] Polling for pending crawls...
[DeepCrawler] Found pending crawl: crawl-1762553911457
[DeepCrawler] Created new tab: 123
[DeepCrawler] Sending START_CRAWL to tab 123
```

**Content Script Console**:
```
[DeepCrawler Content] START_CRAWL received
[DeepCrawler Content] Found 6 requests from page load
[DeepCrawler Content] Sending network data to backend
[DeepCrawler Content] Data sent successfully
```

**Backend Logs**:
```
[Extension Crawl] ========== STARTING CRAWL ==========
[Extension Crawl] Received network data from extension
[Extension Crawl] ========== CRAWL COMPLETED ==========
```

## 🎯 Success Indicators

- ✅ Extension shows `connected: true`
- ✅ Service Worker console shows heartbeat logs
- ✅ Pending crawls endpoint returns data
- ✅ Tab is created with correct URL
- ✅ Network requests are captured (6+)
- ✅ Data is sent to backend (PUT requests)
- ✅ Crawl completes with endpoints (10+)
- ✅ No errors in any console

---

**Status**: System ready for debugging  
**Next Action**: Follow debugging steps for your specific issue

