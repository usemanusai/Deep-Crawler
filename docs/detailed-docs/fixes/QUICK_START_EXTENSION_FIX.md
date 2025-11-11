# Quick Start - Extension Fix

## 🎯 What Was Fixed

Extension was returning **0 results** because it wasn't capturing network requests made during page load.

**Fix**: Retrieve requests captured during page load and include them in the crawl.

## ⚡ Quick Steps (5 minutes)

### Step 1: Reload Extension (1 minute)

1. Open Chrome
2. Go to: `chrome://extensions/`
3. Find "DeepCrawler Session Bridge"
4. Click the reload button (circular arrow icon)
5. Wait for extension to reload

### Step 2: Test with Simple URL (2 minutes)

1. Open: `http://localhost:3002`
2. Enter URL: `http://localhost:3002/api/test`
3. Click "Start Discovery"
4. Wait for crawl to complete

**Expected**: Should show "Found 6 API endpoints" (not 0)

### Step 3: Test with Real URL (2 minutes)

1. Open: `http://localhost:3002`
2. Enter URL: `https://miniapps.ai`
3. Click "Start Discovery"
4. Wait for crawl to complete

**Expected**: Should show "Found 10+ API endpoints" (not 0)

## ✅ Success Indicators

- [x] Extension reloaded
- [ ] Test URL shows 6 endpoints
- [ ] Real URL shows 10+ endpoints
- [ ] Results match server-side crawl

## 🔍 If Still Getting 0 Results

### Check 1: Are Requests Being Captured?

1. Open Chrome DevTools on the crawled page
2. Go to Console tab
3. Type: `window.__deepcrawlerRequests`
4. Should show array with requests

**If empty**: Network interceptor not working

### Check 2: Is Content Script Receiving Requests?

1. Open Chrome DevTools on the crawled page
2. Go to Console tab
3. Type: `chrome.runtime.sendMessage({type: 'GET_NETWORK_REQUESTS'}, r => console.log('Requests:', r.requests.length))`
4. Should show number > 0

**If 0**: Content script not receiving messages

### Check 3: Is Backend Receiving Requests?

1. Check dev server terminal
2. Look for: `[Extension Crawl] Received X requests`
3. Should show X > 0

**If 0**: Backend not receiving data

## 📊 Expected Results

### Before Fix
```
Extension crawl: 0 results
Server-side crawl: 10+ results
```

### After Fix
```
Extension crawl: 10+ results ✅
Server-side crawl: 10+ results ✅
```

## 🎯 What Changed

### File 1: extension/content.js

**Added**: Retrieve requests from page load
```javascript
// Get requests captured during page load
const pageLoadRequests = window.__deepcrawlerRequests || [];
// Add them to NETWORK_REQUESTS
```

**Added**: Trigger page interactions
```javascript
// Scroll page and hover over elements
window.scrollTo(0, document.body.scrollHeight);
```

### File 2: extension/network-interceptor.js

**Improved**: Better logging
```javascript
console.log('[DeepCrawler] Captured fetch:', method, url, response.status, `(${NETWORK_REQUESTS.length} total)`);
```

## 📞 Support

If extension still not working:

1. **Reload extension** again
2. **Check console logs** for errors
3. **Check backend logs** for errors
4. **Try different URL** (some pages don't make API calls)
5. **Restart dev server** with `npm run dev:clean`

## 🚀 Next Steps

1. Reload extension
2. Test with simple URL
3. Verify 6 endpoints found
4. Test with real URL
5. Verify 10+ endpoints found

---

**Status**: Fix ready for testing
**Time to Test**: 5 minutes
**Expected Outcome**: Extension crawl returns 10+ endpoints instead of 0

