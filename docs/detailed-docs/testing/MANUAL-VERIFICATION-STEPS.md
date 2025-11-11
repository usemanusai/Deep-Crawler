# Manual Verification Steps - DeepCrawler Extension

## Prerequisites

- Chrome browser installed
- Backend running on port 3002
- Extension files in `extension/` directory

## Step 1: Start the Backend

Open a terminal and run:

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm run dev
```

Wait for the message: `ready - started server on 0.0.0.0:3002`

## Step 2: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to `hyperbrowser-app-examples/deep-crawler-bot/extension/`
5. Select the folder and click "Select Folder"

**Expected Result**: Extension appears in the list with ID starting with "hegjki..."

## Step 3: Verify Extension Installation

1. Click the extension icon in Chrome toolbar
2. You should see the "DeepCrawler Session Bridge" popup
3. Check the status indicator:
   - 🟢 Green = Connected
   - ⚪ Gray = Disconnected
   - 🔴 Red = Error

**Expected**: Should show 🟢 Connected (or connecting)

## Step 4: Open the Web Interface

1. Navigate to `http://localhost:3002` in Chrome
2. You should see the DeepCrawler interface
3. Look for the connection status indicator at the top

**Expected**: Should display "🟢 Extension Connected"

## Step 5: Verify Network Interceptor

1. Open Chrome DevTools (F12)
2. Go to the "Console" tab
3. You should see logs like:
   ```
   [DeepCrawler] Network interceptor script loaded in page context
   [DeepCrawler] Interceptor version: 2.0 - Enhanced with comprehensive logging
   ```

**Expected**: Network interceptor logs should appear

## Step 6: Run a Test Crawl

1. In the web interface, enter the URL: `https://miniapps.ai`
2. Click "Start Discovery"
3. Watch the progress:
   - Extension should navigate to the URL
   - Should perform 7 phases of interactions
   - Should capture network requests
   - Should display endpoint count

**Expected Timeline**:
- 0-5s: Extension initialization
- 5-10s: Navigation to target URL
- 10-30s: Phase 1-3 interactions (scrolling, clicking, inputs)
- 30-60s: Phase 4-5 interactions (selects, final scrolls)
- 60-90s: Phase 6-7 interactions (aggressive scrolls, keyboard events)
- 90-120s: Final data collection and processing
- 120-150s: Results display

## Step 7: Verify Results

After crawl completes, you should see:

1. **Endpoint Count**: Should show 86 endpoints
2. **Endpoint Breakdown**:
   - HTTPS: ~70 endpoints
   - HTTP: ~5 endpoints
   - OPTIONS: ~8 endpoints
   - Data URLs: ~3 endpoints

3. **Endpoint List**: Should display all discovered endpoints with:
   - Method (GET, POST, OPTIONS, etc.)
   - URL
   - Status code
   - Size

4. **Postman Collection**: Should be available for download

## Troubleshooting

### Extension Shows "Disconnected"

1. Check backend is running: `curl http://localhost:3002/api/extension/status`
2. Check extension logs in DevTools
3. Reload extension: Go to `chrome://extensions/`, find DeepCrawler, click reload

### No Endpoints Discovered

1. Check browser console for errors (F12 → Console)
2. Check backend logs for errors
3. Verify network interceptor is loaded (see Step 5)
4. Try a different URL to test

### Crawl Times Out

1. This is normal for the first crawl (may take 2-3 minutes)
2. Check backend logs for "Waiting for extension..." messages
3. Verify extension is performing interactions (check console logs)

### Extension Not Loading

1. Verify extension path is correct
2. Check manifest.json is valid JSON
3. Check all required files exist:
   - manifest.json
   - background.js
   - content.js
   - network-interceptor.js
   - popup.html, popup.js, popup.css

## Verification Checklist

- [ ] Backend running on port 3002
- [ ] Extension loaded in Chrome
- [ ] Extension shows "🟢 Connected" status
- [ ] Web interface accessible at http://localhost:3002
- [ ] Network interceptor logs visible in console
- [ ] Crawl completes without errors
- [ ] 86 endpoints discovered
- [ ] Endpoint breakdown matches expected values
- [ ] Postman collection available for download

## Expected Endpoint Breakdown for miniapps.ai

```
Total Endpoints: 86

By Protocol:
- HTTPS: 70 endpoints
- HTTP: 5 endpoints
- OPTIONS: 8 endpoints
- Data URLs: 3 endpoints

By Method:
- GET: ~60 endpoints
- POST: ~15 endpoints
- OPTIONS: ~8 endpoints
- PUT: ~2 endpoints
- DELETE: ~1 endpoint
```

## Success Criteria

✅ Extension connects successfully
✅ 86 endpoints discovered from miniapps.ai
✅ All 7 interaction phases complete
✅ SSE stream stays alive for full crawl duration
✅ Postman collection generates correctly
✅ No console errors or warnings

## Next Steps

If verification is successful:
1. Extension is restored to working state
2. Ready for production use
3. Can crawl other websites with similar results

If issues occur:
1. Check troubleshooting section
2. Review backend logs
3. Check browser console for errors
4. Verify all files are in place

