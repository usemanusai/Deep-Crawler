# CRITICAL BUG FIX - Network Interception Injection

## Problem
The extension was discovering 0 API endpoints instead of 86 because the network interception script was being injected TWICE:
1. Once via manifest.json at `document_start` (correct)
2. Again via background script at runtime (incorrect)

The second injection was OVERWRITING the first one, creating a new `NETWORK_REQUESTS` array that only captured requests made AFTER the injection, missing all initial page load requests!

## Root Cause
1. **manifest.json** injects `network-interceptor.js` at `document_start` with `world: "MAIN"`
   - This runs BEFORE any page scripts
   - Captures ALL requests from page load onwards
   - Creates `NETWORK_REQUESTS` array in MAIN world

2. **content.js** sends `SETUP_NETWORK_INTERCEPTION` message at startup
   - This triggers background script to inject network interception AFTER page load
   - Creates a NEW `NETWORK_REQUESTS` array in MAIN world
   - Overwrites the manifest injection
   - Only captures requests made AFTER this injection
   - Misses all initial page load requests!

3. **background.js** injects `setupNetworkInterceptionInPage()` when receiving the message
   - Saves current `window.fetch` (which is the manifest-injected one)
   - Creates new interceptors with a NEW `NETWORK_REQUESTS` array
   - This new array is separate from the manifest-injected one
   - Content script receives messages from the NEW array, not the manifest one

## Solution
**REMOVED** the double injection:

### Fix 1: content.js (Line 8-14)
**Before:**
```javascript
try {
  chrome.runtime?.sendMessage?.({ type: 'SETUP_NETWORK_INTERCEPTION' }, (resp) => {
    console.log('[DeepCrawler Content] Requested MAIN-world interception injection');
  });
} catch (e) {
  console.warn('[DeepCrawler Content] Failed to request interception injection', e);
}
```

**After:**
```javascript
// CRITICAL FIX: Do NOT request MAIN-world interception injection from background!
// The manifest.json already injects network-interceptor.js at document_start with world: "MAIN"
console.log('[DeepCrawler Content] Network interception already injected via manifest.json at document_start');
```

### Fix 2: background.js (Line 813-840)
**Before:**
```javascript
try {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: setupNetworkInterceptionInPage,
    world: 'MAIN'
  }, () => {
    // ... injection logic ...
    sendMessage();
  });
} catch (e) {
  sendMessage();
}
```

**After:**
```javascript
// CRITICAL FIX: Do NOT inject network interception here!
// The manifest.json already injects network-interceptor.js at document_start with world: "MAIN"
console.log('[DeepCrawler] Network interception already injected via manifest.json at document_start');
sendMessage();
```

### Fix 3: background.js (Line 625-645)
**Updated message handler** to log warning if called (for backward compatibility):
```javascript
if (message.type === 'SETUP_NETWORK_INTERCEPTION' || message.type === 'INJECT_NETWORK_INTERCEPTION') {
  console.warn('[DeepCrawler] DEPRECATED: Received SETUP_NETWORK_INTERCEPTION request');
  console.warn('[DeepCrawler] Network interception should already be injected via manifest.json');
  sendResponse({ success: false, error: 'Network interception already injected via manifest.json' });
  return true;
}
```

## Result
✅ Network interception now runs ONLY via manifest.json at `document_start`
✅ Single `NETWORK_REQUESTS` array in MAIN world
✅ Captures ALL requests from page load onwards
✅ Content script receives all network requests
✅ Extension should now discover 86 endpoints from miniapps.ai

## Testing
1. Reload extension (chrome://extensions/)
2. Navigate to https://miniapps.ai
3. Open DevTools Console
4. Type: `window.__deepcrawlerRequests.length`
5. Should return > 0 (number of captured requests)
6. Go to http://localhost:3002
7. Click "Start Discovery"
8. Should discover 86 endpoints

## Files Modified
- `extension/content.js` - Removed SETUP_NETWORK_INTERCEPTION request
- `extension/background.js` - Removed runtime injection, updated message handler

