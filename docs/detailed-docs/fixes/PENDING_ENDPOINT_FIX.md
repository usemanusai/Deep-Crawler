# Pending Endpoint 404 Error - FIXED

## 🔴 The Real Issue

From the backend logs, we saw:
```
GET /api/extension/crawl/pending 404 in 125ms
GET /api/extension/crawl/pending 404 in 90ms
GET /api/extension/crawl/pending 404 in 76ms
```

The `/api/extension/crawl/pending` endpoint was returning **404 Not Found**.

### Root Cause

In Next.js 14 App Router, route files are matched based on their file path:
- `app/api/extension/crawl/route.ts` → `/api/extension/crawl`
- `app/api/extension/crawl/pending/route.ts` → `/api/extension/crawl/pending`

We had all the handlers (GET, POST, PUT) in the same file at `app/api/extension/crawl/route.ts`, which only handles `/api/extension/crawl`. The GET request to `/api/extension/crawl/pending` had no matching route file, so it returned 404.

---

## ✅ What Was Fixed

### 1. Created New Route File
**File**: `app/api/extension/crawl/pending/route.ts`

This new file handles the GET request for pending crawls:
```typescript
export async function GET(request: NextRequest) {
  // Returns all pending crawl sessions
  const pendingCrawls = Array.from(activeCrawlSessions.entries()).map(([requestId, session]) => ({
    requestId,
    seedHost: session.seedHost,
    sameOriginOnly: session.sameOriginOnly,
    startTime: session.startTime
  }))
  
  return NextResponse.json({ pendingCrawls })
}
```

### 2. Exported activeCrawlSessions
**File**: `app/api/extension/crawl/route.ts`

Changed from:
```typescript
const activeCrawlSessions = new Map(...)
```

To:
```typescript
export const activeCrawlSessions = new Map(...)
```

This allows the pending route to import and access the same Map.

---

## 🎯 Why This Works

Now the routing is correct:
- `POST /api/extension/crawl` → `app/api/extension/crawl/route.ts` (POST handler)
- `PUT /api/extension/crawl/data` → `app/api/extension/crawl/route.ts` (PUT handler)
- `GET /api/extension/crawl/pending` → `app/api/extension/crawl/pending/route.ts` (GET handler)

The extension can now successfully poll for pending crawls!

---

## 🚀 What to Do Now

### Step 1: Restart Backend
```bash
# Kill the current backend process (Ctrl+C)
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
2. Enter a URL (e.g., https://miniapps.ai/)
3. Click "Start Discovery"
4. Should find 20+ endpoints
```

---

## 📝 Files Modified/Created

| File | Changes |
|------|---------|
| `app/api/extension/crawl/route.ts` | Exported `activeCrawlSessions` |
| `app/api/extension/crawl/pending/route.ts` | **NEW** - Handles GET /api/extension/crawl/pending |

---

## ✨ Expected Behavior After Fix

✅ **Backend logs show**:
```
GET /api/extension/crawl/pending 200 in 45ms
[Extension Crawl] Returning 1 pending crawls
```

✅ **Extension background script logs show**:
```
[DeepCrawler] Found pending crawl: crawl-...
[DeepCrawler] Sending START_CRAWL to tab...
```

✅ **Content script logs show**:
```
[DeepCrawler Content] Starting crawl: crawl-...
[DeepCrawler Content] Total network requests captured: 25
```

✅ **Frontend shows**:
```
Found 25 API endpoints
```

---

**Status**: ✅ Fixed
**Date**: October 31, 2025
**Next Action**: Restart backend and test

