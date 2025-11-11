# Comprehensive Diagnostic Report

## System Architecture

```
User Browser (Chrome)
    ↓
Extension (manifest.json, background.js, content.js)
    ↓
Backend (Next.js API routes)
    ↓
Hyperbrowser SDK (server-side crawling)
```

## Data Flow for Extension Crawl

1. **User initiates crawl** → Frontend sends POST to `/api/extension/crawl`
2. **Backend creates session** → Stores in `activeCrawlSessions` Map with requestId
3. **Backend returns SSE stream** → Waits for extension to send data (60 second timeout)
4. **Extension polls** → Background script polls `/api/extension/crawl/pending` every 2 seconds
5. **Extension receives pending crawl** → Gets requestId, url, tabId from backend
6. **Background sends START_CRAWL** → Sends message to content script in target tab
7. **Content script captures network** → Intercepts fetch/XHR, stores in NETWORK_REQUESTS array
8. **Content script performs interactions** → Scrolls, clicks, fills forms to trigger APIs
9. **Content script sends data** → PUT to `/api/extension/crawl/data` with network requests
10. **Backend processes data** → Filters for API endpoints, adds to session.endpoints
11. **Backend returns results** → SSE stream completes, frontend displays endpoints

## Critical Issues to Check

### Issue 1: Extension Not Receiving START_CRAWL
**Check**: Is background.js correctly sending START_CRAWL to content script?
- Background polls `/api/extension/crawl/pending` ✓
- Background gets pending crawls ✓
- Background sends START_CRAWL message to tab ✓ (code exists)
- **PROBLEM**: No confirmation content script receives it

### Issue 2: Content Script Not Capturing Network
**Check**: Is content.js actually intercepting network requests?
- Network interception code exists ✓
- Message listener exists ✓
- **PROBLEM**: No confirmation NETWORK_REQUESTS array is populated

### Issue 3: Data Not Sent to Backend
**Check**: Is content.js calling sendNetworkDataToBackend()?
- Function exists ✓
- Called after performUserInteractions() ✓
- **PROBLEM**: No confirmation it's being called or succeeding

### Issue 4: Session Mismatch
**Check**: Does requestId match across all components?
- Backend creates requestId ✓
- Backend returns in pending crawls ✓
- Extension receives requestId ✓
- Content script uses requestId ✓
- **PROBLEM**: Possible race condition or timing issue

## Test Plan

1. **Backend Connectivity** - Can extension reach backend?
2. **Extension Status** - Is extension registered?
3. **Pending Crawls** - Does backend return pending crawls?
4. **Data Submission** - Can extension submit data?
5. **Session Tracking** - Are sessions properly tracked?
6. **Network Capture** - Is network actually captured?
7. **End-to-End** - Full workflow test

## Expected Behavior

When user clicks "Start Discovery":
1. Frontend shows "Discovering..." 
2. Backend creates crawl session
3. Extension receives START_CRAWL within 2 seconds
4. Content script starts capturing network
5. Content script performs interactions (10-15 seconds)
6. Content script sends data to backend
7. Backend processes and returns endpoints
8. Frontend shows "Found X endpoints"

## Actual Behavior

- Frontend shows "Discovering..."
- Backend creates crawl session
- **STOPS HERE** - Extension never sends data
- After 60 seconds, backend times out
- Frontend shows "Found 0 endpoints"

## Root Cause Hypothesis

The extension is not receiving the START_CRAWL message, OR it's receiving it but not executing the network capture, OR it's capturing but not sending the data.

Most likely: **Content script is not being injected into the target page**, so it never receives START_CRAWL.

## Fix Strategy

1. Add comprehensive logging to track message flow
2. Verify content script is injected
3. Verify START_CRAWL is sent
4. Verify network capture is working
5. Verify data is sent to backend
6. Fix any broken links in the chain

