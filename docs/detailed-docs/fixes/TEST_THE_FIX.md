# Testing the Extension Crawl Fix

## 🚀 Quick Start (5 minutes)

### Step 1: Reload Extension
```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon
4. Wait for "Loaded" status
```

### Step 2: Verify Backend is Running
```
Terminal should show:
✓ Ready in 5.6s
✓ Compiled /api/extension/status
✓ Compiled /api/extension/crawl
```

### Step 3: Start a Crawl
```
1. Go to http://localhost:3002
2. Log into a website (GitHub, Twitter, etc.)
3. Enter the website URL
4. Click "Start Discovery"
5. Wait for results
```

### Step 4: Check Results
```
Should see:
- Progress updates in real-time
- 20+ API endpoints discovered
- Postman collection available
- Same or more endpoints than server-side
```

---

## 🔍 Detailed Testing

### Test 1: GitHub (Recommended)
```
1. Go to https://github.com
2. Click "Sign in"
3. Log in with your account
4. Go to http://localhost:3002
5. Enter: https://github.com
6. Click "Start Discovery"
7. Expected: 20+ endpoints
```

### Test 2: Twitter
```
1. Go to https://twitter.com
2. Log in
3. Go to http://localhost:3002
4. Enter: https://twitter.com
5. Click "Start Discovery"
6. Expected: 20+ endpoints
```

### Test 3: LinkedIn
```
1. Go to https://linkedin.com
2. Log in
3. Go to http://localhost:3002
4. Enter: https://linkedin.com
5. Click "Start Discovery"
6. Expected: 20+ endpoints
```

---

## 🔧 Debugging

### Check 1: Backend Logs
```
Terminal where npm run dev is running should show:
[Extension Crawl] Starting crawl crawl-... for https://...
[Extension Crawl] Returning 1 pending crawls
[DeepCrawler] Found pending crawl: crawl-...
[DeepCrawler] Sending START_CRAWL to tab ...
[Extension Crawl] Received X requests, total endpoints: Y
```

If you don't see these logs:
- Backend might not be running
- Extension might not be connected
- Check http://localhost:3002/api/extension/status

### Check 2: DevTools Console
```
Open DevTools (F12) on the target page and look for:
[DeepCrawler Content] Initializing on page: https://...
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Waiting for page load...
[DeepCrawler Content] Page load complete
[DeepCrawler Content] Starting scroll...
[DeepCrawler Content] Scrolling completed
[DeepCrawler Content] Starting clicks...
[DeepCrawler Content] Clicking completed
[DeepCrawler Content] Starting form interactions...
[DeepCrawler Content] Form interactions completed
[DeepCrawler Content] Total network requests captured: X
[DeepCrawler Content] Successfully sent network data to backend
```

If you don't see these logs:
- Content script not injected
- START_CRAWL message not received
- Check manifest.json content_scripts

### Check 3: Network Tab
```
Open DevTools Network tab and look for:
1. POST /api/extension/crawl (from frontend)
2. GET /api/extension/crawl/pending (from extension)
3. PUT /api/extension/crawl/data (from content script)
```

If any are missing:
- Check browser console for errors
- Verify API key is correct
- Check backend logs

### Check 4: Frontend Results
```
Should show:
- Progress bar updating
- Real-time logs
- Endpoint count increasing
- Final results with Postman collection
```

If showing 0 endpoints:
- Check backend logs
- Check DevTools console
- Check Network tab
- Verify content script is running

---

## ✅ Success Criteria

- [ ] Extension shows "🟢 Connected"
- [ ] Backend logs show "Returning 1 pending crawls"
- [ ] DevTools console shows "[DeepCrawler Content] Starting crawl"
- [ ] Network tab shows PUT request to /api/extension/crawl/data
- [ ] Backend logs show "Received X requests"
- [ ] Frontend shows 20+ endpoints
- [ ] Results match or exceed server-side crawl
- [ ] Postman collection is generated

---

## 🐛 Common Issues

### Issue: Still showing 0 endpoints
**Solution**:
1. Check backend logs for "Returning 1 pending crawls"
2. Check DevTools console for "[DeepCrawler Content] Starting crawl"
3. If not present, extension polling might not be working
4. Try reloading extension and backend

### Issue: Extension shows "Disconnected"
**Solution**:
1. Verify backend is running: `npm run dev`
2. Reload extension: `chrome://extensions/` → refresh
3. Check http://localhost:3002/api/extension/status

### Issue: Crawl times out
**Solution**:
1. Website might be slow
2. Try a simpler website
3. Check network tab for blocked requests
4. Increase timeout in backend if needed

### Issue: Different endpoint count than server-side
**Solution**:
1. This is normal - extension might find more (authenticated)
2. Difference should be < 20%
3. Check if same API detection logic is used
4. Verify both crawls completed successfully

---

## 📊 Expected Performance

| Metric | Expected |
|--------|----------|
| Page load wait | 3-5 seconds |
| Scrolling | 5-10 seconds |
| Clicking | 10-15 seconds |
| Form interactions | 5-10 seconds |
| Network data send | 1-2 seconds |
| Backend processing | 2-5 seconds |
| **Total time** | **30-60 seconds** |

---

## 🎯 Next Steps

### If Working
1. Test with multiple websites
2. Verify Postman collection is valid
3. Test with different authentication scenarios
4. Compare results with server-side crawl

### If Not Working
1. Follow debugging checklist above
2. Check console logs carefully
3. Verify all files were updated correctly
4. Check backend logs for errors
5. Try reloading extension and backend

---

**Status**: Ready to test
**Date**: October 31, 2025
**Expected Outcome**: Extension crawl discovers API endpoints with authentication preserved

