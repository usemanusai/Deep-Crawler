# DeepCrawler Extension - webRequest API Implementation

## 🎯 Root Cause Identified

Based on the conversation in `Capturing-Authenticated-API-Endpoints.md`, the extension was failing because:

1. **Old Approach**: Tried to intercept network requests using `window.fetch` and `XMLHttpRequest` overrides
2. **Problem**: This only captures requests made by page JavaScript, not ALL network requests
3. **Solution**: Use Chrome's `chrome.webRequest` API to capture ALL network requests at the browser level

## ✅ Changes Implemented

### 1. **manifest.json** - Added webRequest Permission
```json
"permissions": [
  "tabs",
  "activeTab",
  "scripting",
  "storage",
  "cookies",
  "webRequest"  // ← ADDED
]
```

### 2. **background.js** - Implemented webRequest Listeners

**Added:**
- `setupWebRequestListener()` function that:
  - Tracks active crawl IDs
  - Listens for START_CRAWL_TRACKING messages from content script
  - Installs `chrome.webRequest.onBeforeRequest` listener
  - Installs `chrome.webRequest.onCompleted` listener
  - Captures ALL network requests for active crawls
  - Stores requests in `crawlNetworkRequests` Map

**Key Features:**
- Skips extension requests and data URLs
- Logs first 5 requests for debugging
- Stores requests with: method, url, type, timestamp, tabId, status
- Responds to GET_CRAWL_NETWORK_REQUESTS messages

### 3. **content.js** - Enhanced Network Data Sending

**Added:**
- `fetchBackgroundNetworkRequests()` function to retrieve captured requests from background script
- Modified `sendNetworkDataToBackend()` to:
  - Fetch requests from background script
  - Merge with content script requests (avoid duplicates)
  - Send merged requests to backend

**Modified START_CRAWL Handler:**
- Sends START_CRAWL_TRACKING message to background script
- Activates webRequest listener for this crawl

## 🔄 Data Flow

```
1. User clicks "Start Discovery"
   ↓
2. Backend creates crawl session
   ↓
3. Extension polls for pending crawls
   ↓
4. Extension creates new tab with target URL
   ↓
5. Content script receives START_CRAWL message
   ↓
6. Content script sends START_CRAWL_TRACKING to background
   ↓
7. Background script activates webRequest listeners
   ↓
8. Page loads and makes network requests
   ↓
9. webRequest listeners capture ALL requests
   ↓
10. Content script periodically fetches captured requests
    ↓
11. Content script sends requests to backend via PUT
    ↓
12. Backend processes requests and discovers endpoints
    ↓
13. Crawl completes with endpoints
```

## 🧪 Testing Steps

### Step 1: Reload Extension
```
1. Open Chrome
2. Go to: chrome://extensions/
3. Find: "DeepCrawler Session Bridge"
4. Click: Refresh icon
```

### Step 2: Verify Extension is Connected
```bash
node test-extension-load.js
```
Expected: `✅ Extension is already connected!`

### Step 3: Test Network Capture
```
1. Open: http://localhost:3002/api/test
2. Open DevTools (F12)
3. Go to Console tab
4. Type: window.__deepcrawlerRequests
5. Press Enter
```
Expected: Array with 6+ requests

### Step 4: Check Service Worker Console
```
1. Go to: chrome://extensions/
2. Find: "DeepCrawler Session Bridge"
3. Click: "Service Worker" link
4. Look for logs:
   - "[DeepCrawler] webRequest.onBeforeRequest listener installed"
   - "[DeepCrawler] webRequest.onCompleted listener installed"
```

### Step 5: Start Crawl
```
1. Open: http://localhost:3002
2. Enter: https://miniapps.ai
3. Click: "Start Discovery"
4. Wait: 30-60 seconds
```

### Step 6: Check Results
Expected: "Found X endpoints" (X > 0)

## 📊 Expected Console Logs

### Service Worker Console
```
[DeepCrawler] webRequest.onBeforeRequest listener installed successfully
[DeepCrawler] webRequest.onCompleted listener installed successfully
[DeepCrawler] Starting network tracking for crawl: crawl-XXXXX
[DeepCrawler] Captured request: GET https://miniapps.ai (type: document)
[DeepCrawler] Captured request: GET https://miniapps.ai/api/... (type: xhr)
[DeepCrawler] Returning 10 captured requests for crawl crawl-XXXXX
```

### Content Script Console
```
[DeepCrawler Content] START_CRAWL received for crawl crawl-XXXXX
[DeepCrawler Content] Background script notified to start tracking
[DeepCrawler Content] Sending 10 new network requests to backend
[DeepCrawler Content] Successfully sent network data to backend
```

### Backend Logs
```
[Extension Crawl] PUT request received: requestId=crawl-XXXXX
[Extension Crawl] Processing 10 network requests
[Extension Crawl] Received 10 requests, total endpoints: 15
```

## ✨ Key Improvements

1. **Comprehensive Capture**: webRequest API captures ALL network requests, not just JavaScript-initiated ones
2. **Authenticated Sessions**: Works with logged-in users because requests include authentication tokens
3. **Reliable**: Uses Chrome's native API instead of JavaScript interception
4. **Efficient**: Minimal overhead, only tracks active crawls
5. **Debuggable**: Extensive logging for troubleshooting

## 🚀 Success Criteria

- ✅ Extension captures network requests
- ✅ Data sent to backend
- ✅ Backend discovers endpoints
- ✅ Crawl completes with 10+ endpoints
- ✅ No timeouts or errors

## 📝 Files Modified

1. `extension/manifest.json` - Added webRequest permission
2. `extension/background.js` - Implemented webRequest listeners
3. `extension/content.js` - Enhanced network data sending

## 🔍 Debugging

If crawl still returns 0 endpoints:

1. **Check Service Worker Console**
   - Look for webRequest listener installation logs
   - Check for errors

2. **Check Content Script Console**
   - Look for START_CRAWL_TRACKING message
   - Check for network data sending logs

3. **Check Backend Logs**
   - Look for PUT requests
   - Check for request processing logs

4. **Run Diagnostic**
   ```bash
   node diagnose-issue.js
   ```

## 📞 Next Steps

1. Reload extension in Chrome
2. Follow testing steps above
3. Monitor console logs
4. Report any errors

---

**Status**: ✅ Implementation Complete  
**Ready for Testing**: YES  
**Estimated Time to Resolution**: 30 minutes

