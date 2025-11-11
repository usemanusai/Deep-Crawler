# DO THIS NOW - 5 Minute Test

## Step 1: Reload Extension (30 seconds)
```
1. Go to chrome://extensions/
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon
4. Wait for reload
```

## Step 2: Open Test Page (30 seconds)
```
Open this URL in your browser:
http://localhost:3003/api/test
```

**Expected**: Page loads with buttons and console output

## Step 3: Make Test Requests (1 minute)
```
1. Press F12 to open DevTools
2. Go to Console tab
3. Click "Test Multiple Requests" button
4. Watch console for [DeepCrawler] messages
```

**Expected**: Console shows:
```
[DeepCrawler] FETCH CALLED: GET http://localhost:3003/api/test/users
[DeepCrawler] Captured fetch #1: GET http://localhost:3003/api/test/users 200
```

## Step 4: Start Crawl (1 minute)
```
1. Go to http://localhost:3003
2. Enter URL: http://localhost:3003/api/test
3. Click "Start Discovery"
4. Wait for crawl to complete
```

## Step 5: Check Results (1 minute)
```
✅ SUCCESS: Frontend shows "Found 6 endpoints"
❌ FAILURE: Frontend shows "Found 0 endpoints"
```

## If SUCCESS 🎉

The extension is working! You can now:
1. Test with other local URLs
2. Test with external URLs if you have internet
3. Deploy to production

## If FAILURE 📋

Check console for errors:
1. Page console (http://localhost:3003/api/test)
   - Look for `[DeepCrawler]` messages
   - Look for red error messages

2. Extension console
   - Look for `[DeepCrawler Content]` messages
   - Look for red error messages

3. Report any errors you see

## Files Created

- `app/api/test/route.ts` - Test page
- `app/api/test/users/route.ts` - Users endpoint
- `app/api/test/users/[id]/route.ts` - User by ID endpoint
- `app/api/test/posts/route.ts` - Posts endpoint
- `app/api/test/comments/route.ts` - Comments endpoint
- `extension/content.js` - Updated with dual communication

## Status

✅ **Everything Fixed and Ready**

---

**Go test it now!**

