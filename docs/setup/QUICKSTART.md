# DeepCrawler Extension - Quick Start Guide

Get the extension up and running in 5 minutes.

## Prerequisites

- Chrome browser (version 88+)
- DeepCrawler backend running locally
- Node.js 18+ (for development)

## Installation (5 minutes)

### Step 1: Start the Backend

```bash
cd hyperbrowser-app-examples/deep-crawler-bot
npm install
npm run dev
```

Backend will be available at `http://localhost:3002`

### Step 2: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Navigate to `hyperbrowser-app-examples/deep-crawler-bot/extension/`
5. Click "Select Folder"

✅ Extension is now loaded!

### Step 3: Verify Connection

1. Click the DeepCrawler extension icon in your toolbar
2. Click "🔄 Test Connection"
3. You should see "✓ Connection test successful"
4. Status indicator should show "🟢 Connected"

✅ Extension is connected!

## First Crawl (2 minutes)

### Step 1: Log In to a Website

1. Open any website in Chrome (e.g., GitHub, Twitter, etc.)
2. Log in with your credentials
3. Keep the tab open

### Step 2: Open DeepCrawler

1. Go to `http://localhost:3002` in a new tab
2. You should see the connection status at the top

### Step 3: Start Crawling

1. Enter the website URL (e.g., `https://github.com`)
2. Click "Crawl"
3. Watch the progress in the terminal sidebar
4. View discovered API endpoints

✅ You've successfully crawled with authenticated session!

## Configuration (Optional)

### Change Backend URL

1. Click extension icon → "⚙️ Settings"
2. Update "Backend URL" field
3. Click "💾 Save"

### Change Crawling Mode

1. Click extension icon → "⚙️ Settings"
2. Select desired mode:
   - **Auto**: Use extension if available (recommended)
   - **Extension Only**: Fail if extension unavailable
   - **Server-side Only**: Always use Hyperbrowser backend
3. Click "💾 Save"

## Troubleshooting

### Extension not connecting?

```bash
# 1. Verify backend is running
curl http://localhost:3002/api/extension/status \
  -H "X-Extension-Key: deepcrawler-extension-v1"

# 2. Check browser console (F12 → Console)
# 3. Reload extension (chrome://extensions/ → refresh icon)
```

### No API endpoints discovered?

1. Ensure you're logged in to the website
2. Try a different website
3. Check browser console for errors
4. Verify network requests are being captured

### Settings not saving?

1. Clear browser cache
2. Reload extension
3. Try resetting to defaults in settings

## Next Steps

- 📖 Read [EXTENSION_SETUP.md](./EXTENSION_SETUP.md) for detailed setup
- 🏗️ Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- 🧪 Read [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for testing
- 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment

## Common Tasks

### View Extension Logs

1. Right-click extension icon
2. Click "Inspect popup"
3. Go to Console tab
4. Look for `[DeepCrawler]` messages

### Debug Network Requests

1. Open DevTools (F12)
2. Go to Network tab
3. Look for requests to `/api/extension/*`

### Reset Extension Settings

1. Click extension icon → "⚙️ Settings"
2. Click "↺ Reset to Defaults"
3. Click "💾 Save"

## Features

✅ **Authenticated Sessions**: Use your logged-in accounts
✅ **Real-time Status**: See connection status instantly
✅ **Easy Configuration**: Simple settings panel
✅ **Automatic Fallback**: Works even without extension
✅ **Network Capture**: Intercepts all API calls
✅ **Session Preservation**: Keeps cookies and tokens

## Support

- 📚 [Documentation](https://docs.hyperbrowser.ai)
- 🐛 [Report Issues](https://github.com/hyperbrowserai)
- 💬 [Get Help](https://docs.hyperbrowser.ai/support)

## What's Next?

1. **Explore APIs**: Discover hidden endpoints on your favorite websites
2. **Export Results**: Download Postman collections
3. **Automate**: Use the API for programmatic crawling
4. **Share**: Share discovered endpoints with your team

Happy crawling! 🚀

