# DeepCrawler Extension - Playwright Testing Guide

## 🎯 Overview

This guide explains how to use Playwright MCP tools to test the DeepCrawler extension end-to-end.

## 🔧 Available Playwright MCP Tools

The Playwright MCP server provides 21 tools for browser automation:

### Navigation Tools
- `browser_navigate` - Navigate to URL
- `browser_navigate_back` - Go back to previous page

### Interaction Tools
- `browser_click` - Click on element
- `browser_type` - Type text into element
- `browser_select_option` - Select dropdown option
- `browser_fill_form` - Fill multiple form fields
- `browser_drag` - Drag and drop
- `browser_hover` - Hover over element

### Inspection Tools
- `browser_snapshot` - Capture accessibility snapshot
- `browser_take_screenshot` - Take screenshot
- `browser_console_messages` - Get console messages
- `browser_evaluate` - Evaluate JavaScript

### Tab Management
- `browser_tabs` - List, create, close, select tabs

### Other Tools
- `browser_wait_for` - Wait for text or time
- `browser_press_key` - Press keyboard key
- `browser_file_upload` - Upload files
- `browser_handle_dialog` - Handle dialogs
- `browser_network_requests` - Get network requests
- `browser_resize` - Resize window
- `browser_close` - Close browser
- `browser_install` - Install browser

## 📋 Testing Workflow

### Phase 1: Verify Extension is Loaded

**Goal**: Confirm extension is loaded in Chrome

**Steps**:
1. Navigate to `chrome://extensions/`
2. Take screenshot
3. Verify "DeepCrawler Session Bridge" appears

**Playwright Code**:
```javascript
await browser_navigate('chrome://extensions/');
await browser_take_screenshot();
```

### Phase 2: Check Service Worker Console

**Goal**: Verify extension is initializing

**Steps**:
1. Navigate to extension details
2. Click "Service Worker" link
3. Get console messages
4. Verify initialization logs

**Playwright Code**:
```javascript
await browser_navigate('chrome://extensions/');
// Click on extension details
// Click Service Worker link
const messages = await browser_console_messages();
```

### Phase 3: Test Network Capture

**Goal**: Verify network interceptor is working

**Steps**:
1. Navigate to test page
2. Check console for "[DeepCrawler]" logs
3. Evaluate `window.__deepcrawlerRequests`
4. Verify array is populated

**Playwright Code**:
```javascript
await browser_navigate('http://localhost:3002/api/test');
const messages = await browser_console_messages();
const requests = await browser_evaluate('() => window.__deepcrawlerRequests');
```

### Phase 4: Start Crawl

**Goal**: Verify crawl flow

**Steps**:
1. Navigate to main UI
2. Enter URL
3. Click "Start Discovery"
4. Wait for results

**Playwright Code**:
```javascript
await browser_navigate('http://localhost:3002');
await browser_fill_form([{
  name: 'URL input',
  type: 'textbox',
  ref: 'input[type="text"]',
  value: 'https://miniapps.ai'
}]);
await browser_click('Start Discovery button', 'button:has-text("Start Discovery")');
await browser_wait_for({text: 'Found', time: 60});
```

### Phase 5: Verify Results

**Goal**: Confirm endpoints were discovered

**Steps**:
1. Take screenshot
2. Get page content
3. Verify endpoints are listed
4. Verify count > 0

**Playwright Code**:
```javascript
await browser_take_screenshot();
const snapshot = await browser_snapshot();
```

## 🧪 Complete Test Script

```javascript
// 1. Navigate to test page
await browser_navigate('http://localhost:3002/api/test');
console.log('✅ Navigated to test page');

// 2. Check for network interceptor logs
const messages = await browser_console_messages();
const deepcrawlerLogs = messages.filter(m => m.includes('[DeepCrawler]'));
console.log(`✅ Found ${deepcrawlerLogs.length} DeepCrawler logs`);

// 3. Check network requests captured
const requests = await browser_evaluate('() => window.__deepcrawlerRequests');
console.log(`✅ Captured ${requests.length} network requests`);

// 4. Navigate to main UI
await browser_navigate('http://localhost:3002');
console.log('✅ Navigated to main UI');

// 5. Enter URL and start crawl
await browser_fill_form([{
  name: 'URL input',
  type: 'textbox',
  ref: 'input[type="text"]',
  value: 'https://miniapps.ai'
}]);
console.log('✅ Entered URL');

await browser_click('Start button', 'button:has-text("Start Discovery")');
console.log('✅ Clicked Start Discovery');

// 6. Wait for results
await browser_wait_for({text: 'Found', time: 60});
console.log('✅ Crawl completed');

// 7. Take screenshot
await browser_take_screenshot();
console.log('✅ Screenshot taken');
```

## 🔍 Debugging with Playwright

### Check Console Messages
```javascript
const messages = await browser_console_messages();
const errors = await browser_console_messages({onlyErrors: true});
```

### Evaluate JavaScript
```javascript
const result = await browser_evaluate('() => {
  return {
    interceptorLoaded: typeof window.__deepcrawlerRequests !== "undefined",
    requestCount: window.__deepcrawlerRequests?.length || 0,
    pageUrl: window.location.href
  };
}');
```

### Get Network Requests
```javascript
const requests = await browser_network_requests();
const putRequests = requests.filter(r => r.method === 'PUT');
```

### Wait for Specific Conditions
```javascript
// Wait for text to appear
await browser_wait_for({text: 'Found'});

// Wait for text to disappear
await browser_wait_for({textGone: 'Waiting'});

// Wait for time
await browser_wait_for({time: 5});
```

## 📊 Expected Test Results

### Phase 1: Extension Loaded
- ✅ Extension appears in chrome://extensions/
- ✅ Status shows "Enabled"

### Phase 2: Service Worker Console
- ✅ Logs show initialization
- ✅ No errors in console

### Phase 3: Network Capture
- ✅ "[DeepCrawler]" logs appear
- ✅ `window.__deepcrawlerRequests` is array
- ✅ Array has 6+ requests

### Phase 4: Crawl Started
- ✅ URL entered successfully
- ✅ "Start Discovery" clicked
- ✅ Progress bar appears

### Phase 5: Results
- ✅ "Found X endpoints" appears
- ✅ Endpoints listed
- ✅ Count > 0

## 🐛 Troubleshooting

### Issue: Extension not loaded
**Check**:
```javascript
await browser_navigate('chrome://extensions/');
const snapshot = await browser_snapshot();
// Look for "DeepCrawler Session Bridge"
```

### Issue: No console logs
**Check**:
```javascript
const messages = await browser_console_messages();
console.log('All messages:', messages);
```

### Issue: No network requests captured
**Check**:
```javascript
const requests = await browser_evaluate('() => window.__deepcrawlerRequests');
console.log('Requests:', requests);
```

### Issue: Crawl not starting
**Check**:
```javascript
const messages = await browser_console_messages();
const errors = messages.filter(m => m.includes('error'));
console.log('Errors:', errors);
```

## 📚 Resources

- Playwright MCP Documentation: See tool descriptions
- DeepCrawler Test Guide: COMPREHENSIVE_TEST_GUIDE.md
- Fix Plan: FINAL_FIX_PLAN.md
- Immediate Actions: ACTION_PLAN_IMMEDIATE.md

## ✨ Next Steps

1. **Reload extension** in Chrome
2. **Run diagnostic**: `node diagnose-issue.js`
3. **Follow test guide**: COMPREHENSIVE_TEST_GUIDE.md
4. **Use Playwright** to automate testing
5. **Report findings** with console output

---

**Status**: Ready for Playwright testing  
**Next Action**: Reload extension and run tests

