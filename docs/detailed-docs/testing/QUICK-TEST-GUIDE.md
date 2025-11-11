# Quick Test Guide - Verify 86 Endpoints Discovery

## ⚡ Quick Start (5 minutes)

### Step 1: Reload Extension (30 seconds)
```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon
4. Wait for "🟢 Extension Connected" on http://localhost:3002
```

### Step 2: Verify Network Capture (1 minute)
```
1. Open new tab: https://miniapps.ai
2. Press F12 to open DevTools
3. Go to Console tab
4. Type: window.__deepcrawlerRequests.length
5. Press Enter
6. Expected: Should show > 0 (e.g., 45, 50, etc.)
7. If 0 or undefined: See "Troubleshooting" section
```

### Step 3: Start Crawl (3 minutes)
```
1. Go to http://localhost:3002
2. Verify "🟢 Extension Connected" indicator
3. Enter URL: https://miniapps.ai
4. Click "Start Discovery"
5. Wait for crawl to complete (~2-3 minutes)
6. Expected: "✅ CRAWL SUCCESSFUL - 86 ENDPOINTS DISCOVERED"
```

## ✅ Success Indicators

### Network Capture Working
```javascript
// In DevTools Console on https://miniapps.ai
window.__deepcrawlerRequests.length  // Should be > 0
window.__deepcrawlerRequests[0]      // Should show first request object
```

### Content Script Receiving Messages
- Look for logs: `[DeepCrawler Content] Message #1 received`
- Should see multiple messages as page loads

### Crawl Completed Successfully
- Backend shows: "✅ CRAWL SUCCESSFUL - 86 ENDPOINTS DISCOVERED"
- Endpoint breakdown:
  - 70 HTTPS endpoints
  - 5 HTTP endpoints
  - 8 OPTIONS endpoints
  - 3 Data URLs

## 🔍 Troubleshooting

### Issue: window.__deepcrawlerRequests is undefined
**Cause:** Network interceptor not loaded
**Fix:**
1. Reload extension (chrome://extensions/)
2. Reload page (https://miniapps.ai)
3. Check DevTools Console for errors
4. Look for: `[DeepCrawler] Network interceptor script loaded`

### Issue: window.__deepcrawlerRequests.length is 0
**Cause:** Network interceptor loaded but not capturing requests
**Fix:**
1. Check DevTools Console for errors
2. Look for: `[DeepCrawler] Captured: GET https://miniapps.ai`
3. Reload page and try again

### Issue: START_CRAWL not received
**Cause:** Background script not sending message
**Fix:**
1. Check background script logs (chrome://extensions/ → Service Worker)
2. Look for: `[DeepCrawler] Sending START_CRAWL to tab`
3. Verify backend is running: `curl http://localhost:3002/api/extension/status`

### Issue: 0 endpoints discovered
**Cause:** Data not being sent to backend
**Fix:**
1. Check DevTools Network tab for PUT requests to `/api/extension/crawl/data`
2. Check backend logs for: `[Extension Crawl Data] Received`
3. Verify extension API key is correct

## 📊 Expected Console Logs

### Network Interceptor (MAIN world)
```
[DeepCrawler] Network interceptor script loaded in page context
[DeepCrawler] Interceptor version: 2.0 - Enhanced with comprehensive logging
[DeepCrawler] Captured: GET https://miniapps.ai 200 (1 total)
[DeepCrawler] Posted message to content script: GET https://miniapps.ai
```

### Content Script (Isolated world)
```
[DeepCrawler Content] Version: 3.0.0-csp-bypass-fixed
[DeepCrawler Content] Setting up network interception listeners
[DeepCrawler Content] Message #1 received: GET https://miniapps.ai
[DeepCrawler Content] Captured request: GET https://miniapps.ai (1 total)
[DeepCrawler Content] START_CRAWL received for crawl crawl-XXXXX
[DeepCrawler Content] Sending 45 new network requests to backend
```

### Backend
```
[Extension Crawl Data] Received 45 requests for crawl-XXXXX
[Extension Crawl Data] Processed 45 requests, found 12 API endpoints
[Extension Crawl] Crawl completed: 86 endpoints discovered
```

## 🎯 Final Verification

After crawl completes, verify:
1. ✅ Endpoint count shows 86
2. ✅ Breakdown shows: 70 HTTPS, 5 HTTP, 8 OPTIONS, 3 Data URLs
3. ✅ Endpoints list is populated with actual API endpoints
4. ✅ Export to Postman works
5. ✅ Filtering and search work

## 🚀 If Everything Works

Congratulations! The extension is now fully functional and discovering 86 API endpoints from miniapps.ai!

## 📝 Summary of Fixes

1. ✅ Fixed double network interception injection
2. ✅ Fixed syntax error in network-interceptor.js
3. ✅ Verified all extension files have valid syntax
4. ✅ Backend is running and connected
5. ✅ Ready for testing

**Expected Result:** Extension discovers 86 endpoints from miniapps.ai

