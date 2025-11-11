# DeepCrawler Extension - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Start Backend (30 seconds)

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm run dev
```

Expected output:
```
> next dev
  ▲ Next.js 15.1.0
  - Local:        http://localhost:3002
```

### Step 2: Load Extension in Chrome (2 minutes)

1. **Open Chrome**
2. **Go to**: `chrome://extensions/`
3. **Enable**: "Developer mode" (top-right toggle)
4. **Click**: "Load unpacked"
5. **Select**: `hyperbrowser-app-examples/deep-crawler-bot/extension`
6. **Verify**: "DeepCrawler Session Bridge" appears in list

### Step 3: Verify Connection (1 minute)

**Option A: Check Service Worker Console**
1. Find "DeepCrawler Session Bridge" in extensions list
2. Click "Service Worker" link
3. Look for logs starting with "[DeepCrawler]"
4. Should see: "Heartbeat successful"

**Option B: Run Test Script**
```bash
# In new terminal
cd hyperbrowser-app-examples/deep-crawler-bot
node test-extension-load.js
```

Expected output:
```
✅ Extension is already connected!
```

### Step 4: Test Crawl (1 minute)

1. **Open**: `http://localhost:3002`
2. **Enter URL**: `https://miniapps.ai`
3. **Click**: "Start Discovery"
4. **Wait**: 30-60 seconds
5. **Result**: Should show "Found 10+ API endpoints"

## ✅ Success Checklist

- [ ] Backend running on port 3002
- [ ] Extension loaded in Chrome
- [ ] Extension shows as "Enabled"
- [ ] Service Worker console shows heartbeat logs
- [ ] test-extension-load.js shows "connected"
- [ ] Crawl completes with 10+ endpoints

## 🐛 Quick Troubleshooting

### Extension Not Appearing
```
→ Verify path: hyperbrowser-app-examples/deep-crawler-bot/extension
→ Check manifest.json exists
→ Refresh extensions page (F5)
```

### No Heartbeat Logs
```
→ Verify backend is running (npm run dev)
→ Check BACKEND_URL in background.js
→ Try reloading extension (toggle off/on)
```

### Crawl Returns 0 Endpoints
```
→ Verify extension is connected
→ Check network capture: window.__deepcrawlerRequests
→ Try different URL with more API endpoints
```

## 📚 Detailed Guides

- **Loading Extension**: See `EXTENSION_LOADING_GUIDE.md`
- **Debugging**: See `SYSTEM_ARCHITECTURE_AND_DEBUGGING.md`
- **Verification**: See `FINAL_VERIFICATION_SCRIPT.md`
- **Architecture**: See `SYSTEM_ARCHITECTURE_AND_DEBUGGING.md`

## 🎯 Expected Results

### After Loading Extension
```
✅ Extension Connected
✅ Heartbeat Sending (every 30 seconds)
✅ Polling Active (every 2 seconds)
```

### After Running Crawl
```
✅ Tab Created with URL
✅ Network Requests Captured (6+)
✅ Data Sent to Backend
✅ Endpoints Discovered (10+)
```

## 📞 Need Help?

1. Check Service Worker console for errors
2. Check backend logs for API errors
3. Read `SYSTEM_ARCHITECTURE_AND_DEBUGGING.md`
4. Run `node test-extension-load.js`
5. Verify all prerequisites are met

---

**Status**: Ready to use  
**Next Action**: Follow 5-minute setup above

