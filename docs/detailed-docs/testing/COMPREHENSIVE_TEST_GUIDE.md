# DeepCrawler Extension - Comprehensive Test Guide

## 🎯 Objective

Test the complete extension flow and identify where network requests are not being captured.

## 📋 Prerequisites

1. Backend running: `npm run dev`
2. Extension loaded in Chrome
3. Chrome DevTools open

## 🧪 Test Steps

### Step 1: Verify Extension is Loaded

**Action**: Check chrome://extensions/

**Expected**:
- "DeepCrawler Session Bridge" appears in list
- Status shows "Enabled"
- Extension ID is visible

**If Failed**:
- Reload extension (toggle off/on)
- Check for errors in Service Worker console

---

### Step 2: Check Service Worker Console

**Action**:
1. Find "DeepCrawler Session Bridge" in extensions list
2. Click "Service Worker" link
3. DevTools opens

**Expected Logs**:
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Backend URL: http://localhost:3002
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
[DeepCrawler] Initial heartbeat successful
[DeepCrawler] Starting polling for pending crawls...
```

**If Missing**:
- Extension not initializing properly
- Check manifest.json for errors
- Reload extension

---

### Step 3: Verify Backend Connection

**Action**: Run test script
```bash
node test-extension-load.js
```

**Expected Output**:
```
✅ Extension is already connected!
   The extension is loaded and sending heartbeats.
```

**If Failed**:
- Backend not running
- Extension not sending heartbeats
- Check Service Worker console for errors

---

### Step 4: Test Network Capture on Test Page

**Action**:
1. Open new tab: `http://localhost:3002/api/test`
2. Open DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests`
5. Press Enter

**Expected**:
- Array with 6+ requests appears
- Each request has: method, url, status, timestamp

**If Empty Array**:
- Network interceptor not injected
- Check page console for "[DeepCrawler]" logs
- Verify manifest.json content_scripts

**If Error**:
- Network interceptor not loaded
- Check page console for errors

---

### Step 5: Monitor Backend During Crawl

**Action**: In separate terminal, run:
```bash
node monitor-backend.js
```

**Expected**:
- Shows "Extension Status: Connected"
- Shows heartbeat timestamps

---

### Step 6: Start Crawl

**Action**:
1. Open: `http://localhost:3002`
2. Enter URL: `https://miniapps.ai`
3. Click "Start Discovery"

**Expected in UI**:
- Progress bar appears
- "Waiting for extension..." message
- After 30-60 seconds: "Found X endpoints"

**Expected in Backend Monitor**:
- Pending crawls appear
- Crawl request ID shown

**Expected in Service Worker Console**:
```
[DeepCrawler] Found pending crawl: crawl-XXXXX
[DeepCrawler] Crawl URL: https://miniapps.ai
[DeepCrawler] Creating new tab for: https://miniapps.ai
[DeepCrawler] Created new tab: XXX
[DeepCrawler] Sending START_CRAWL to tab XXX
```

---

### Step 7: Check Network Capture in New Tab

**Action**:
1. Switch to the new tab created by extension
2. Open DevTools (F12)
3. Go to Console tab
4. Look for "[DeepCrawler]" logs

**Expected Logs**:
```
[DeepCrawler] Network interceptor script loaded in page context
[DeepCrawler] Fetch interceptor installed: true
[DeepCrawler] XHR interceptor installed: true
[DeepCrawler] Global requests array available: true
[DeepCrawler] Fetch #1 intercepted: GET https://miniapps.ai
[DeepCrawler] Captured fetch: GET https://miniapps.ai 200 (1 total)
```

**If No Logs**:
- Network interceptor not injected
- Check manifest.json
- Reload extension

**If Logs But No Requests**:
- Fetch/XHR not being called
- Page might be using different method
- Check page console for errors

---

### Step 8: Check Content Script Console

**Action**:
1. In the new tab, open DevTools
2. Go to Console tab
3. Look for "[DeepCrawler Content]" logs

**Expected Logs**:
```
[DeepCrawler Content] Version: 3.0.0-csp-bypass-fixed
[DeepCrawler Content] Content script loaded
[DeepCrawler Content] Setting up network interception listeners
[DeepCrawler Content] START_CRAWL received for crawl crawl-XXXXX
[DeepCrawler Content] Found X requests from page load
[DeepCrawler Content] Sending X new network requests to backend
```

**If No Logs**:
- Content script not loaded
- Check manifest.json
- Reload extension

---

### Step 9: Check Backend Logs

**Action**: Look at terminal where `npm run dev` is running

**Expected**:
```
[Extension Crawl] PUT request received: requestId=crawl-XXXXX, action=add_requests, requests=X
[Extension Crawl] Processing X network requests for session crawl-XXXXX
[Extension Crawl] Received X requests, total endpoints: Y
```

**If No PUT Requests**:
- Content script not sending data
- Check content script console for errors
- Verify backend URL in extension settings

---

## 🔍 Debugging Checklist

- [ ] Extension appears in chrome://extensions/
- [ ] Service Worker console shows initialization logs
- [ ] Backend monitor shows "Connected: true"
- [ ] Network capture works on test page
- [ ] New tab is created when crawl starts
- [ ] Network interceptor logs appear in new tab
- [ ] Content script logs appear in new tab
- [ ] Backend receives PUT requests
- [ ] Crawl completes with endpoints

## 🐛 Common Issues

### Issue: Network interceptor not injected
**Solution**:
- Check manifest.json content_scripts
- Verify network-interceptor.js exists
- Reload extension
- Check page console for CSP errors

### Issue: Content script not loaded
**Solution**:
- Check manifest.json content_scripts
- Verify content.js exists
- Reload extension
- Check page console for errors

### Issue: No network requests captured
**Solution**:
- Check if page makes any requests
- Try different URL
- Check page console for errors
- Verify fetch/XHR are being used

### Issue: Data not sent to backend
**Solution**:
- Check backend URL in extension settings
- Verify API key is correct
- Check content script console for errors
- Check backend logs for 404/401 errors

## 📊 Success Criteria

All of the following must be true:

- ✅ Extension connected
- ✅ Network interceptor injected
- ✅ Network requests captured (6+)
- ✅ Data sent to backend (PUT requests)
- ✅ Crawl completes successfully
- ✅ Endpoints discovered (10+)

---

**Status**: Ready for testing  
**Next Action**: Follow steps 1-9 above

