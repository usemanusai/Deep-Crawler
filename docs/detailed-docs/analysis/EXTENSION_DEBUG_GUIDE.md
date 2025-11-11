# Extension Debugging Guide

## 🔍 Current Issue

The extension is not connecting to the backend. The dev server logs show:
```
[Extension API] /status { connected: false, lastHeartbeatMs: null }
```

This means:
- ❌ Extension is NOT sending heartbeats to `/api/extension/ping`
- ❌ Extension is NOT loaded in Chrome
- ❌ Extension service worker is NOT running

## ✅ Step 1: Verify Extension is Loaded in Chrome

### Check if Extension is Loaded

1. **Open Chrome Extensions Page**:
   ```
   chrome://extensions/
   ```

2. **Look for "DeepCrawler Session Bridge"**:
   - Should appear in the list
   - Should have a blue toggle (enabled)
   - Should show version 1.0.0

3. **If NOT Found**:
   - Extension is not loaded
   - Follow "Load Extension" steps below

### Load Extension in Chrome

1. **Enable Developer Mode**:
   - Go to `chrome://extensions/`
   - Toggle "Developer mode" (top right)

2. **Load Unpacked Extension**:
   - Click "Load unpacked"
   - Navigate to: `hyperbrowser-app-examples/deep-crawler-bot/extension/`
   - Click "Select Folder"

3. **Verify Extension Loaded**:
   - Should see "DeepCrawler Session Bridge" in the list
   - Should show version 1.0.0
   - Should have a blue toggle (enabled)

## ✅ Step 2: Check Service Worker Console

1. **Open Service Worker Console**:
   - Go to `chrome://extensions/`
   - Find "DeepCrawler Session Bridge"
   - Click "Service Worker" link (under the extension name)
   - This opens the service worker console

2. **Look for These Logs**:
   ```
   [DeepCrawler] Extension installed
   [DeepCrawler] Settings loaded
   [DeepCrawler] Initializing connection to backend...
   [DeepCrawler] Backend URL: http://localhost:3002
   [DeepCrawler] API Key: deepcrawler-extension-v1
   [DeepCrawler] Starting heartbeat immediately...
   [DeepCrawler] Connected to backend
   ```

3. **If You See Errors**:
   - Check the error message
   - Common errors:
     - `Failed to fetch` - Backend not running
     - `CORS error` - Backend CORS headers issue
     - `TypeError` - JavaScript error in extension

## ✅ Step 3: Check Network Requests

1. **Open Chrome DevTools**:
   - Press `F12` or `Ctrl+Shift+I`

2. **Go to Network Tab**:
   - Click "Network" tab

3. **Look for Requests to localhost:3002**:
   - Should see `/api/extension/ping` requests every 30 seconds
   - Should see `/api/extension/status` request
   - Should see `/api/extension/crawl/pending` requests every 2 seconds

4. **If No Requests**:
   - Extension is not running
   - Check service worker console for errors

## ✅ Step 4: Verify Backend is Running

1. **Check Dev Server**:
   ```bash
   npm run dev:clean
   ```

2. **Verify Server Started**:
   ```
   ▲ Next.js 14.2.33
   - Local:        http://localhost:3002
   ```

3. **Test Backend Endpoint**:
   ```bash
   curl -s http://localhost:3002/api/extension/status \
     -H "X-Extension-Key: deepcrawler-extension-v1"
   ```

   Should return:
   ```json
   {
     "status": "disconnected",
     "version": "1.0.0",
     "timestamp": "...",
     "backend": "deepcrawler-v1",
     "lastHeartbeatMs": null
   }
   ```

## ✅ Step 5: Reload Extension

If extension is loaded but not working:

1. **Go to `chrome://extensions/`**

2. **Find "DeepCrawler Session Bridge"**

3. **Click Reload Button** (circular arrow icon)

4. **Check Service Worker Console** for new logs

## 🔧 Troubleshooting

### Issue: Extension Not Appearing in chrome://extensions/

**Solution**:
1. Make sure you're in the correct directory
2. Check that `manifest.json` exists in the folder
3. Try loading again

### Issue: "Manifest errors" when loading

**Solution**:
1. Check `extension/manifest.json` for syntax errors
2. Verify all required fields are present
3. Check that file paths are correct

### Issue: Service Worker Shows Errors

**Solution**:
1. Check the error message
2. Common fixes:
   - Restart dev server if backend error
   - Reload extension if JavaScript error
   - Check CORS headers if fetch error

### Issue: No Network Requests to Backend

**Solution**:
1. Check service worker console for errors
2. Verify backend is running on port 3002
3. Check that `BACKEND_URL` is correct in background.js
4. Try reloading extension

### Issue: Heartbeat Requests Failing

**Solution**:
1. Check backend logs for errors
2. Verify API key is correct
3. Check CORS headers
4. Try restarting dev server

## 📊 Expected Behavior

### When Extension is Working

**Dev Server Logs**:
```
[Extension API] /ping received
[Extension API] /status { connected: true, lastHeartbeatMs: 1762550213054 }
```

**Service Worker Console**:
```
[DeepCrawler] Connected to backend
[DeepCrawler] Heartbeat sent
[DeepCrawler] Found pending crawl: crawl-123
```

**Network Tab**:
- `/api/extension/ping` - every 30 seconds
- `/api/extension/status` - on startup
- `/api/extension/crawl/pending` - every 2 seconds

## 🚀 Quick Checklist

- [ ] Extension loaded in `chrome://extensions/`
- [ ] Extension toggle is blue (enabled)
- [ ] Dev server running on port 3002
- [ ] Service worker console shows no errors
- [ ] Network tab shows requests to localhost:3002
- [ ] Dev server logs show `/ping` requests
- [ ] Dev server logs show `connected: true`

## 📞 Support

If extension still not working:

1. **Check all steps above**
2. **Reload extension** in chrome://extensions/
3. **Restart dev server** with `npm run dev:clean`
4. **Check service worker console** for errors
5. **Check dev server logs** for errors

---

**Status**: Debugging Guide
**Last Updated**: October 31, 2025

