# Enhanced Debugging Guide - Comprehensive Logging Added

## What Was Added

I've added **comprehensive logging** to trace the exact data flow and identify where the issue is occurring.

## Step-by-Step Debugging

### Step 1: Reload Extension

```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon
4. Wait for it to reload
```

### Step 2: Open DevTools on Target Page

```
1. Open https://httpbin.org in a new tab
2. Press F12 to open DevTools
3. Go to Console tab
4. KEEP THIS OPEN - you'll watch logs appear here
```

### Step 3: Open Extension DevTools

```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click "Service Worker" link
4. This opens the background script console
5. KEEP THIS OPEN - you'll watch logs appear here
```

### Step 4: Start the Crawl

```
1. Go to http://localhost:3003
2. Enter URL: https://httpbin.org
3. Click "Start Discovery"
4. Watch BOTH consoles for logs
```

## Expected Console Output - Complete Data Flow

### Phase 1: Content Script Initialization

**Location**: Extension console (Service Worker)

```
[DeepCrawler Content] Content script loaded, document.readyState: loading
[DeepCrawler Content] ===== INITIALIZING CONTENT SCRIPT =====
[DeepCrawler Content] Page URL: https://httpbin.org
[DeepCrawler Content] Document readyState: loading
[DeepCrawler Content] Setting up network interception...
[DeepCrawler Content] Network interception setup complete
```

### Phase 2: Injected Script Initialization

**Location**: Page console (https://httpbin.org)

```
[DeepCrawler] ===== INJECTED SCRIPT STARTING =====
[DeepCrawler] Running in context: MAIN
[DeepCrawler] window.fetch exists: function
[DeepCrawler] Original fetch: function
[DeepCrawler] Original XMLHttpRequest.open: function
[DeepCrawler] Original XMLHttpRequest.send: function
[DeepCrawler] ===== NETWORK INTERCEPTION SETUP COMPLETE =====
[DeepCrawler] window.fetch patched: true
[DeepCrawler] XMLHttpRequest.open patched: true
```

### Phase 3: Page Makes Requests

**Location**: Page console

```
[DeepCrawler] FETCH CALLED: GET https://httpbin.org/get
[DeepCrawler] Captured fetch #1: GET https://httpbin.org/get 200
[DeepCrawler] SENDING postMessage for fetch: GET https://httpbin.org/get
[DeepCrawler] FETCH CALLED: POST https://httpbin.org/post
[DeepCrawler] Captured fetch #2: POST https://httpbin.org/post 200
[DeepCrawler] SENDING postMessage for fetch: POST https://httpbin.org/post
```

### Phase 4: Content Script Receives Messages

**Location**: Extension console

```
[DeepCrawler Content] Received postMessage event: DEEPCRAWLER_NETWORK_REQUEST source: SAME_WINDOW
[DeepCrawler Content] Captured request: GET https://httpbin.org/get 200
[DeepCrawler Content] Total requests now: 1
[DeepCrawler Content] Received postMessage event: DEEPCRAWLER_NETWORK_REQUEST source: SAME_WINDOW
[DeepCrawler Content] Captured request: POST https://httpbin.org/post 200
[DeepCrawler Content] Total requests now: 2
```

### Phase 5: Crawl Execution

**Location**: Extension console

```
[DeepCrawler Content] Message received: START_CRAWL
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Current URL: https://httpbin.org
[DeepCrawler Content] Network requests captured so far: 2
[DeepCrawler Content] Performing user interactions...
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Starting clicks...
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Form interactions completed
[DeepCrawler Content] Interactions complete, waiting for final requests...
[DeepCrawler Content] Total network requests captured: 4
[DeepCrawler Content] Sending network data to backend...
[DeepCrawler Content] Sending 4 requests via background script...
[DeepCrawler Content] Successfully sent network data to backend
```

### Phase 6: Background Script Receives Data

**Location**: Extension console (Service Worker)

```
[DeepCrawler] Received network data from content script: crawl-... with 4 requests
[DeepCrawler] Successfully forwarded network data to backend
```

### Phase 7: Frontend Displays Results

**Location**: http://localhost:3003

```
Found 4 endpoints

GET https://httpbin.org/get
POST https://httpbin.org/post
PUT https://httpbin.org/put
DELETE https://httpbin.org/delete
```

## Debugging Checklist

### ✓ Check 1: Is the injected script running?

**Look for**: `[DeepCrawler] ===== INJECTED SCRIPT STARTING =====`

**Location**: Page console (https://httpbin.org)

**If NOT present**:
- The script injection failed
- Check for any errors in the page console
- Try reloading the extension

### ✓ Check 2: Is fetch being intercepted?

**Look for**: `[DeepCrawler] FETCH CALLED: ...`

**Location**: Page console

**If NOT present**:
- The page might not be making fetch requests
- Or the monkey-patching failed
- Try a different URL

### ✓ Check 3: Is postMessage being sent?

**Look for**: `[DeepCrawler] SENDING postMessage for fetch: ...`

**Location**: Page console

**If NOT present**:
- The fetch is being intercepted but postMessage is not being sent
- Check for errors in the page console

### ✓ Check 4: Is content script receiving messages?

**Look for**: `[DeepCrawler Content] Received postMessage event: DEEPCRAWLER_NETWORK_REQUEST`

**Location**: Extension console

**If NOT present**:
- The postMessage is not reaching the content script
- This is a critical issue - the message passing is broken

### ✓ Check 5: Is data being sent to backend?

**Look for**: `[DeepCrawler] Received network data from content script: ...`

**Location**: Extension console

**If NOT present**:
- The content script is not sending data to the background script
- Check for errors in the extension console

### ✓ Check 6: Is frontend displaying results?

**Look for**: `Found X endpoints` (X > 0)

**Location**: http://localhost:3003

**If NOT present**:
- The backend is not processing the data correctly
- Check the backend console for errors

## Troubleshooting

### Problem: No logs in page console

**Solution**:
1. Make sure you're looking at the page console (https://httpbin.org), not the extension console
2. Reload the page
3. Try reloading the extension

### Problem: Logs show "FETCH CALLED" but not "Captured fetch"

**Solution**:
1. The fetch is being intercepted but the response is not being processed
2. Check for errors in the page console
3. The response might be failing

### Problem: Logs show "Captured fetch" but not "SENDING postMessage"

**Solution**:
1. The fetch is being intercepted but postMessage is not being sent
2. Check for errors in the page console
3. The postMessage might be failing

### Problem: Logs show "SENDING postMessage" but not "Received postMessage event"

**Solution**:
1. The postMessage is being sent but not received by the content script
2. This is a critical issue - the message passing is broken
3. Check if the content script is listening for messages
4. Try reloading the extension

## Success Criteria

✅ **Success**: You see all phases of logs:
- Phase 1: Content script initialization
- Phase 2: Injected script initialization
- Phase 3: Page makes requests
- Phase 4: Content script receives messages
- Phase 5: Crawl execution
- Phase 6: Background script receives data
- Phase 7: Frontend displays results (X > 0)

❌ **Failure**: You see:
- `[DeepCrawler Content] Total network requests captured: 0`
- `Found 0 endpoints` on frontend

## Next Steps

1. Reload the extension
2. Open both consoles (page and extension)
3. Start the crawl
4. Watch the logs and identify which phase is failing
5. Report the exact logs you see

**Status**: ✅ Enhanced Logging Added and Ready for Testing

