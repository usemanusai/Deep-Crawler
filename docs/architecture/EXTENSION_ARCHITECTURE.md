# DeepCrawler Extension Architecture

## Complete Data Flow

### 1. Extension Initialization (background.js)

```
Extension Loaded
  ↓
loadSettingsAndInit()
  ↓
startHeartbeat() - Sends /ping every 30 seconds
  ↓
startPolling() - Polls /api/extension/crawl/pending every 5 seconds
```

### 2. Heartbeat Flow

```
background.js
  ↓
POST /api/extension/ping
  ↓
backend: markExtensionHeartbeat()
  ↓
extensionState.lastHeartbeatMs = Date.now()
  ↓
GET /api/extension/status returns { connected: true }
```

### 3. Crawl Initiation Flow

```
User clicks "Start Discovery" on http://localhost:3002
  ↓
POST /api/crawl with { url: "http://localhost:3002/api/test" }
  ↓
backend: Creates crawl session in activeCrawlSessions
  ↓
backend: Stores session with { endpoints: [], seedHost, sameOriginOnly, url, tabId }
  ↓
backend: Waits for extension to send network data (60 second timeout)
```

### 4. Extension Polling Flow

```
background.js polls every 5 seconds
  ↓
GET /api/extension/crawl/pending
  ↓
backend: Returns all sessions in activeCrawlSessions
  ↓
background.js: Processes each pending crawl
  ↓
background.js: Sends START_CRAWL to content script
```

### 5. Network Capture Flow

```
network-interceptor.js (MAIN world)
  ↓
Intercepts window.fetch and XMLHttpRequest
  ↓
Stores requests in window.__deepcrawlerRequests
  ↓
Sends DEEPCRAWLER_NETWORK_REQUEST via window.postMessage()
  ↓
content.js (isolated world)
  ↓
Receives message and stores in NETWORK_REQUESTS array
```

### 6. Data Submission Flow

```
content.js: START_CRAWL received
  ↓
content.js: Retrieves window.__deepcrawlerRequests
  ↓
content.js: Adds to NETWORK_REQUESTS array
  ↓
content.js: Starts 500ms interval to send data
  ↓
content.js: PUT /api/extension/crawl with { requestId, networkRequests, action: 'add_requests' }
  ↓
backend: Processes requests and adds to session.endpoints
  ↓
backend: Dedupes and detects API endpoints
  ↓
backend: Waits for no new data for 3 seconds
  ↓
backend: Completes crawl and returns results
```

## Key Components

### background.js
- **Heartbeat**: Sends POST /ping every 30 seconds
- **Polling**: Polls GET /pending every 5 seconds
- **Message Routing**: Routes START_CRAWL to content scripts
- **Tab Management**: Creates tabs if needed, waits for load

### content.js
- **Message Handler**: Receives START_CRAWL from background
- **Network Capture**: Retrieves window.__deepcrawlerRequests
- **Data Submission**: Sends PUT requests with network data every 500ms
- **Crawl State**: Tracks currentCrawlRequestId, isCrawling, NETWORK_REQUESTS

### network-interceptor.js
- **Fetch Interception**: Wraps window.fetch
- **XHR Interception**: Wraps XMLHttpRequest
- **Request Storage**: Stores in window.__deepcrawlerRequests
- **Message Sending**: Sends DEEPCRAWLER_NETWORK_REQUEST via postMessage

### Backend (app/api/extension/crawl/route.ts)
- **POST**: Creates crawl session, waits for data
- **GET /pending**: Returns pending crawl sessions
- **PUT**: Receives network data, processes endpoints
- **API Detection**: Filters static assets, detects API endpoints

## Timing

- **Heartbeat Interval**: 30 seconds
- **Poll Interval**: 5 seconds
- **Data Submission Interval**: 500ms
- **Crawl Timeout**: 60 seconds
- **No-Change Timeout**: 3 seconds (6 * 500ms)
- **Tab Load Timeout**: 10 seconds

## Critical Paths

### Path 1: Extension Connected
```
Extension sends heartbeat → Backend marks as connected
→ GET /status returns { connected: true }
```

### Path 2: Crawl Initiated
```
User starts crawl → Backend creates session
→ Extension polls and finds pending crawl
→ Extension sends START_CRAWL to content script
→ Content script captures network requests
→ Content script sends PUT with requests
→ Backend processes and completes crawl
```

### Path 3: Network Capture
```
Page loads → network-interceptor.js captures requests
→ Stores in window.__deepcrawlerRequests
→ Sends postMessage to content.js
→ content.js stores in NETWORK_REQUESTS
→ START_CRAWL triggers retrieval of page load requests
```

## Debugging Points

1. **Service Worker Console**: Check heartbeat logs
2. **Page Console**: Check network capture logs
3. **Backend Logs**: Check /ping, /pending, PUT requests
4. **Network Tab**: Check actual network requests
5. **window.__deepcrawlerRequests**: Check captured requests
6. **chrome.runtime.sendMessage**: Check message passing

## Common Issues

### Issue: Extension Not Connected
- **Cause**: Heartbeat not being sent
- **Fix**: Check Service Worker console for errors
- **Debug**: Look for "[DeepCrawler] Sending initial heartbeat" logs

### Issue: No Network Requests Captured
- **Cause**: network-interceptor.js not injected or not working
- **Fix**: Check page console for "[DeepCrawler] Network interceptor script loaded"
- **Debug**: Type `window.__deepcrawlerRequests` in console

### Issue: Crawl Returns 0 Endpoints
- **Cause**: Network data not being sent to backend
- **Fix**: Check content.js logs for PUT requests
- **Debug**: Check backend logs for PUT /api/extension/crawl requests

### Issue: START_CRAWL Not Received
- **Cause**: Content script not loaded or message not sent
- **Fix**: Check content.js logs for message handler
- **Debug**: Check Service Worker logs for "Sending START_CRAWL"

---

**Status**: Architecture documented
**Next Action**: Manual testing with actual Chrome extension

