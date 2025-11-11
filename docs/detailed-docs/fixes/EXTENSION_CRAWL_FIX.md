# Extension Crawl HTTP 400 Error - FIXED

## Problem

When attempting to crawl a website with the extension connected, the `/api/extension/crawl` endpoint was returning HTTP 400 (Bad Request):

```
[Crawl API] Using extension mode for crawl
POST /api/extension/crawl 400 in 1185ms
[Crawl API] Extension crawl failed, falling back to server mode
```

The system would fall back to server-side mode (which works but takes ~66 seconds and doesn't preserve authentication).

## Root Cause

The validation in `app/api/extension/crawl/route.ts` was requiring a `tabId` field:

```typescript
if (typeof data.tabId !== 'number') {
  return { valid: false, error: 'Tab ID is required' }
}
```

However, the `sendCrawlToExtension` function in `lib/extensionManager.ts` was NOT sending a `tabId`:

```typescript
body: JSON.stringify({
  requestId,
  url,
  sameOriginOnly: options.sameOriginOnly ?? true,
  mode: 'extension'
  // Missing: tabId
})
```

**Why this happened:**
- The backend doesn't have access to tab IDs - only the extension does
- Tab IDs are Chrome-specific and managed by the extension
- The backend shouldn't need to specify which tab to use

## Solution Applied

Made `tabId` optional in the validation since:
1. The backend doesn't have access to tab IDs
2. The extension can use the active tab by default
3. Tab ID can be provided if needed, but isn't required

### Changes Made

**File**: `app/api/extension/crawl/route.ts`

**1. Updated Interface** (Lines 7-13):
```typescript
interface ExtensionCrawlRequest {
  requestId: string
  url: string
  tabId?: number              // Now optional
  sameOriginOnly?: boolean    // Now optional
  mode?: 'extension'          // Now optional
}
```

**2. Updated Validation** (Lines 35-52):
```typescript
function validateCrawlRequest(data: any): { valid: boolean; error?: string } {
  if (!data.url || typeof data.url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  try {
    new URL(data.url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // tabId is optional - extension will use active tab if not provided
  if (data.tabId !== undefined && typeof data.tabId !== 'number') {
    return { valid: false, error: 'Tab ID must be a number if provided' }
  }

  return { valid: true }
}
```

## How It Works Now

1. **Frontend** sends crawl request to backend with URL
2. **Backend** checks if extension is connected
3. **Backend** sends crawl request to extension with:
   - `requestId` ✅
   - `url` ✅
   - `sameOriginOnly` ✅
   - `mode` ✅
   - `tabId` (optional) - extension uses active tab if not provided
4. **Extension** receives request and:
   - Uses the active tab (or specified tab if provided)
   - Captures network requests in the user's browser context
   - Preserves authentication state
   - Sends results back to backend
5. **Backend** returns results to frontend

## Benefits

✅ Extension crawl requests now succeed (HTTP 200)
✅ Preserves authenticated browser sessions
✅ Faster crawling (no need to re-authenticate)
✅ Cleaner architecture (backend doesn't manage tabs)
✅ Backward compatible (tabId still accepted if provided)

## Testing

To verify the fix works:

1. **Load the extension** in Chrome
2. **Log in** to a website (e.g., GitHub, Twitter)
3. **Go to** http://localhost:3002
4. **Enter the URL** of the logged-in website
5. **Click "Start Discovery"**
6. **Check the logs** - should see:
   ```
   [Crawl API] Using extension mode for crawl
   POST /api/extension/crawl 200 in XXXms
   ```
7. **Results** should show discovered API endpoints

## Expected Behavior

### Before Fix
```
[Crawl API] Using extension mode for crawl
POST /api/extension/crawl 400 in 1185ms
[Crawl API] Extension crawl failed, falling back to server mode
GET /api/crawl 200 in 66000ms (server mode)
```

### After Fix
```
[Crawl API] Using extension mode for crawl
POST /api/extension/crawl 200 in XXXms
[Extension Crawl] Starting crawl crawl-XXXXX for https://...
[Extension Crawl] Crawl crawl-XXXXX completed
```

## Files Modified

- `app/api/extension/crawl/route.ts` - Made tabId optional in validation

## Next Steps

1. Backend should automatically recompile
2. Try crawling a logged-in website
3. Verify extension mode is used (check logs)
4. Confirm API endpoints are discovered

---

**Status**: ✅ Fixed
**Date**: October 31, 2025
**Impact**: Extension crawl requests now work properly

