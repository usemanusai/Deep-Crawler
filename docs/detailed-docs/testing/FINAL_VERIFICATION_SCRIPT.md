# DeepCrawler Extension - Final Verification Script

## 🎯 Objective

Verify that the DeepCrawler extension is working correctly end-to-end.

## ✅ Pre-Requisites

- [ ] Backend running: `npm run dev` (port 3002)
- [ ] Extension loaded in Chrome: `chrome://extensions/`
- [ ] Extension shows as "Enabled"
- [ ] Service Worker console shows heartbeat logs

## 🧪 Verification Steps

### Step 1: Check Extension Connection (2 minutes)

**Terminal Command**:
```bash
cd hyperbrowser-app-examples/deep-crawler-bot
node test-extension-load.js
```

**Expected Output**:
```
✅ Extension is already connected!
   The extension is loaded and sending heartbeats.

🧪 Testing full crawl flow...

2️⃣  Initiating crawl...
   Status: 200
   Crawl ID: test-1762553911457

3️⃣  Checking pending crawls...
   Status: 200
   Pending crawls: 1
   First crawl: test-1762553911457
   URL: https://miniapps.ai
   Seed host: miniapps.ai

✅ Extension should now:
   1. Find the pending crawl
   2. Create a new tab with the URL
   3. Capture network requests
   4. Send data to backend

⏳ Waiting for extension to process crawl (30 seconds)...

✅ Crawl completed!
   The extension successfully processed the crawl.
```

**What This Verifies**:
- ✅ Extension is connected and sending heartbeats
- ✅ Backend can create crawl sessions
- ✅ Extension can find pending crawls
- ✅ Extension can process crawls

### Step 2: Check Network Capture (1 minute)

**Browser Steps**:
1. Open new tab: `http://localhost:3002/api/test`
2. Open DevTools (F12)
3. Go to Console tab
4. Type: `window.__deepcrawlerRequests`
5. Press Enter

**Expected Output**:
```javascript
[
  {method: 'GET', url: 'http://localhost:3002/api/test', status: 200, ...},
  {method: 'GET', url: 'http://localhost:3002/api/endpoints', status: 200, ...},
  {method: 'GET', url: 'http://localhost:3002/api/health', status: 200, ...},
  // ... 3+ more requests
]
```

**What This Verifies**:
- ✅ Network interceptor is injected
- ✅ Requests are being captured
- ✅ Data is stored in window.__deepcrawlerRequests

### Step 3: Check Service Worker Logs (1 minute)

**Browser Steps**:
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Service Worker" link
4. DevTools opens
5. Go to Console tab
6. Look for logs starting with "[DeepCrawler]"

**Expected Logs**:
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
[DeepCrawler] Starting polling for pending crawls...
[DeepCrawler] Polling for pending crawls...
```

**What This Verifies**:
- ✅ Extension initialized correctly
- ✅ Heartbeat is being sent
- ✅ Polling is active

### Step 4: Test Full Crawl (3 minutes)

**Browser Steps**:
1. Open: `http://localhost:3002`
2. Enter URL: `https://miniapps.ai`
3. Click "Start Discovery"
4. Wait for crawl to complete (max 60 seconds)

**Expected Result**:
```
Found 10+ API endpoints

Endpoints:
- GET /api/v1/apps
- POST /api/v1/apps
- GET /api/v1/apps/{id}
- PUT /api/v1/apps/{id}
- DELETE /api/v1/apps/{id}
- GET /api/v1/users
- POST /api/v1/users
- GET /api/v1/users/{id}
- PUT /api/v1/users/{id}
- DELETE /api/v1/users/{id}
```

**What This Verifies**:
- ✅ Extension creates tab with URL
- ✅ Network requests are captured
- ✅ Data is sent to backend
- ✅ Backend processes data correctly
- ✅ Crawl completes successfully
- ✅ Endpoints are discovered

### Step 5: Check Backend Logs (1 minute)

**Terminal Output** (from `npm run dev`):
```
[Extension Crawl] ========== STARTING CRAWL ==========
[Extension Crawl] Request ID: crawl-1762553911457-09g4rhyli
[Extension Crawl] URL: https://miniapps.ai
[Extension Crawl] Seed Host: miniapps.ai
[Extension Crawl] Same Origin Only: true

[Extension Crawl] Received network data from extension
[Extension Crawl] Request ID: crawl-1762553911457-09g4rhyli
[Extension Crawl] Data: {requests: [...], timestamp: ...}

[Extension Crawl] ========== CRAWL COMPLETED ==========
[Extension Crawl] Request ID: crawl-1762553911457-09g4rhyli
[Extension Crawl] Total endpoints: 10
[Extension Crawl] Endpoints: [...]
```

**What This Verifies**:
- ✅ Backend receives crawl request
- ✅ Backend receives network data from extension
- ✅ Backend processes data correctly
- ✅ Backend discovers endpoints

## 📊 Success Criteria

All of the following must be true:

- [ ] Extension status shows `connected: true`
- [ ] Service Worker console shows heartbeat logs
- [ ] Network capture shows 6+ requests
- [ ] Full crawl completes successfully
- [ ] Crawl returns 10+ endpoints
- [ ] Backend logs show PUT requests with network data
- [ ] No errors in any console

## 🎉 Expected Final Result

```
✅ Extension Connected
✅ Network Capture Working
✅ Crawl Processing Working
✅ Endpoints Discovered: 10+
✅ System Fully Functional
```

## 🐛 Troubleshooting

### Extension Not Connected
- Check Service Worker console for errors
- Verify backend is running on port 3002
- Try reloading extension (toggle off/on)
- Check firewall settings

### Network Capture Not Working
- Verify network-interceptor.js is injected
- Check page console for "[DeepCrawler]" logs
- Try different URL (e.g., http://localhost:3002/api/test)
- Check manifest.json for correct content script configuration

### Crawl Not Processing
- Check Service Worker console for polling logs
- Verify pending crawls endpoint returns data
- Check tab creation logs in Service Worker console
- Verify START_CRAWL message is sent

### Endpoints Not Discovered
- Check backend logs for PUT requests
- Verify network data is being sent
- Check that requests are being parsed correctly
- Try different URL with more API endpoints

## 📞 Support

If any step fails:
1. Check the relevant console (Service Worker, Page, Backend)
2. Look for error messages
3. Verify all prerequisites are met
4. Try reloading extension
5. Try restarting backend
6. Check firewall and network settings

---

**Status**: Ready for verification  
**Next Action**: Follow verification steps above

