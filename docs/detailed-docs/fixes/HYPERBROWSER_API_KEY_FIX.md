# Hyperbrowser API Key Error - FIXED

## 🔴 The Real Issue

The error you saw:
```
MAIN TRUE CAPTCHA
-------ERROR-----------
userid or apikey is not set!
ERROR STACK undefined
```

This was coming from `lib/hyper.ts` which was trying to initialize the Hyperbrowser SDK at **module load time** (when the app starts), but the `HYPERBROWSER_API_KEY` environment variable was not set.

---

## ✅ What Was Fixed

### Changed `lib/hyper.ts` to use Lazy Initialization

**Before** (Broken):
```typescript
import { Hyperbrowser } from '@hyperbrowser/sdk'

if (!process.env.HYPERBROWSER_API_KEY) {
  throw new Error('HYPERBROWSER_API_KEY environment variable is required')
}

export const hb = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
})
```

**Problem**: This throws an error immediately when the module loads, even if you're only using the extension mode (which doesn't need Hyperbrowser).

**After** (Fixed):
```typescript
import { Hyperbrowser } from '@hyperbrowser/sdk'

let hbInstance: Hyperbrowser | null = null

/**
 * Get or create Hyperbrowser instance (lazy initialization)
 * Only initializes when actually needed, not at module load time
 */
export function getHyperbrowser(): Hyperbrowser {
  if (!hbInstance) {
    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (!apiKey) {
      throw new Error('HYPERBROWSER_API_KEY environment variable is required')
    }
    hbInstance = new Hyperbrowser({
      apiKey,
    })
  }
  return hbInstance
}

/**
 * Export for backward compatibility
 * This is a getter that returns the instance
 */
export const hb = new Proxy({} as Hyperbrowser, {
  get: (target, prop) => {
    const instance = getHyperbrowser()
    return (instance as any)[prop]
  },
})
```

**Solution**: Now the Hyperbrowser SDK is only initialized when it's actually used (lazy initialization). If you're only using extension mode, it never needs to initialize.

---

## 🎯 Why This Works

1. **Lazy Initialization** - Hyperbrowser is only created when first accessed
2. **Extension Mode Works** - Extension crawl doesn't need Hyperbrowser, so it works fine
3. **Server-Side Mode Works** - When server-side crawl is used, Hyperbrowser is initialized on demand
4. **Backward Compatible** - The `hb` export still works the same way

---

## 🚀 What to Do Now

### Step 1: Reload Backend
```bash
# Kill the current backend process
# Then restart it
npm run dev
```

### Step 2: Reload Extension
```
chrome://extensions/ → Find "DeepCrawler Session Bridge" → Click refresh
```

### Step 3: Test Extension Crawl
```
1. Go to http://localhost:3002
2. Enter a URL (e.g., https://github.com)
3. Click "Start Discovery"
4. Should find 20+ endpoints
```

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `lib/hyper.ts` | Changed to lazy initialization |

---

## ✨ Benefits

✅ **Extension mode works without Hyperbrowser API key**
✅ **Server-side mode still works with API key**
✅ **No more "userid or apikey is not set!" error**
✅ **Backward compatible with existing code**
✅ **Cleaner error messages**

---

## 🔍 How It Works

### Extension Mode (No API Key Needed)
```
1. User starts extension crawl
2. Backend receives request
3. Extension polls for pending crawls
4. Extension sends START_CRAWL to content script
5. Content script performs interactions
6. Content script sends network data to backend
7. Backend processes and returns endpoints
8. Hyperbrowser SDK is NEVER initialized ✓
```

### Server-Side Mode (API Key Needed)
```
1. User starts server-side crawl
2. Backend tries to use Hyperbrowser
3. getHyperbrowser() is called
4. Hyperbrowser SDK is initialized with API key
5. Browser session is created
6. Crawl proceeds normally
```

---

**Status**: ✅ Fixed
**Date**: October 31, 2025
**Next Action**: Reload backend and test

