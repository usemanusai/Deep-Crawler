# Testing Extension Crawl - Quick Guide

## Prerequisites

- ✅ Extension loaded in Chrome
- ✅ Backend running at http://localhost:3002
- ✅ You have a website you can log into

---

## Step 1: Reload Extension (30 seconds)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Find "DeepCrawler Session Bridge"
4. Click the **refresh icon** (circular arrow)
5. Wait for "Compiled" message in terminal

**Expected**: Extension reloads without errors

---

## Step 2: Verify Connection (1 minute)

1. Go to http://localhost:3002
2. Look at top-left corner
3. Should see: **🟢 Connected** (green dot)
4. Mode should show: **AUTO**

**If not connected**:
- Check browser console for errors
- Verify backend is running
- Check extension logs: `chrome://extensions/` → "DeepCrawler Session Bridge" → "Errors"

---

## Step 3: Log Into a Website (2 minutes)

Choose one of these:
- **GitHub**: https://github.com (click Sign in)
- **Twitter**: https://twitter.com (click Sign in)
- **LinkedIn**: https://linkedin.com (click Sign in)
- **Any website** you have an account for

**Important**: Stay logged in for the next step

---

## Step 4: Start Crawl (5 minutes)

1. Go to http://localhost:3002
2. In the URL field, enter the website you logged into
   - Example: `https://github.com`
3. Make sure "Only include same-origin APIs" is **checked**
4. Click **"Start Discovery"** button

**Expected**: 
- Terminal shows: `[Crawl API] Using extension mode for crawl`
- Progress bar appears
- Live log shows activity

---

## Step 5: Monitor Progress (5 minutes)

Watch the **Crawl Terminal** on the right side:

### Phase 1: Initialization (0-10%)
```
Extension crawl initiated for https://github.com/
Instructing extension to navigate and capture network data...
```

### Phase 2: User Interactions (10-50%)
```
[DeepCrawler Content] Starting user interactions
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Form interactions completed
```

### Phase 3: Data Processing (50-90%)
```
[DeepCrawler Content] Sent network data to backend: { success: true, endpointCount: 45 }
[Extension Crawl] Received 45 requests, total endpoints: 45
Processing 45 captured network requests
```

### Phase 4: Complete (90-100%)
```
Extension crawl complete! Found 32 unique endpoints
```

---

## Step 6: Verify Results (2 minutes)

After crawl completes:

1. **Check endpoint count**
   - Should show: "Found X unique endpoints"
   - X should be > 0 (ideally 20+)

2. **Check endpoint list**
   - Scroll down to see discovered endpoints
   - Should show: Method, URL, Status, Size

3. **Check Postman collection**
   - Should have "Download Postman Collection" button
   - Collection should contain all discovered endpoints

---

## Troubleshooting

### Issue: Still showing "0 endpoints"

**Check 1**: Is extension mode being used?
```
Look for: "[Crawl API] Using extension mode for crawl"
If not: Extension not connected, check status
```

**Check 2**: Is content script running?
```
Open DevTools (F12) on the target website
Go to Console tab
Look for: "[DeepCrawler Content] Starting user interactions"
If not: Content script not injected
```

**Check 3**: Is network data being sent?
```
Open DevTools Network tab
Look for: PUT request to /api/extension/crawl/data
If not: Network data not being sent
```

### Issue: Extension shows "Disconnected"

1. Check backend is running: `npm run dev`
2. Reload extension: `chrome://extensions/` → refresh
3. Check browser console for errors
4. Verify API key matches: `deepcrawler-extension-v1`

### Issue: Crawl times out

1. Website might be slow to load
2. Try a simpler website first
3. Check network tab for blocked requests
4. Increase timeout in code if needed

### Issue: No API endpoints found

1. Website might not have API calls on initial load
2. Try scrolling manually to trigger more requests
3. Try clicking buttons/links manually
4. Check if website requires authentication

---

## Comparing with Server-Side Mode

### To test server-side mode:

1. Go to http://localhost:3002
2. Click **Settings** (top-right)
3. Change Mode to **"Server-side Only"**
4. Enter same URL
5. Click "Start Discovery"

### Compare results:
- Extension mode should find similar or more endpoints
- Extension mode should be faster (uses authenticated session)
- Server-side mode might find different endpoints (no auth)

---

## Expected Endpoint Examples

### GitHub
```
GET https://api.github.com/user
GET https://api.github.com/user/repos
POST https://api.github.com/graphql
GET https://github.com/api/v3/user/repos
```

### Twitter
```
GET https://api.twitter.com/2/tweets/search/recent
POST https://api.twitter.com/2/tweets
GET https://api.twitter.com/2/users/me
```

### LinkedIn
```
GET https://api.linkedin.com/v2/me
POST https://api.linkedin.com/v2/shares
GET https://api.linkedin.com/v2/connections
```

---

## Success Criteria

✅ Extension shows "Connected"
✅ Extension mode is used (not server mode)
✅ Network data is captured
✅ User interactions are performed
✅ API endpoints are discovered (> 0)
✅ Authentication is preserved
✅ Results match or exceed server-side crawl

---

## Next Steps

If everything works:
1. Try different websites
2. Try with and without authentication
3. Compare extension vs server-side results
4. Check Postman collection is valid
5. Test with different "same-origin" settings

---

**Status**: Ready to test
**Time**: ~15 minutes total
**Success Rate**: Should find 20+ endpoints on most websites

