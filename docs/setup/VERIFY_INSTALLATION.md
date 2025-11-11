# Installation Verification Checklist

Verify that all extension components are properly installed and configured.

## File Structure Verification

### Extension Files

- [ ] `extension/manifest.json` - Extension configuration
- [ ] `extension/background.js` - Service worker (218 lines)
- [ ] `extension/content.js` - Content script (237 lines)
- [ ] `extension/popup.html` - Popup UI
- [ ] `extension/popup.js` - Popup logic
- [ ] `extension/popup.css` - Popup styling
- [ ] `extension/options.html` - Settings page
- [ ] `extension/options.js` - Settings logic
- [ ] `extension/options.css` - Settings styling
- [ ] `extension/README.md` - Extension documentation

### Backend API Routes

- [ ] `app/api/extension/status/route.ts` - Status endpoint
- [ ] `app/api/extension/ping/route.ts` - Heartbeat endpoint
- [ ] `app/api/extension/crawl/route.ts` - Crawl endpoint
- [ ] `app/api/crawl/route.ts` - Updated with extension support

### Frontend Components

- [ ] `components/ConnectionStatus.tsx` - Status indicator
- [ ] `components/SettingsPanel.tsx` - Settings modal
- [ ] `components/Navbar.tsx` - Updated with settings button
- [ ] `app/page.tsx` - Updated with extension integration

### Utilities

- [ ] `lib/extensionManager.ts` - Extension connection management

### Tests

- [ ] `__tests__/extensionManager.test.ts` - Unit tests
- [ ] `__tests__/api.integration.test.ts` - Integration tests

### Documentation

- [ ] `QUICKSTART.md` - Quick start guide
- [ ] `EXTENSION_SETUP.md` - Detailed setup guide
- [ ] `TESTING_CHECKLIST.md` - Testing procedures
- [ ] `DEPLOYMENT.md` - Production deployment
- [ ] `ARCHITECTURE.md` - System architecture
- [ ] `IMPLEMENTATION_SUMMARY.md` - Implementation overview
- [ ] `VERIFY_INSTALLATION.md` - This file

## Backend Verification

### Start Backend

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm install
npm run dev
```

Expected output:
```
> deep-crawler-bot@0.1.0 dev
> next dev

  ▲ Next.js 14.2.13
  - Local:        http://localhost:3002
```

### Test API Endpoints

```bash
# Test status endpoint
curl -X GET http://localhost:3002/api/extension/status \
  -H "X-Extension-Key: deepcrawler-extension-v1"

# Expected response:
# {"status":"connected","version":"1.0.0","timestamp":"...","backend":"deepcrawler-v1"}

# Test ping endpoint
curl -X POST http://localhost:3002/api/extension/ping \
  -H "X-Extension-Key: deepcrawler-extension-v1"

# Expected response:
# {"status":"pong","timestamp":"..."}
```

## Extension Verification

### Load Extension

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select `hyperbrowser-app-examples/deep-crawler-bot/extension/`
6. Click "Select Folder"

### Verify Extension Loaded

- [ ] Extension appears in toolbar
- [ ] Extension icon is visible
- [ ] Extension name is "DeepCrawler"
- [ ] No errors in extension details page

### Test Popup

1. Click extension icon
2. Popup should open with:
   - [ ] Status indicator (should show "🟢 Connected" or "⚪ Disconnected")
   - [ ] Backend URL display
   - [ ] Current tab information
   - [ ] Settings button
   - [ ] Test Connection button
   - [ ] Activity logs section

### Test Settings

1. Click extension icon → "⚙️ Settings"
2. Settings page should open with:
   - [ ] Backend URL field (default: http://localhost:3002)
   - [ ] Extension API Key field (default: deepcrawler-extension-v1)
   - [ ] Mode selection (Auto/Extension/Server)
   - [ ] Advanced options
   - [ ] Data collection options
   - [ ] Save and Reset buttons

### Test Connection

1. Click extension icon
2. Click "🔄 Test Connection"
3. Should see "✓ Connection test successful" in logs
4. Status should change to "🟢 Connected"

## Frontend Verification

### Start Frontend

Backend should already be running from previous step.

### Verify UI Components

1. Open `http://localhost:3002` in browser
2. Should see:
   - [ ] Connection status indicator at top
   - [ ] Settings button in navbar
   - [ ] DeepCrawler title and description
   - [ ] URL input form
   - [ ] Progress bar
   - [ ] Terminal sidebar

### Test Settings Panel

1. Click "Settings" button in navbar
2. Settings modal should open with:
   - [ ] Crawling mode options
   - [ ] Backend URL field
   - [ ] Extension API Key field
   - [ ] Save and Close buttons

### Test Crawling

1. Enter a URL (e.g., https://example.com)
2. Click "Crawl"
3. Should see:
   - [ ] Progress bar updating
   - [ ] Terminal logs appearing
   - [ ] Results displayed when complete

## Security Verification

- [ ] API key is validated on every request
- [ ] Invalid API keys are rejected (401 response)
- [ ] URLs are validated before processing
- [ ] No sensitive data in console logs
- [ ] Content Security Policy is enforced
- [ ] HTTPS ready for production

## Performance Verification

- [ ] Popup opens in < 500ms
- [ ] Settings page loads in < 500ms
- [ ] Connection check completes in < 100ms
- [ ] No console errors or warnings
- [ ] No memory leaks detected

## Browser Compatibility

- [ ] Works in Chrome 88+
- [ ] Works in Chromium-based browsers
- [ ] Responsive on different screen sizes
- [ ] Works with dark mode

## Documentation Verification

- [ ] QUICKSTART.md is complete and accurate
- [ ] EXTENSION_SETUP.md covers all setup steps
- [ ] TESTING_CHECKLIST.md is comprehensive
- [ ] DEPLOYMENT.md covers production deployment
- [ ] ARCHITECTURE.md explains system design
- [ ] Code comments are clear and helpful

## Final Checklist

- [ ] All files are present
- [ ] Backend starts without errors
- [ ] API endpoints respond correctly
- [ ] Extension loads without errors
- [ ] Popup displays correctly
- [ ] Settings work properly
- [ ] Connection test succeeds
- [ ] Crawling works with extension
- [ ] Fallback to server mode works
- [ ] All documentation is complete
- [ ] No security vulnerabilities
- [ ] Performance is acceptable

## Troubleshooting

### Extension not loading?

1. Check `chrome://extensions/` for errors
2. Verify all files are present in extension folder
3. Check manifest.json syntax
4. Reload extension (refresh icon)

### Backend not responding?

1. Verify backend is running: `npm run dev`
2. Check backend logs for errors
3. Verify port 3002 is available
4. Check firewall settings

### Connection test failing?

1. Verify backend is running
2. Check API key matches
3. Verify backend URL is correct
4. Check browser console for errors

### Crawling not working?

1. Verify extension is connected
2. Check that you're logged in to the website
3. Try a different website
4. Check browser console for errors
5. Check backend logs

## Sign-off

- [ ] All verifications passed
- [ ] Ready for development
- [ ] Ready for testing
- [ ] Ready for deployment

**Verified by**: _______________
**Date**: _______________
**Notes**: _______________

