# Extension Testing Guide - 86 Endpoint Discovery

## Quick Start

### 1. Reload Extension
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon to reload
4. Verify "🟢 Extension Connected" appears on http://localhost:3002

### 2. Test Network Capture
1. Open new tab: https://miniapps.ai
2. Open DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests.length`
5. **Expected**: Should show > 0 (number of captured requests)
6. **If 0 or undefined**: Network interceptor not working

### 3. Start Crawl
1. Go to http://localhost:3002
2. Verify "🟢 Extension Connected" indicator
3. Enter URL: https://miniapps.ai
4. Click "Start Discovery"
5. Wait for crawl to complete (~2-3 minutes)
6. **Expected**: Should show "86 endpoints discovered"
7. **If 0**: See debugging section below

## Debugging - If 0 Endpoints Discovered

### Check 1: Network Interceptor Loaded
**On https://miniapps.ai DevTools Console:**
```javascript
// Should return > 0
window.__deepcrawlerRequests.length

// Should return array of requests
window.__deepcrawlerRequests.slice(0, 3)

// Should return function
typeof window.__deepcrawlerGetRequests
```

**Expected Output:**
```
> 45
> [{method: "GET", url: "https://miniapps.ai", status: 200, ...}, ...]
> "function"
```

**If undefined or 0:**
- Network interceptor not injected
- Check manifest.json configuration
- Reload extension and try again

### Check 2: Content Script Receiving Messages
**On https://miniapps.ai DevTools Console:**
1. Look for logs: `[DeepCrawler Content] Message #1 received`
2. Should see multiple messages as page loads
3. If not present: postMessage events not being received

**Fix:**
- Reload extension
- Reload page
- Check for errors in console

### Check 3: START_CRAWL Message Received
**On https://miniapps.ai DevTools Console:**
1. Click "Start Discovery" on http://localhost:3002
2. Look for: `[DeepCrawler Content] START_CRAWL received for crawl`
3. If not present: START_CRAWL message not being sent

**Fix:**
- Check background script logs (chrome://extensions/ → Service Worker)
- Verify backend is running on http://localhost:3002
- Check for errors in backend logs

### Check 4: Data Sent to Backend
**On https://miniapps.ai DevTools Network Tab:**
1. Click "Start Discovery"
2. Filter for: `crawl/data`
3. Should see PUT requests to `/api/extension/crawl/data`
4. Check request payload - should contain network requests
5. If not present: Content script not sending data

**Fix:**
- Verify isCrawling flag is set to true
- Check for errors in console
- Verify backend is responding with 200 OK

### Check 5: Backend Receiving Data
**In backend terminal:**
1. Look for: `[Extension Crawl Data] Received`
2. Should show number of requests received
3. Should show number of API endpoints found
4. If not present: Backend not receiving data

**Fix:**
- Check backend logs for errors
- Verify extension API key is correct
- Verify backend URL is correct

## Expected Console Logs

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

### Background Script (Service Worker)
```
[DeepCrawler] Heartbeat successful
[DeepCrawler] Poll #1: Found 1 pending crawls
[DeepCrawler] Sending START_CRAWL to tab 123
[DeepCrawler] START_CRAWL sent successfully
```

## Success Criteria

✅ Network interceptor captures requests
✅ Content script receives postMessage events
✅ START_CRAWL message is received
✅ Data is sent to backend
✅ Backend processes data
✅ 86 endpoints discovered

## If Still Not Working

1. Reload extension (chrome://extensions/)
2. Reload page (https://miniapps.ai)
3. Clear browser cache
4. Restart backend server
5. Try again

If still failing, collect logs from:
- DevTools Console (https://miniapps.ai)
- Service Worker logs (chrome://extensions/ → Service Worker)
- Backend terminal logs
- Network tab (PUT requests to /api/extension/crawl/data)

