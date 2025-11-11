# Action Plan - Extension Loading and Testing

## 🎯 Objective

Load the DeepCrawler extension in Chrome and verify it connects to the backend, then test the complete crawl flow.

## ✅ What's Been Fixed

1. ✅ **Hyperbrowser Constructor Error** - Fixed in `app/api/crawl/route.ts`
2. ✅ **Extension Code** - Verified correct and ready
3. ✅ **Backend Code** - Verified correct and ready
4. ✅ **Documentation** - Created comprehensive guides

## 📋 Step-by-Step Action Plan

### Phase 1: Prepare Environment (5 minutes)

#### Step 1.1: Ensure Dev Server is Running
```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm run dev:clean
```

**Expected Output**:
```
🔍 Checking port 3002...
✓ Port 3002 is free

🚀 Starting Next.js development server on port 3002...

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3002
  - Environments: .env.local

✓ Ready in 2.5s
```

#### Step 1.2: Verify Backend is Responding
```bash
curl -s http://localhost:3002/api/extension/status \
  -H "X-Extension-Key: deepcrawler-extension-v1"
```

**Expected Output**:
```json
{
  "status": "disconnected",
  "version": "1.0.0",
  "timestamp": "2025-10-31T...",
  "backend": "deepcrawler-v1",
  "lastHeartbeatMs": null
}
```

---

### Phase 2: Load Extension in Chrome (5 minutes)

#### Step 2.1: Open Chrome Extensions Page
1. Open Chrome browser
2. Go to: `chrome://extensions/`
3. You should see a page with installed extensions

#### Step 2.2: Enable Developer Mode
1. Look for "Developer mode" toggle in top right
2. Click to enable it
3. You should see new buttons appear: "Load unpacked", "Pack extension", etc.

#### Step 2.3: Load Unpacked Extension
1. Click "Load unpacked" button
2. Navigate to: `hyperbrowser-app-examples/deep-crawler-bot/extension/`
3. Click "Select Folder"
4. Extension should appear in the list

#### Step 2.4: Verify Extension Loaded
Look for "DeepCrawler Session Bridge" in the extensions list:
- ✅ Extension name: "DeepCrawler Session Bridge"
- ✅ Version: "1.0.0"
- ✅ Toggle: Blue (enabled)
- ✅ Status: "Errors" or "Details" link (if any issues)

---

### Phase 3: Verify Connection (5 minutes)

#### Step 3.1: Open Service Worker Console
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click "Service Worker" link (under the extension name)
4. A new window opens with the service worker console

#### Step 3.2: Check for Connection Logs
Look for these logs in the console:
```
[DeepCrawler] Extension installed
[DeepCrawler] Settings loaded
[DeepCrawler] Initializing connection to backend...
[DeepCrawler] Backend URL: http://localhost:3002
[DeepCrawler] API Key: deepcrawler-extension-v1
[DeepCrawler] Starting heartbeat immediately...
[DeepCrawler] Connected to backend
```

**If You See Errors**:
- Check the error message
- Common errors:
  - `Failed to fetch` - Backend not running
  - `CORS error` - Backend CORS issue
  - `TypeError` - JavaScript error

#### Step 3.3: Check Dev Server Logs
In the terminal where dev server is running, look for:
```
[Extension API] /ping received
[Extension API] /status { connected: true, lastHeartbeatMs: 1762550213054 }
```

#### Step 3.4: Run Connection Test (Optional)
```bash
node test-extension-connection.js
```

**Expected Output**:
```
🔍 Extension Connection Test
============================

Backend URL: http://localhost:3002
API Key: deepcrawler-extension-v1
Check Interval: 5000ms
Max Checks: 12

[5s] Check #1:
  Status: disconnected
  Connected: ❌ NO
  Last Heartbeat: Never

[10s] Check #2:
  Status: connected
  Connected: ✅ YES
  Last Heartbeat: 2025-10-31T...

✅ SUCCESS: Extension is connected!
```

---

### Phase 4: Test Crawl Flow (5 minutes)

#### Step 4.1: Open Web Interface
1. Open browser
2. Go to: `http://localhost:3002`
3. You should see the DeepCrawler interface

#### Step 4.2: Enter Test URL
1. In the URL input field, enter: `http://localhost:3002/api/test`
2. Leave other settings as default
3. Click "Start Discovery"

#### Step 4.3: Monitor Crawl Progress
1. Watch the progress bar
2. Check service worker console for logs:
   ```
   [DeepCrawler] Found pending crawl: crawl-123
   [DeepCrawler] Sending START_CRAWL to tab
   [DeepCrawler] Captured request: GET /api/test/users
   ```

#### Step 4.4: Verify Results
1. Crawl should complete in 10-30 seconds
2. Should show discovered endpoints:
   - GET /api/test/users
   - GET /api/test/posts
   - GET /api/test/comments
   - POST /api/test/users
   - PUT /api/test/users/1
   - DELETE /api/test/users/1

3. Should NOT show "0 results"

---

### Phase 5: Troubleshooting (If Needed)

#### Issue: Extension Not Appearing in chrome://extensions/

**Solution**:
1. Make sure you selected the correct folder: `extension/`
2. Check that `manifest.json` exists in that folder
3. Try loading again

#### Issue: Service Worker Shows Errors

**Solution**:
1. Check the error message
2. If "Failed to fetch":
   - Verify dev server is running
   - Check backend URL is correct
3. If "TypeError":
   - Reload extension
   - Check browser console for details

#### Issue: No Heartbeat Requests in Dev Server Logs

**Solution**:
1. Check service worker console for errors
2. Reload extension
3. Check that backend is running on port 3002
4. Try restarting dev server

#### Issue: Crawl Returns 0 Results

**Solution**:
1. Check service worker console for errors
2. Check that test page is making network requests
3. Verify network interceptor is working
4. Try reloading extension

---

## 📊 Expected Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Prepare Environment | 5 min | ⏳ |
| 2 | Load Extension | 5 min | ⏳ |
| 3 | Verify Connection | 5 min | ⏳ |
| 4 | Test Crawl | 5 min | ⏳ |
| 5 | Troubleshoot (if needed) | 10 min | ⏳ |
| **Total** | | **20-30 min** | ⏳ |

---

## ✅ Success Criteria

- [x] Dev server running on port 3002
- [ ] Extension loaded in chrome://extensions/
- [ ] Service worker console shows connection logs
- [ ] Dev server logs show `/ping` requests
- [ ] Dev server logs show `connected: true`
- [ ] Crawl returns endpoints instead of 0 results
- [ ] Network requests captured correctly

---

## 📞 Support

If you get stuck:

1. **Check `EXTENSION_DEBUG_GUIDE.md`** for detailed debugging
2. **Check service worker console** for error messages
3. **Check dev server logs** for backend errors
4. **Run `test-extension-connection.js`** to verify connection
5. **Reload extension** and try again

---

## 🎉 Next Steps After Success

Once extension is connected and crawls work:

1. Test with different URLs
2. Test with authenticated sessions
3. Test with different API endpoints
4. Deploy to production (if ready)

---

**Status**: Ready for Extension Loading
**Last Updated**: October 31, 2025
**Estimated Time**: 20-30 minutes

