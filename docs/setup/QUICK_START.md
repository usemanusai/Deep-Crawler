# DeepCrawler Extension - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js installed
- Chrome browser
- Terminal/Command prompt

### Step 1: Start Dev Server (1 minute)

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm run dev
```

Wait for: `ready - started server on 0.0.0.0:3002`

### Step 2: Load Extension in Chrome (2 minutes)

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select: `hyperbrowser-app-examples/deep-crawler-bot/extension`
6. Click "Select Folder"
7. Verify "DeepCrawler Session Bridge" appears and is enabled

### Step 3: Verify Extension is Connected (1 minute)

1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Service Worker" link
4. Go to Console tab
5. Look for: `[DeepCrawler] Heartbeat successful`
6. Should see this log every 30 seconds

### Step 4: Test Network Capture (1 minute)

1. Open new tab: `http://localhost:3002/api/test`
2. Open DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests`
5. Should show array with 6+ requests

### Step 5: Run Full Crawl (Optional)

1. Open new tab: `http://localhost:3002`
2. Enter URL: `http://localhost:3002/api/test`
3. Click "Start Discovery"
4. Should complete with 6+ endpoints

## ✅ Success Indicators

- [ ] Extension shows in chrome://extensions/
- [ ] Service Worker console shows heartbeat logs
- [ ] window.__deepcrawlerRequests has 6+ requests
- [ ] Crawl completes with 6+ endpoints
- [ ] No errors in any console

## 🔍 Troubleshooting

### Extension Not Showing
- Verify path: `hyperbrowser-app-examples/deep-crawler-bot/extension`
- Check manifest.json exists
- Try refreshing chrome://extensions/

### No Heartbeat Logs
- Check Service Worker console (not page console)
- Verify backend is running on port 3002
- Check BACKEND_URL in background.js

### No Network Requests
- Verify page is loading (check Network tab)
- Check page console for "[DeepCrawler] Network interceptor script loaded"
- Try clicking buttons on the test page

### Crawl Returns 0 Endpoints
- Verify network requests are captured
- Check backend logs for PUT requests
- Verify API detection logic is working

## 📊 Expected Results

### Service Worker Console
```
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Sending initial heartbeat to http://localhost:3002/api/extension/ping
[DeepCrawler] Initial heartbeat response: 200
[DeepCrawler] Sending periodic heartbeat...
[DeepCrawler] Heartbeat successful
```

### Page Console (http://localhost:3002/api/test)
```
[DeepCrawler] Network interceptor script loaded in page context
[DeepCrawler] Captured fetch: GET http://localhost:3002/api/test/users 200 (1 total)
[DeepCrawler] Captured fetch: POST http://localhost:3002/api/test/users 201 (2 total)
...
```

### Crawl Results
```
Found 6 unique endpoints:
- GET /api/test/users
- POST /api/test/users
- PUT /api/test/users/1
- DELETE /api/test/users/1
- GET /api/test/posts
- GET /api/test/comments
```

## 📚 More Information

- **Architecture**: See `EXTENSION_ARCHITECTURE.md`
- **Manual Testing**: See `MANUAL_TEST_GUIDE.md`
- **Debugging**: See `DEBUG_EXTENSION_FLOW.md`
- **System Status**: See `SYSTEM_STATUS_REPORT.md`

## 🎯 Next Steps

1. ✅ Load extension in Chrome
2. ✅ Verify heartbeat in Service Worker console
3. ✅ Test network capture on test page
4. ✅ Run full crawl
5. ✅ Verify 6+ endpoints discovered

---

**Status**: Ready to test  
**All Components**: ✅ Working  
**Estimated Time**: 5 minutes

