# Quick Test Guide - 5 Minute Setup

## What Was Fixed

✅ Dual communication methods (postMessage + global variable)
✅ Enhanced logging at every step
✅ Early initialization timing
✅ Fallback mechanism for cross-world communication

## Quick Test (5 Minutes)

### Step 1: Reload Extension (30 seconds)
```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click refresh icon
4. Wait for reload
```

### Step 2: Open Test Page (30 seconds)
```
1. Open https://httpbin.org in new tab
2. Press F12 (DevTools)
3. Go to Console tab
4. Keep open
```

### Step 3: Start Crawl (1 minute)
```
1. Go to http://localhost:3003
2. Enter: https://httpbin.org
3. Click "Start Discovery"
4. Watch console for logs
```

### Step 4: Check Results (1 minute)
```
✅ SUCCESS: Frontend shows "Found X endpoints" (X > 0)
❌ FAILURE: Frontend shows "Found 0 endpoints"
```

## What to Look For

### Page Console (https://httpbin.org)

**Good Signs**:
```
[DeepCrawler] ===== INJECTED SCRIPT STARTING =====
[DeepCrawler] FETCH CALLED: GET https://httpbin.org/get
[DeepCrawler] Captured fetch #1: GET https://httpbin.org/get 200
```

**Bad Signs**:
```
(No [DeepCrawler] messages at all)
```

### Extension Console

**Good Signs**:
```
[DeepCrawler Content] Received postMessage event: DEEPCRAWLER_NETWORK_REQUEST
[DeepCrawler Content] Captured request: GET https://httpbin.org/get 200
[DeepCrawler Content] Total network requests captured: 4
```

**Bad Signs**:
```
[DeepCrawler Content] Total network requests captured: 0
```

## Success Criteria

✅ **SUCCESS**:
- Page console shows `[DeepCrawler] FETCH CALLED`
- Extension console shows `[DeepCrawler Content] Captured request`
- Frontend shows `Found X endpoints` (X > 0)

❌ **FAILURE**:
- Frontend shows `Found 0 endpoints`
- Extension console shows `Total network requests captured: 0`

## If It Works

🎉 **Congratulations!** The fix is working. The extension is now:
- Capturing network requests
- Sending them to the backend
- Displaying endpoints on the frontend

## If It Doesn't Work

📋 **Debugging Steps**:

1. **Check page console** for `[DeepCrawler]` messages
   - If present: Injection is working
   - If absent: Injection failed

2. **Check extension console** for `[DeepCrawler Content]` messages
   - If present: Content script is running
   - If absent: Content script failed

3. **Check for errors** in both consoles
   - Look for red error messages
   - Report any errors you see

4. **Try different URL** (e.g., https://github.com)
   - Some sites might not make fetch requests
   - httpbin.org should definitely work

## Common Issues

### Issue: No logs in page console

**Solution**:
1. Make sure you're looking at the page console (https://httpbin.org)
2. Not the extension console
3. Reload the page
4. Try again

### Issue: Logs show "FETCH CALLED" but not "Captured fetch"

**Solution**:
1. The fetch is being intercepted but response processing failed
2. Check for errors in the page console
3. Try a different URL

### Issue: Logs show "Captured fetch" but not "Captured request"

**Solution**:
1. The injected script is working but postMessage failed
2. The global variable method should still work
3. Check extension console for "Found X requests in global variable"

## Files Modified

- `extension/content.js` - Dual communication methods + enhanced logging

## Status

✅ **Fix Implemented and Ready for Testing**

## Next Steps

1. Reload extension
2. Test with https://httpbin.org
3. Report results

**Expected Outcome**: Frontend shows "Found X endpoints" (X > 0)

