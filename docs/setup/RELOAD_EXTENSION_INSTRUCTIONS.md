# How to Reload the Extension

## 🔄 Quick Reload (Recommended)

### Method 1: Using Chrome Extensions Page

1. **Open Chrome**
2. **Go to**: `chrome://extensions/`
3. **Find**: "DeepCrawler Session Bridge"
4. **Click**: The refresh icon (circular arrow) on the extension card
5. **Wait**: 2-3 seconds for reload to complete

**Expected**: Extension reloads with new code

### Method 2: Toggle Off/On

1. **Open Chrome**
2. **Go to**: `chrome://extensions/`
3. **Find**: "DeepCrawler Session Bridge"
4. **Toggle**: OFF (switch turns gray)
5. **Wait**: 1 second
6. **Toggle**: ON (switch turns blue)
7. **Wait**: 2-3 seconds for initialization

**Expected**: Extension reloads and reinitializes

## ✅ Verify Reload Was Successful

### Check 1: Service Worker Console
1. Find "DeepCrawler Session Bridge" in extensions list
2. Click "Service Worker" link
3. DevTools opens
4. Go to Console tab
5. Look for recent logs starting with "[DeepCrawler]"

**Expected**:
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Initial heartbeat successful
```

### Check 2: Backend Connection
```bash
node test-extension-load.js
```

**Expected Output**:
```
✅ Extension is already connected!
   The extension is loaded and sending heartbeats.
```

### Check 3: Monitor Backend
```bash
node monitor-backend.js
```

**Expected**:
```
Extension Status:
  Connected: true
  Last Heartbeat: 2025-11-07T...
  Time since heartbeat: XXXms
```

## 🧪 After Reload: Test Network Capture

### Step 1: Open Test Page
1. Open new tab
2. Go to: `http://localhost:3002/api/test`
3. Wait for page to load

### Step 2: Check Network Interceptor
1. Open DevTools (F12)
2. Go to Console tab
3. Type: `window.__deepcrawlerRequests`
4. Press Enter

**Expected**: Array with 6+ requests

**If Empty**:
- Network interceptor not injected
- Try reloading extension again
- Check console for errors

### Step 3: Check Console Logs
1. In same console, look for "[DeepCrawler]" logs
2. Should see logs like:
   - "Network interceptor script loaded"
   - "Fetch interceptor installed"
   - "Captured fetch: GET ..."

**If No Logs**:
- Network interceptor not injected
- Reload extension
- Check manifest.json

## 🚀 After Reload: Test Full Crawl

### Step 1: Start Backend Monitor
```bash
node monitor-backend.js
```

### Step 2: Start Crawl
1. Open: `http://localhost:3002`
2. Enter URL: `https://miniapps.ai`
3. Click "Start Discovery"

### Step 3: Monitor Service Worker Console
1. Find "DeepCrawler Session Bridge"
2. Click "Service Worker"
3. Watch for logs:
   - "Found pending crawl"
   - "Creating new tab"
   - "Sending START_CRAWL"

### Step 4: Check New Tab
1. Switch to new tab created by extension
2. Open DevTools (F12)
3. Go to Console tab
4. Look for "[DeepCrawler]" logs

**Expected**:
```
[DeepCrawler] Network interceptor script loaded
[DeepCrawler] Fetch #1 intercepted: GET https://miniapps.ai
[DeepCrawler] Captured fetch: GET https://miniapps.ai 200 (1 total)
```

### Step 5: Check Backend Logs
1. Look at terminal where `npm run dev` is running
2. Should see:
   - "PUT request received"
   - "Processing X network requests"
   - "Received X requests, total endpoints: Y"

### Step 6: Check UI Results
1. Go back to main UI tab
2. Should show:
   - Progress bar at 100%
   - "Found X endpoints"
   - List of discovered endpoints

## ❌ If Still Not Working

### Issue: Network interceptor still not injected

**Try**:
1. Completely unload extension
2. Reload extension
3. Check manifest.json for errors
4. Check browser console for CSP errors

**Steps**:
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Remove" button
4. Confirm removal
5. Go to `chrome://extensions/`
6. Click "Load unpacked"
7. Select `extension/` folder
8. Verify extension appears

### Issue: Content script not receiving messages

**Try**:
1. Check if content.js is loaded
2. Verify message listener is working
3. Check for errors in console

**Steps**:
1. Open new tab
2. Go to any website
3. Open DevTools (F12)
4. Go to Console tab
5. Type: `chrome.runtime.id`
6. Should return extension ID
7. If error, content script not loaded

### Issue: Backend not receiving data

**Try**:
1. Check backend URL in extension settings
2. Verify API key is correct
3. Check backend logs for errors

**Steps**:
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Details"
4. Click "Extension options"
5. Verify Backend URL: `http://localhost:3002`
6. Verify API Key: `deepcrawler-extension-v1`
7. Click "Save"

## 📋 Reload Checklist

- [ ] Extension reloaded
- [ ] Service Worker console shows initialization logs
- [ ] Backend monitor shows "Connected: true"
- [ ] Network capture works on test page
- [ ] New tab created when crawl starts
- [ ] Network interceptor logs appear in new tab
- [ ] Backend receives PUT requests
- [ ] Crawl completes with endpoints

---

**Status**: Ready to reload  
**Next Action**: Follow steps above to reload extension

