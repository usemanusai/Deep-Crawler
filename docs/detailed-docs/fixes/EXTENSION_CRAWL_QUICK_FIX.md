# Extension Crawl HTTP 400 Error - Quick Fix Summary

## What Was Wrong

Extension crawl requests were returning HTTP 400 and falling back to server mode:
```
POST /api/extension/crawl 400 in 1185ms
[Crawl API] Extension crawl failed, falling back to server mode
```

## Two Issues Fixed

### Issue 1: Missing tabId Field
**Problem**: Backend validation required `tabId` but extension manager wasn't sending it
**Fix**: Made `tabId` optional in validation (backend doesn't have access to tab IDs)
**File**: `app/api/extension/crawl/route.ts`

### Issue 2: SSE Stream Not Parsed
**Problem**: Extension tried to parse SSE stream as JSON
**Fix**: Added proper SSE stream parsing with ReadableStream API
**File**: `extension/background.js`

## What Changed

### Backend (1 file)
```typescript
// app/api/extension/crawl/route.ts
// Made tabId optional in validation
if (data.tabId !== undefined && typeof data.tabId !== 'number') {
  return { valid: false, error: 'Tab ID must be a number if provided' }
}
```

### Extension (1 file)
```javascript
// extension/background.js
// Added SSE stream parsing
const reader = response.body.getReader();
const decoder = new TextDecoder();
// ... parse SSE events ...
```

## How to Test

1. **Reload extension** in Chrome (chrome://extensions/ → refresh)
2. **Log in** to a website
3. **Go to** http://localhost:3002
4. **Enter URL** and click "Start Discovery"
5. **Check logs** - should see:
   ```
   POST /api/extension/crawl 200 in XXXms
   [Extension Crawl] Starting crawl...
   ```

## Expected Result

✅ Extension crawl requests return HTTP 200
✅ SSE stream properly parsed
✅ Progress updates shown in real-time
✅ API endpoints discovered with authentication preserved
✅ No fallback to server mode

## Files Modified

- `app/api/extension/crawl/route.ts` - Validation fix
- `extension/background.js` - SSE parsing fix

---

**Status**: ✅ Fixed
**Impact**: Extension crawling now works properly

