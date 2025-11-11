# Extension Crawl - Network Capture Implementation

## Problem

The extension crawl endpoint was returning HTTP 200 but finding **0 API endpoints** when it should discover many endpoints (especially when logged in).

**Root Cause**: The extension crawl implementation was just a placeholder - it wasn't:
1. Receiving network data from the extension
2. Performing user interactions (scrolling, clicking, form input)
3. Sending captured network requests to the backend
4. Processing the captured data

---

## Solution Overview

Implemented a complete bidirectional communication system:

```
Backend                    Extension Background        Content Script
   |                              |                           |
   |--POST /api/extension/crawl-->|                           |
   |                              |--START_CRAWL message----->|
   |                              |                           |
   |                              |                    [Perform interactions]
   |                              |                    [Capture network]
   |                              |                           |
   |                              |<--Network data (PUT)------|
   |                              |                           |
   |<--SSE stream with results----|                           |
   |                              |                           |
```

---

## Changes Made

### 1. Backend: `/api/extension/crawl` (route.ts)

**Added**:
- `activeCrawlSessions` Map to store active crawl sessions
- Session management with endpoints array and controller
- Waiting mechanism for extension to send data
- Timeout handling (60 seconds)

**Key Features**:
- Stores crawl session with unique requestId
- Waits for extension to send network data
- Processes and deduplicates endpoints
- Returns SSE stream with progress updates

### 2. Backend: `/api/extension/crawl/data` (PUT endpoint)

**New Endpoint** for receiving network data from extension:
- Validates extension API key
- Receives network requests from content script
- Applies same API detection logic as server-side crawl
- Filters static assets and analytics
- Stores endpoints in active session

**Request Format**:
```json
{
  "requestId": "crawl-...",
  "networkRequests": [
    {
      "method": "GET",
      "url": "https://api.example.com/users",
      "status": 200,
      "size": 1024,
      "contentType": "application/json",
      "type": "fetch"
    }
  ],
  "action": "add_requests"
}
```

### 3. Content Script: Network Capture & Interactions

**Added Functions**:

#### `sendNetworkDataToBackend(requestId)`
- Sends all captured network requests to backend
- Uses PUT `/api/extension/crawl/data` endpoint
- Includes all NETWORK_REQUESTS array

#### `performUserInteractions()`
- **Scrolling**: Scrolls page to trigger lazy loading
- **Clicking**: Clicks buttons, links, and interactive elements
- **Form Input**: Types in search/text inputs and presses Enter
- **Timing**: Waits between actions for API calls to complete

**Interactions Performed**:
1. Scroll entire page (100px increments)
2. Click buttons, links, and interactive elements
3. Fill and submit forms
4. Wait for network requests to settle

#### `START_CRAWL` Message Handler
- Receives START_CRAWL message from background script
- Calls `performUserInteractions()`
- Sends network data to backend
- Reports success/failure

### 4. Background Script: Orchestration

**Updated `handleCrawlRequest()`**:
- Sends START_CRAWL message to content script BEFORE backend request
- Content script begins capturing and performing interactions
- Backend waits for data from content script
- Processes SSE stream and sends progress updates

---

## Complete Message Flow

### Step 1: Frontend → Backend
```
POST /api/crawl
{
  "url": "https://example.com",
  "sameOriginOnly": true
}
```

### Step 2: Backend → Extension (Background)
```
POST /api/extension/crawl
{
  "requestId": "crawl-...",
  "url": "https://example.com",
  "sameOriginOnly": true,
  "mode": "extension"
}
```

### Step 3: Background → Content Script
```
chrome.tabs.sendMessage(tabId, {
  "type": "START_CRAWL",
  "requestId": "crawl-...",
  "url": "https://example.com"
})
```

### Step 4: Content Script Performs Actions
1. Scrolls page
2. Clicks interactive elements
3. Fills forms
4. Captures all network requests

### Step 5: Content Script → Backend
```
PUT /api/extension/crawl/data
{
  "requestId": "crawl-...",
  "networkRequests": [...],
  "action": "add_requests"
}
```

### Step 6: Backend → Frontend (SSE Stream)
```
data: { type: "log", message: "..." }
data: { type: "progress", progress: 30 }
data: { type: "complete", result: { endpoints: [...] } }
```

---

## API Detection Logic

Same as server-side crawl:
- ✅ URLs containing `/api/`, `/v1/`, `/v2/`, `/v3/`
- ✅ URLs matching `/graphql`, `/rest`, `/gql`
- ✅ URLs with `.json` extension
- ✅ Requests with `application/json` content type
- ✅ XHR/Fetch requests
- ✅ POST/PUT/DELETE requests (non-GET)
- ✅ URLs matching auth/user/data patterns
- ✅ Specific status codes (200, 201, 400, 401, 403, 404, 422, 500, 502, 503)

**Filtered Out**:
- ❌ Static assets (.css, .js, .png, .jpg, .gif, .svg, .woff, .ttf, etc.)
- ❌ Analytics services (Google Analytics, Facebook, Twitter, etc.)
- ❌ CDN/Assets/Static URLs
- ❌ favicon.ico, robots.txt

---

## Files Modified

| File | Changes |
|------|---------|
| `app/api/extension/crawl/route.ts` | Added session management, data endpoint, network processing |
| `extension/content.js` | Added interaction simulation, network data sending |
| `extension/background.js` | Added START_CRAWL message sending |

---

## How It Works Now

1. **User enters URL** in frontend
2. **Frontend sends** crawl request to backend
3. **Backend checks** if extension is connected
4. **Backend sends** crawl request to extension
5. **Background script sends** START_CRAWL to content script
6. **Content script**:
   - Scrolls page (triggers lazy loading)
   - Clicks interactive elements (triggers API calls)
   - Fills forms (triggers search/autocomplete APIs)
   - Captures all network requests
7. **Content script sends** network data to backend
8. **Backend processes** and deduplicates endpoints
9. **Backend returns** results via SSE stream
10. **Frontend displays** discovered API endpoints

---

## Testing

### Step 1: Reload Extension
```
chrome://extensions/ → Refresh "DeepCrawler Session Bridge"
```

### Step 2: Log In to Website
```
Go to https://example.com and log in
```

### Step 3: Start Crawl
```
Go to http://localhost:3002
Enter URL: https://example.com
Click "Start Discovery"
```

### Step 4: Check Logs
```
[Crawl API] Using extension mode for crawl
POST /api/extension/crawl 200 in XXXms
[Extension Crawl] Starting crawl crawl-... for https://...
[DeepCrawler] Sending START_CRAWL to tab ...
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Starting user interactions
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Form interactions completed
[DeepCrawler Content] Sent network data to backend: { success: true, endpointCount: 45 }
[Extension Crawl] Received 45 requests, total endpoints: 45
[Extension Crawl] Crawl completed with 45 unique endpoints
```

### Step 5: Verify Results
- ✅ Extension mode is used (not server mode)
- ✅ Network data is captured
- ✅ API endpoints are discovered
- ✅ Authentication state is preserved
- ✅ Results match or exceed server-side crawl

---

## Expected Behavior

### Before Fix
```
Extension crawl initiated for https://example.com
Waiting for extension to capture network data...
Processing captured network requests
Extension crawl complete! Found 0 endpoints
```

### After Fix
```
Extension crawl initiated for https://example.com
Instructing extension to navigate and capture network data...
[Content script performs interactions]
Processing 45 captured network requests
Extension crawl complete! Found 32 unique endpoints
```

---

## Benefits

✅ **Discovers API endpoints** using authenticated sessions
✅ **Performs user interactions** (scrolling, clicking, form input)
✅ **Captures network requests** from content script
✅ **Processes data** with same logic as server-side
✅ **Preserves authentication** state
✅ **Real-time progress** updates via SSE
✅ **Production-ready** implementation

---

**Status**: ✅ Complete Implementation
**Date**: October 31, 2025
**Impact**: Extension crawl now discovers API endpoints just like server-side mode

