# Extension Debugging Guide

## Problem
Extension is discovering 0 API endpoints when crawling https://miniapps.ai, but should discover 86 endpoints.

## Root Cause Analysis

### Data Flow
1. **Network Interceptor** (network-interceptor.js) - runs in MAIN world
   - Intercepts fetch() and XMLHttpRequest calls
   - Sends postMessage events to content script
   - Exposes window.__deepcrawlerRequests in MAIN world

2. **Content Script** (content.js) - runs in isolated world
   - Listens for postMessage events from network interceptor
   - Stores requests in NETWORK_REQUESTS array
   - Sends data to background script every 250ms when isCrawling=true

3. **Background Script** (background.js) - service worker
   - Polls for pending crawls every 2 seconds
   - Sends START_CRAWL message to content script
   - Forwards network data to backend

4. **Backend** (/api/extension/crawl/data) - processes network data
   - Receives network requests from extension
   - Filters for API endpoints
   - Stores in session

## Debugging Steps

### Step 1: Verify Network Interceptor is Loaded
1. Open Chrome DevTools on https://miniapps.ai
2. Go to Console tab
3. Type: `window.__deepcrawlerRequests`
4. Expected: Array of network requests (should not be empty)
5. If undefined: Network interceptor not loaded

### Step 2: Verify Content Script is Receiving Messages
1. Open Chrome DevTools on https://miniapps.ai
2. Go to Console tab
3. Look for logs starting with `[DeepCrawler Content]`
4. Expected: Should see "Message #1 received", "Message #2 received", etc.
5. If not present: Content script not receiving postMessage events

### Step 3: Verify START_CRAWL Message is Received
1. Open Chrome DevTools on https://miniapps.ai
2. Go to Console tab
3. Click "Start Discovery" on http://localhost:3002
4. Look for: `[DeepCrawler Content] START_CRAWL received for crawl`
5. If not present: START_CRAWL message not being sent

### Step 4: Verify Data is Being Sent to Backend
1. Open Chrome DevTools on https://miniapps.ai
2. Go to Network tab
3. Filter for: `crawl/data`
4. Click "Start Discovery"
5. Expected: Should see PUT requests to `/api/extension/crawl/data`
6. If not present: Content script not sending data

### Step 5: Check Backend Logs
1. Look at backend terminal output
2. Search for: `[Extension Crawl Data] Received`
3. Expected: Should see incoming network requests
4. If not present: Backend not receiving data

## Potential Issues

### Issue 1: Network Interceptor Not Capturing Requests
- **Symptom**: window.__deepcrawlerRequests is empty or undefined
- **Cause**: Network interceptor not injected or not working
- **Fix**: Verify manifest.json has correct configuration

### Issue 2: Content Script Not Receiving Messages
- **Symptom**: No "[DeepCrawler Content] Message #X received" logs
- **Cause**: postMessage events not being sent or received
- **Fix**: Check if network interceptor is sending postMessage events

### Issue 3: START_CRAWL Not Received
- **Symptom**: No "START_CRAWL received" log in console
- **Cause**: Background script not sending message or content script not listening
- **Fix**: Check background script polling and message sending

### Issue 4: Data Not Sent to Backend
- **Symptom**: No PUT requests to /api/extension/crawl/data
- **Cause**: isCrawling flag not set or sendNetworkDataToBackend not called
- **Fix**: Verify START_CRAWL sets isCrawling=true

### Issue 5: Backend Not Processing Data
- **Symptom**: Backend logs show no incoming requests
- **Cause**: Network data not being sent or backend endpoint not receiving
- **Fix**: Check network tab for PUT requests and backend logs

## Quick Test

1. Load extension in Chrome
2. Navigate to https://miniapps.ai
3. Open DevTools Console
4. Type: `window.__deepcrawlerRequests.length`
5. Should return > 0 (number of captured requests)
6. If 0 or undefined, network interceptor is not working

## Next Steps

1. Run debugging steps above
2. Identify which step is failing
3. Check logs for error messages
4. Fix the identified issue
5. Verify 86 endpoints are discovered

