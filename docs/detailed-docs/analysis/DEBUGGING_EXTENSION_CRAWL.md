# Debugging Extension Crawl - Complete Guide

## What Was Fixed

The extension crawl implementation has been updated to **exactly mirror** the server-side crawl workflow:

### Changes Made

1. **Content Script - Page Load Waiting**
   - Added `waitForPageLoad()` function
   - Waits for `document.readyState === 'complete'`
   - Waits additional 3 seconds for network to settle
   - Ensures page is fully loaded before interactions

2. **Content Script - Interaction Matching**
   - ✅ Scrolling: 100ms intervals (MATCHED)
   - ✅ Clicking: 3 elements per selector (MATCHED - was 2)
   - ✅ Click wait: 500ms between clicks (MATCHED - was 300ms)
   - ✅ Forms: 3 forms processed (MATCHED - was 2)
   - ✅ Inputs: 2 inputs per form (MATCHED - was 1)
   - ✅ Test data: Realistic values like 'react', 'javascript' (MATCHED - was 'test')
   - ✅ Enter key: 1000ms wait after (MATCHED - was 500ms)
   - ✅ Final wait: 3 seconds (MATCHED)

3. **Content Script - Network Interception**
   - Added `contentType` capture for fetch and XHR
   - Added detailed console logging for each request
   - Logs method, URL, and status for debugging

4. **Background Script - START_CRAWL Timing**
   - Added proper response handling for START_CRAWL message
   - Added 1 second delay before backend request
   - Ensures content script is ready before backend starts waiting

5. **Backend - API Detection**
   - Already implemented same logic as server-side
   - Filters static assets and analytics
   - Detects API endpoints with same patterns

---

## How to Debug

### Step 1: Check Content Script Initialization

**Open DevTools on target page**:
1. Go to the website you want to crawl
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for these logs:

```
[DeepCrawler Content] Initializing on page: https://...
[DeepCrawler Content] Setting up network interception
[DeepCrawler Content] Network interception setup complete
```

**If you don't see these logs**:
- Content script is not injected
- Check `extension/manifest.json` content_scripts section
- Verify the URL pattern matches the target page

### Step 2: Check START_CRAWL Message

**In DevTools Console**:
1. Start a crawl from http://localhost:3002
2. Look for this log:

```
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Current URL: https://...
[DeepCrawler Content] Network requests captured so far: 0
```

**If you don't see this**:
- Background script didn't send START_CRAWL
- Check background script logs: `chrome://extensions/` → "DeepCrawler Session Bridge" → "Errors"

### Step 3: Check Network Capture

**In DevTools Console**:
1. Look for these logs during interactions:

```
[DeepCrawler Content] Waiting for page load...
[DeepCrawler Content] Page load complete
[DeepCrawler Content] Starting scroll...
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Starting clicks...
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Starting form interactions...
[DeepCrawler Content] Form interactions completed
[DeepCrawler Content] Total network requests captured: 45
```

**If you see 0 requests**:
- Network interception might not be working
- Check if page uses different request methods
- Try manually scrolling/clicking to see if requests are captured

### Step 4: Check Network Requests Captured

**In DevTools Console**:
1. Type this command:

```javascript
console.log('Network requests:', NETWORK_REQUESTS);
```

2. You should see an array of requests like:

```javascript
[
  {
    method: "GET",
    url: "https://api.example.com/users",
    status: 200,
    size: 1024,
    contentType: "application/json",
    timestamp: 1234567890,
    duration: 150,
    type: "fetch"
  },
  ...
]
```

**If array is empty**:
- Network interception not capturing requests
- Page might not make API calls
- Try a different website

### Step 5: Check Backend Data Endpoint

**In DevTools Network tab**:
1. Look for PUT request to `/api/extension/crawl/data`
2. Check request body - should contain `networkRequests` array
3. Check response - should show `endpointCount`

**If PUT request not sent**:
- Check console for error: `[DeepCrawler Content] Error sending network data`
- Verify `BACKEND_URL` is correct: `http://localhost:3002`
- Verify `EXTENSION_API_KEY` matches backend

### Step 6: Check Backend Processing

**In terminal where backend is running**:
1. Look for these logs:

```
[Extension Crawl] Starting crawl crawl-... for https://...
[DeepCrawler] Sending START_CRAWL to tab ...
[Extension Crawl] Received 45 requests, total endpoints: 45
[Extension Crawl] Crawl completed with 32 unique endpoints
```

**If you see "Received 0 requests"**:
- Content script didn't send data
- Check PUT request in DevTools Network tab
- Verify API key is correct

---

## Complete Debug Checklist

- [ ] Content script logs appear in DevTools Console
- [ ] START_CRAWL message is received
- [ ] Page load wait completes
- [ ] Scrolling logs appear
- [ ] Clicking logs appear
- [ ] Form interaction logs appear
- [ ] Network requests are captured (> 0)
- [ ] PUT request is sent to backend
- [ ] Backend receives requests
- [ ] Backend processes endpoints
- [ ] Frontend shows results

---

## Expected Logs

### Content Script (DevTools Console)
```
[DeepCrawler Content] Initializing on page: https://miniapps.ai/
[DeepCrawler Content] Setting up network interception
[DeepCrawler Content] Network interception setup complete
[DeepCrawler Content] Starting crawl: crawl-1234567890-abc123
[DeepCrawler Content] Current URL: https://miniapps.ai/
[DeepCrawler Content] Network requests captured so far: 0
[DeepCrawler Content] Performing user interactions...
[DeepCrawler Content] Waiting for page load...
[DeepCrawler Content] Page load complete
[DeepCrawler Content] Starting scroll...
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Starting clicks...
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Starting form interactions...
[DeepCrawler Content] Form interactions completed
[DeepCrawler Content] Total network requests captured: 45
[DeepCrawler Content] Sending network data to backend...
[DeepCrawler Content] Successfully sent network data to backend: { success: true, endpointCount: 45 }
```

### Backend (Terminal)
```
[Extension Crawl] Starting crawl crawl-... for https://miniapps.ai/
[DeepCrawler] Sending START_CRAWL to tab ...
[DeepCrawler] Waiting for content script to start capturing...
[DeepCrawler] Sending crawl request to backend...
[Extension Crawl] Received 45 requests, total endpoints: 45
[Extension Crawl] Crawl completed with 32 unique endpoints
```

---

## Common Issues

### Issue: Content script not injected
**Solution**: Check manifest.json content_scripts matches target URL

### Issue: No network requests captured
**Solution**: 
- Try a different website
- Check if page uses different request methods
- Manually scroll/click to verify interception works

### Issue: PUT request fails
**Solution**:
- Verify backend is running
- Check API key matches
- Check BACKEND_URL is correct

### Issue: Backend receives 0 requests
**Solution**:
- Check PUT request body in DevTools
- Verify content script is sending data
- Check for errors in content script logs

---

**Status**: Ready to test
**Date**: October 31, 2025

