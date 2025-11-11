# DeepCrawler Extension - Loading & Debugging Guide

## 🚨 Critical Issue

The DeepCrawler extension is **NOT LOADED** in your Chrome browser. This is why:
- Extension status shows `disconnected`
- No heartbeats are being sent
- Crawls return 0 endpoints
- No network data is captured

## ✅ Solution: Load the Extension in Chrome

### Step 1: Open Chrome Extensions Page
```
1. Open Chrome browser
2. Go to: chrome://extensions/
3. You should see the extensions management page
```

### Step 2: Enable Developer Mode
```
1. Look for "Developer mode" toggle in the top-right corner
2. Click to enable it
3. You should see new buttons appear: "Load unpacked", "Pack extension", etc.
```

### Step 3: Load the Extension
```
1. Click "Load unpacked" button
2. Navigate to: hyperbrowser-app-examples/deep-crawler-bot/extension
3. Click "Select Folder"
4. The extension should now appear in the list as "DeepCrawler Session Bridge"
```

### Step 4: Verify Extension is Loaded
```
1. Look for "DeepCrawler Session Bridge" in the extensions list
2. Verify it shows as "Enabled" (toggle should be ON)
3. You should see:
   - Extension name: "DeepCrawler Session Bridge"
   - Version: "1.0.0"
   - ID: (a long alphanumeric string)
```

### Step 5: Check Service Worker Console
```
1. Find "DeepCrawler Session Bridge" in the extensions list
2. Click "Service Worker" link (appears below the extension name)
3. A DevTools window should open
4. Go to the "Console" tab
5. You should see logs like:
   - "[DeepCrawler] Initializing connection to backend..."
   - "[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping"
   - "[DeepCrawler] Initial heartbeat response: 200"
   - "[DeepCrawler] Heartbeat successful" (every 30 seconds)
```

## 🧪 Verify Extension is Connected

### Method 1: Check Backend Status
```bash
# Run this command in terminal
cd hyperbrowser-app-examples/deep-crawler-bot
node test-extension-load.js
```

Expected output:
```
✅ Extension is already connected!
   The extension is loaded and sending heartbeats.
```

### Method 2: Check UI Connection Status
```
1. Open http://localhost:3002 in Chrome
2. Look for connection status indicator at the top
3. Should show: "🟢 Extension Connected" (green indicator)
```

## 🔍 Troubleshooting

### Extension Not Appearing in List
- Verify path is correct: `hyperbrowser-app-examples/deep-crawler-bot/extension`
- Check that `manifest.json` exists in the folder
- Try refreshing the extensions page (F5)

### Extension Appears but Shows Error
- Click on the extension to see error details
- Common errors:
  - "Manifest error" - Check manifest.json syntax
  - "Failed to load" - Check file permissions
  - "Invalid manifest" - Verify manifest.json is valid JSON

### No Heartbeat Logs in Service Worker Console
- Verify backend is running on port 3002
- Check that BACKEND_URL in background.js is correct
- Verify EXTENSION_API_KEY matches in both extension and backend
- Try reloading the extension (toggle off/on)

### Heartbeat Logs Show Errors
- Check backend logs for errors
- Verify network connectivity
- Check firewall settings
- Try accessing http://localhost:3002 directly in browser

## 🚀 Test the Complete Flow

Once extension is connected:

### 1. Verify Heartbeat
```bash
node test-extension-load.js
```

### 2. Test Crawl
```
1. Open http://localhost:3002
2. Enter URL: https://miniapps.ai
3. Click "Start Discovery"
4. Wait for crawl to complete
5. Should show: "Found X API endpoints"
```

### 3. Check Network Capture
```
1. Open http://localhost:3002/api/test in a new tab
2. Open DevTools (F12)
3. Go to Console tab
4. Type: window.__deepcrawlerRequests
5. Should show array with 6+ network requests
```

## 📊 Expected Results

### Service Worker Console
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Backend URL: http://localhost:3002
[DeepCrawler] API Key: deepcrawler-extension-v1
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
[DeepCrawler] Initial heartbeat response: 200
[DeepCrawler] Initial heartbeat successful
[DeepCrawler] Connected to backend
[DeepCrawler] Starting heartbeat with interval: 30000 ms
[DeepCrawler] Sending periodic heartbeat...
[DeepCrawler] Heartbeat successful
```

### Backend Status
```
connected: true
lastHeartbeatMs: <recent timestamp>
```

### Crawl Results
```
Found 10+ API endpoints
```

## 🎯 Next Steps

1. ✅ Load extension in Chrome
2. ✅ Verify heartbeat in Service Worker console
3. ✅ Run `node test-extension-load.js`
4. ✅ Test crawl on http://localhost:3002
5. ✅ Verify 10+ endpoints are discovered

## 📞 Support

If you encounter issues:

1. Check Service Worker console for error messages
2. Check backend logs for API errors
3. Verify network connectivity
4. Try reloading the extension
5. Try restarting the backend server

---

**Status**: Extension needs to be manually loaded in Chrome  
**Next Action**: Follow steps above to load extension

