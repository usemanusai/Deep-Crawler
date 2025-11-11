# Complete Testing Guide - Network Interception Fix

## What Was Fixed

The network interception script is now injected **directly from the content script** at `document_start`, ensuring it runs **before the page makes any requests**.

**Previous Approach** (Failed):
- Content script waits for DOMContentLoaded
- Sends message to background script
- Background script asynchronously injects script
- Page makes requests BEFORE injection completes
- Result: 0 requests captured

**New Approach** (Should Work):
- Content script loads at document_start
- Immediately injects network interception script
- Script runs before page makes any requests
- All requests are captured
- Result: X requests captured (X > 0)

## Step-by-Step Testing

### Step 1: Reload the Extension

```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon (circular arrow)
4. Wait for it to reload
```

### Step 2: Open DevTools on Target Page

```
1. Open https://httpbin.org in a new tab
2. Press F12 to open DevTools
3. Go to Console tab
4. Keep this tab open while testing
```

### Step 3: Start the Crawl

```
1. Go to http://localhost:3003 (the frontend)
2. Enter URL: https://httpbin.org
3. Click "Start Discovery"
4. Watch the console for logs
```

### Step 4: Monitor Console Logs

**In the httpbin.org tab console, you should see:**

```
[DeepCrawler] Network interception script injected into page context
[DeepCrawler] Captured fetch: GET https://httpbin.org/get 200
[DeepCrawler] Captured fetch: POST https://httpbin.org/post 200
[DeepCrawler] Captured fetch: PUT https://httpbin.org/put 200
[DeepCrawler] Captured fetch: DELETE https://httpbin.org/delete 200
[DeepCrawler] Captured XHR: GET https://httpbin.org/status/200 200
...
[DeepCrawler] Network interception setup complete in page context
```

**In the extension background script console, you should see:**

```
[DeepCrawler] Message received: SETUP_NETWORK_INTERCEPTION from tab: 123
[DeepCrawler] Setting up network interception for tab: 123
[DeepCrawler] Network interception script injected successfully
[DeepCrawler] Received network data from content script: crawl-... with 15 requests
[DeepCrawler] Successfully forwarded network data to backend
```

**In the frontend (http://localhost:3003), you should see:**

```
Found 15 endpoints

GET https://httpbin.org/get
POST https://httpbin.org/post
PUT https://httpbin.org/put
DELETE https://httpbin.org/delete
...
```

## Debugging Checklist

### ✓ Check 1: Is the injected script running?

**Look for**: `[DeepCrawler] Network interception script injected into page context`

**If NOT present**:
- The script injection failed
- Check browser console for errors
- Try reloading the extension

### ✓ Check 2: Are fetch requests being captured?

**Look for**: `[DeepCrawler] Captured fetch: ...`

**If NOT present**:
- The page might not be making fetch requests
- Or the monkey-patching is not working
- Try a different URL that makes more requests

### ✓ Check 3: Are XHR requests being captured?

**Look for**: `[DeepCrawler] Captured XHR: ...`

**If NOT present**:
- The page might not be making XHR requests
- This is OK - not all pages use XHR

### ✓ Check 4: Is the content script receiving messages?

**Look for**: `[DeepCrawler Content] Captured request: ...`

**If NOT present**:
- The postMessage is not reaching the content script
- Check if there are any errors in the console

### ✓ Check 5: Is the background script receiving data?

**Look for**: `[DeepCrawler] Received network data from content script: ...`

**If NOT present**:
- The content script is not sending data to the background
- Check if there are any errors in the console

### ✓ Check 6: Is the backend receiving data?

**Look for**: `[Extension Crawl] Received X network requests`

**If NOT present**:
- The background script is not forwarding data to the backend
- Check if the backend is running on http://localhost:3002

## Expected Console Output

### Page Context (httpbin.org tab)
```
[DeepCrawler] Network interception script injected into page context
[DeepCrawler] Captured fetch: GET https://httpbin.org/get 200
[DeepCrawler] Captured fetch: POST https://httpbin.org/post 200
[DeepCrawler] Captured fetch: PUT https://httpbin.org/put 200
[DeepCrawler] Captured fetch: DELETE https://httpbin.org/delete 200
[DeepCrawler] Network interception setup complete in page context
```

### Content Script (Extension DevTools)
```
[DeepCrawler Content] Initializing on page: https://httpbin.org
[DeepCrawler Content] Setting up network interception
[DeepCrawler Content] Network interception setup complete
[DeepCrawler Content] Message received: START_CRAWL
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Captured request: GET https://httpbin.org/get 200
[DeepCrawler Content] Captured request: POST https://httpbin.org/post 200
[DeepCrawler Content] Total network requests captured: 4
[DeepCrawler Content] Sending 4 requests via background script...
[DeepCrawler Content] Successfully sent network data to backend
```

### Background Script (Extension DevTools)
```
[DeepCrawler] Message received: SETUP_NETWORK_INTERCEPTION from tab: 123
[DeepCrawler] Setting up network interception for tab: 123
[DeepCrawler] Network interception script injected successfully
[DeepCrawler] Received network data from content script: crawl-... with 4 requests
[DeepCrawler] Successfully forwarded network data to backend
```

### Frontend (http://localhost:3003)
```
Found 4 endpoints

GET https://httpbin.org/get
POST https://httpbin.org/post
PUT https://httpbin.org/put
DELETE https://httpbin.org/delete
```

## Troubleshooting

### Problem: Still seeing 0 endpoints

**Solution**:
1. Reload the extension (chrome://extensions/)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Close and reopen the target page
4. Try again

### Problem: Seeing errors in console

**Solution**:
1. Check the error message
2. If it's a CSP error, the fix didn't work
3. If it's a different error, report it

### Problem: Seeing "Captured fetch" but not "Captured request"

**Solution**:
1. The injected script is working
2. But the postMessage is not reaching the content script
3. Check if there are any errors in the console
4. Try reloading the extension

### Problem: Seeing "Captured request" but not "Received network data"

**Solution**:
1. The content script is receiving messages
2. But it's not sending data to the background script
3. Check if there are any errors in the console
4. Try reloading the extension

## Success Criteria

✅ **Success**: You see:
- `[DeepCrawler] Captured fetch: ...` in page console
- `[DeepCrawler Content] Captured request: ...` in extension console
- `[DeepCrawler] Received network data from content script: ...` in background console
- `Found X endpoints` on frontend (X > 0)

❌ **Failure**: You see:
- `[DeepCrawler Content] Total network requests captured: 0`
- `Found 0 endpoints` on frontend

## Next Steps

If testing is successful:
1. Try with other URLs (GitHub, Twitter, etc.)
2. Monitor the console for any issues
3. Report any errors or unexpected behavior

If testing fails:
1. Follow the debugging checklist above
2. Check each step of the data flow
3. Report the specific step where it's failing

