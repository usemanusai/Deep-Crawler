# Test Plan and Verification

## What Was Fixed

**File**: `extension/background.js`

**Changes**:
1. Added `waitForTabLoad()` function to wait for tab to load
2. Added `sendStartCrawlToTab()` function to send START_CRAWL message
3. Modified polling logic to create new tab if URL not found

**Before**: Extension would skip crawl if tab not found
**After**: Extension creates new tab, waits for load, then sends START_CRAWL

## Test Procedure

### Phase 1: Setup (5 minutes)

```bash
# Terminal 1: Start backend
cd hyperbrowser-app-examples/deep-crawler-bot
rm -rf .next
npm run dev
# Wait for "Ready on http://localhost:3002"
```

### Phase 2: Load Extension (3 minutes)

```
1. Open Chrome
2. Go to chrome://extensions/
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select: hyperbrowser-app-examples/deep-crawler-bot/extension
6. Verify extension loads (should see "DeepCrawler Session Bridge")
```

### Phase 3: Test Crawl (10 minutes)

```
1. Open http://localhost:3002 in Chrome
2. Open DevTools (F12) → Console
3. Enter URL: https://httpbin.org
4. Click "Start Discovery"
5. Watch console for logs:
   - "[DeepCrawler] Found pending crawl: crawl-..."
   - "[DeepCrawler] Tab not found, creating new tab for: https://httpbin.org"
   - "[DeepCrawler] Created new tab: X"
   - "[DeepCrawler] Tab loaded: X"
   - "[DeepCrawler] Sending START_CRAWL to tab X"
   - "[DeepCrawler Content] Starting crawl: crawl-..."
   - "[DeepCrawler Content] Performing user interactions..."
   - "[DeepCrawler Content] Sending network data to backend..."
6. Frontend should show "Found X endpoints" (X > 0)
```

### Phase 4: Verify Results (5 minutes)

```
Expected:
- Frontend shows "Found X endpoints" where X > 0
- Backend logs show crawl completed with endpoints
- Extension console shows no errors
- New tab was created and closed automatically

If successful:
✅ Extension crawl is working
✅ Network capture is working
✅ Data submission is working
✅ Backend processing is working
```

## Success Criteria

1. ✅ Extension creates new tab for target URL
2. ✅ Extension waits for tab to load
3. ✅ Extension sends START_CRAWL message
4. ✅ Content script receives START_CRAWL
5. ✅ Content script captures network requests
6. ✅ Content script sends data to backend
7. ✅ Backend processes data
8. ✅ Frontend displays endpoints (> 0)

## Troubleshooting

### Issue: "Found 0 endpoints"
- Check extension console for errors
- Verify tab was created
- Verify START_CRAWL was sent
- Check if content script is running

### Issue: "Tab not found" error
- Verify extension has permission to create tabs
- Check manifest.json permissions
- Verify chrome.tabs API is available

### Issue: "Failed to send START_CRAWL"
- Verify content script is injected
- Check if tab is still loading
- Verify message format is correct

## Files Modified

- `extension/background.js` - Added tab creation and wait logic

## Files NOT Modified

- `extension/content.js` - Already correct
- `extension/manifest.json` - Already correct
- `app/api/extension/crawl/route.ts` - Already correct
- `app/api/extension/crawl/pending/route.ts` - Already correct
- `app/api/extension/crawl/data` (PUT) - Already correct

## Expected Behavior After Fix

1. User enters URL in frontend
2. User clicks "Start Discovery"
3. Extension automatically:
   - Creates new tab with target URL
   - Waits for page to load
   - Sends START_CRAWL to content script
4. Content script:
   - Captures network requests
   - Performs user interactions
   - Sends data to backend
5. Backend:
   - Processes network data
   - Filters for API endpoints
   - Returns results via SSE
6. Frontend:
   - Displays "Found X endpoints"
   - Shows endpoint list

## Next Steps After Verification

If tests pass:
1. Test with different URLs
2. Test with authenticated pages
3. Test with complex SPAs
4. Document results

If tests fail:
1. Check console logs
2. Verify all files are updated
3. Clear extension cache
4. Reload extension
5. Try again

