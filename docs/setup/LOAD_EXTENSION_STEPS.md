# How to Load the DeepCrawler Extension - Step by Step

## ✅ Extension is Now Fixed!

The manifest.json has been corrected. All icon references and deprecated permissions have been removed.

## Step-by-Step Loading Instructions

### Step 1: Start the Backend (if not already running)

Open a terminal and run:

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm install
npm run dev
```

You should see:
```
> deep-crawler-bot@0.1.0 dev
> next dev

  ▲ Next.js 14.2.13
  - Local:        http://localhost:3002
```

**Keep this terminal open!**

### Step 2: Open Chrome Extensions Page

1. Open Google Chrome
2. Click the menu icon (⋮) in the top-right corner
3. Select **More tools** → **Extensions**
4. Or simply go to: `chrome://extensions/`

### Step 3: Enable Developer Mode

1. Look for the **Developer mode** toggle in the top-right corner
2. Click it to enable (it should turn blue)

### Step 4: Load the Extension

1. Click the **Load unpacked** button (appears after enabling Developer mode)
2. A file browser will open
3. Navigate to: `hyperbrowser-app-examples/deep-crawler-bot/extension/`
4. Click **Select Folder**

### Step 5: Verify Extension Loaded

You should see:
- ✅ "DeepCrawler Session Bridge" appears in the extensions list
- ✅ No error messages
- ✅ Extension icon appears in your Chrome toolbar (top-right)

### Step 6: Test the Connection

1. Click the **DeepCrawler extension icon** in your toolbar
2. A popup should appear showing:
   - Status indicator (should show "Disconnected" initially)
   - Backend URL: `http://localhost:3002`
   - Buttons for "Test Connection" and "Settings"

3. Click **🔄 Test Connection**
4. Wait a few seconds
5. You should see: **"✓ Connection test successful"**
6. Status should change to **"🟢 Connected"**

### Step 7: Open DeepCrawler

1. Open a new tab in Chrome
2. Go to: `http://localhost:3002`
3. You should see the DeepCrawler interface
4. At the top, you should see the connection status indicator

## 🎉 Success!

If you see all of the above, the extension is successfully loaded and connected!

## Next: Test Crawling

### To test the extension with a real crawl:

1. **Log in to a website** in Chrome (e.g., GitHub, Twitter, etc.)
2. **Keep that tab open**
3. **Go back to DeepCrawler** at `http://localhost:3002`
4. **Enter the website URL** (e.g., `https://github.com`)
5. **Click "Crawl"**
6. **Watch the progress** in the terminal sidebar
7. **View discovered API endpoints** when complete

The extension will use your authenticated session from step 1!

## ❌ Troubleshooting

### Extension doesn't appear in toolbar

**Solution**:
1. Go to `chrome://extensions/`
2. Find "DeepCrawler Session Bridge"
3. Click the refresh icon next to it
4. Check if icon now appears in toolbar

### "Failed to load extension" error

**Solution**:
1. Verify you selected the correct folder: `extension/` (not `deep-crawler-bot/`)
2. Verify all files exist in the extension folder:
   - manifest.json
   - background.js
   - content.js
   - popup.html, popup.js, popup.css
   - options.html, options.js, options.css
3. Try reloading the extension (refresh icon)

### Connection test fails

**Solution**:
1. Verify backend is running: `npm run dev`
2. Verify backend is at `http://localhost:3002`
3. Check browser console for errors:
   - Right-click extension icon
   - Click "Inspect popup"
   - Go to "Console" tab
   - Look for error messages
4. Check backend logs for errors

### Popup doesn't open

**Solution**:
1. Right-click extension icon
2. Click "Inspect popup"
3. Check the Console tab for errors
4. Reload extension (refresh icon on extensions page)

### Settings don't save

**Solution**:
1. Clear Chrome cache:
   - Press `Ctrl+Shift+Delete`
   - Select "All time"
   - Check "Cookies and other site data"
   - Click "Clear data"
2. Reload extension
3. Try saving settings again

## 📋 Verification Checklist

- [ ] Backend is running at `http://localhost:3002`
- [ ] Extension folder contains all required files
- [ ] Extension appears in `chrome://extensions/`
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking extension icon
- [ ] Connection test succeeds
- [ ] DeepCrawler UI shows connection status
- [ ] Can crawl websites with authenticated sessions

## 🆘 Still Having Issues?

1. **Check the browser console**:
   - Right-click extension icon → "Inspect popup"
   - Go to "Console" tab
   - Share any error messages

2. **Check the backend logs**:
   - Look at the terminal where you ran `npm run dev`
   - Share any error messages

3. **Verify file paths**:
   - Extension should be at: `hyperbrowser-app-examples/deep-crawler-bot/extension/`
   - All files should be directly in this folder (not in subfolders)

4. **Try reloading**:
   - Go to `chrome://extensions/`
   - Click refresh icon next to "DeepCrawler Session Bridge"
   - Try again

## 📞 Getting Help

If you're still stuck:
1. Check `EXTENSION_LOADING_FIX.md` for detailed troubleshooting
2. Check `EXTENSION_SETUP.md` for comprehensive setup guide
3. Check browser console for specific error messages
4. Verify all files are present and readable

---

**Status**: ✅ Extension is ready to load
**Last Updated**: October 31, 2025

