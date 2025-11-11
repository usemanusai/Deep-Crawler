# Local Test Guide - Test Without Internet

## The Problem

httpbin.org is not loading in the browser, so there are no network requests to capture. This could be due to:
- Network connectivity issues
- httpbin.org being down or blocked
- Browser sandbox restrictions

## The Solution

I've created a **local test page** that you can use to test the extension without needing internet access.

## Quick Start

### Step 1: Access the Test Page

Open this URL in your browser:
```
http://localhost:3003/test-api.html
```

### Step 2: Open DevTools

Press `F12` to open DevTools and go to the Console tab.

### Step 3: Make API Requests

Click the buttons on the page to make API requests:
- **Test GET Request** - Makes a GET request to `/api/users`
- **Test POST Request** - Makes a POST request to `/api/users`
- **Test PUT Request** - Makes a PUT request to `/api/users/1`
- **Test DELETE Request** - Makes a DELETE request to `/api/users/1`
- **Test Multiple Requests** - Makes several requests in sequence
- **Test XHR Request** - Makes an XMLHttpRequest

### Step 4: Start the Crawl

1. Go to http://localhost:3003
2. Enter URL: `http://localhost:3003/test-api.html`
3. Click "Start Discovery"

### Step 5: Check Results

**Expected Result**:
- Frontend shows "Found X endpoints" (X > 0)
- Console shows captured requests

**If Still 0 Endpoints**:
1. Check the page console for `[DeepCrawler]` messages
2. Check the extension console for `[DeepCrawler Content]` messages
3. Look for errors in both consoles

## What the Test Page Does

The test page makes various API requests that the extension should capture:

```
GET /api/users
POST /api/users
PUT /api/users/1
DELETE /api/users/1
GET /api/posts
GET /api/comments
```

These are **local requests** to the same server (localhost:3003), so they should definitely work.

## Expected Console Output

### Page Console (http://localhost:3003/test-api.html)

```
[DeepCrawler] ===== INJECTED SCRIPT STARTING =====
[DeepCrawler] FETCH CALLED: GET http://localhost:3003/api/users
[DeepCrawler] Captured fetch #1: GET http://localhost:3003/api/users 404
[DeepCrawler] FETCH CALLED: POST http://localhost:3003/api/users
[DeepCrawler] Captured fetch #2: POST http://localhost:3003/api/users 404
```

### Extension Console

```
[DeepCrawler Content] Received postMessage event: DEEPCRAWLER_NETWORK_REQUEST
[DeepCrawler Content] Captured request: GET http://localhost:3003/api/users 404
[DeepCrawler Content] Total network requests captured: 6
```

### Frontend (http://localhost:3003)

```
Found 6 endpoints

GET http://localhost:3003/api/users
POST http://localhost:3003/api/users
PUT http://localhost:3003/api/users/1
DELETE http://localhost:3003/api/users/1
GET http://localhost:3003/api/posts
GET http://localhost:3003/api/comments
```

## Why This Works

1. **No Internet Required** - All requests are local to localhost:3003
2. **No Network Issues** - No external dependencies
3. **Guaranteed Requests** - The page makes requests when you click buttons
4. **Easy Debugging** - You can see exactly what requests are being made

## Debugging Steps

### If No Logs in Page Console

1. Make sure you're looking at the page console (http://localhost:3003/test-api.html)
2. Not the extension console
3. Reload the page
4. Click a button to make a request
5. Check console again

### If Logs Show "FETCH CALLED" but Not "Captured fetch"

1. The fetch is being intercepted but response processing failed
2. Check for errors in the page console
3. The 404 status is expected (the endpoints don't exist)

### If Logs Show "Captured fetch" but Not "Captured request"

1. The injected script is working but postMessage failed
2. Check extension console for "Found X requests in global variable"
3. The global variable method should still work

## Success Criteria

✅ **SUCCESS**:
- Page console shows `[DeepCrawler] FETCH CALLED`
- Extension console shows `[DeepCrawler Content] Captured request`
- Frontend shows `Found X endpoints` (X > 0)

❌ **FAILURE**:
- Frontend shows `Found 0 endpoints`
- No `[DeepCrawler]` messages in page console

## Next Steps

1. Open http://localhost:3003/test-api.html
2. Open DevTools (F12)
3. Click "Test Multiple Requests" button
4. Go to http://localhost:3003
5. Enter URL: http://localhost:3003/test-api.html
6. Click "Start Discovery"
7. Check results

**Expected Outcome**: Frontend shows "Found 6 endpoints"

## Files Created

- `public/test-api.html` - Local test page with API request buttons

## Status

✅ **Local Test Page Created**
✅ **Ready for Testing Without Internet**

