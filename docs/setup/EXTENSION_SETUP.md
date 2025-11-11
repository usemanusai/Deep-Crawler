# DeepCrawler Extension Setup Guide

This guide walks you through installing and configuring the DeepCrawler Chrome extension to enable authenticated session crawling.

## Prerequisites

- Chrome browser (version 88+)
- DeepCrawler backend running on `http://localhost:3002`
- Node.js 18+ (for development)

## Installation Steps

### Step 1: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to `hyperbrowser-app-examples/deep-crawler-bot/extension/` folder
5. Click "Select Folder"
6. The extension should now appear in your Chrome toolbar

### Step 2: Verify Installation

1. Click the DeepCrawler extension icon in your toolbar
2. You should see the popup with:
   - Connection status indicator
   - Backend URL
   - Current tab information
   - Settings and Test Connection buttons

### Step 3: Configure Extension Settings

1. Click the extension icon → "⚙️ Settings"
2. Verify or update:
   - **Backend URL**: `http://localhost:3002` (default)
   - **Extension API Key**: `deepcrawler-extension-v1` (default)
   - **Crawling Mode**: `Auto` (recommended)
3. Click "💾 Save Settings"

### Step 4: Test Connection

1. Click the extension icon
2. Click "🔄 Test Connection"
3. You should see "✓ Connection test successful" in the logs
4. The status indicator should show "🟢 Connected"

## Configuration

### Backend URL

The extension connects to the DeepCrawler backend. By default, it uses `http://localhost:3002`.

To change:
1. Open extension settings
2. Update "Backend URL" field
3. Save settings

### API Key

The extension authenticates with the backend using an API key. Default: `deepcrawler-extension-v1`

To change:
1. Open extension settings
2. Update "Extension API Key" field
3. Ensure backend is configured with the same key
4. Save settings

### Crawling Mode

Three modes are available:

- **Auto** (default): Use extension when available, fallback to server-side
- **Extension Only**: Fail if extension unavailable
- **Server-side Only**: Always use Hyperbrowser backend

To change:
1. Open extension settings
2. Select desired mode
3. Save settings

## Using the Extension

### Basic Workflow

1. **Install and configure** the extension (see above)
2. **Log in** to websites in your Chrome browser
3. **Open DeepCrawler** at `http://localhost:3002`
4. **Enter URL** of the website you want to crawl
5. **Click "Crawl"** - the extension will use your authenticated session
6. **View results** - discovered API endpoints will appear

### With Authenticated Sessions

The extension preserves all authentication:

1. Log in to a website in Chrome (e.g., GitHub, Twitter, etc.)
2. Open DeepCrawler
3. Enter the website URL
4. Click "Crawl"
5. The extension will use your logged-in session to discover APIs

### Monitoring Progress

1. Open the extension popup to see connection status
2. Check the terminal sidebar in DeepCrawler for live logs
3. View discovered endpoints as they're found

## Troubleshooting

### Extension not connecting

**Problem**: Status shows "⚪ Disconnected"

**Solutions**:
1. Verify backend is running: `npm run dev` in the DeepCrawler directory
2. Check backend URL in settings matches your setup
3. Verify API key matches between extension and backend
4. Check browser console (F12 → Console) for errors

### Network requests not captured

**Problem**: No API endpoints discovered

**Solutions**:
1. Ensure content script is injected (check popup status)
2. Verify page is not using Service Workers that bypass fetch
3. Check browser console for CSP violations
4. Try a different website to test

### Settings not saving

**Problem**: Settings revert after closing popup

**Solutions**:
1. Verify Chrome storage is enabled
2. Check browser console for errors
3. Try resetting to defaults in settings
4. Clear browser cache and reload extension

### Connection timeout

**Problem**: "Connection test error" message

**Solutions**:
1. Verify backend is running and accessible
2. Check firewall/network settings
3. Try increasing timeout in settings
4. Check backend logs for errors

## Development

### File Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Content script
├── popup.html            # Popup UI
├── popup.js              # Popup logic
├── popup.css             # Popup styling
├── options.html          # Settings page
├── options.js            # Settings logic
├── options.css           # Settings styling
└── README.md             # Extension documentation
```

### Debugging

1. **View extension logs**:
   - Right-click extension icon → "Inspect popup"
   - Or: `chrome://extensions/` → DeepCrawler → "Inspect views: background page"

2. **View content script logs**:
   - Open any website
   - Press F12 → Console
   - Look for `[DeepCrawler]` prefixed messages

3. **Monitor network requests**:
   - Open DevTools (F12)
   - Go to Network tab
   - Look for requests to `/api/extension/*`

### Making Changes

1. Edit extension files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the DeepCrawler extension
4. Test changes

## Security Considerations

### API Key Protection

- The API key is stored in Chrome's sync storage
- Never share your API key
- Use environment variables in production
- Rotate keys regularly

### Content Security Policy

The extension includes CSP headers to prevent:
- Inline scripts
- Unsafe eval
- Cross-origin requests (except to backend)

### Input Validation

All inputs are validated:
- URLs are validated before use
- API keys are checked on every request
- Network data is sanitized

## Advanced Configuration

### Custom Backend

To use a custom backend URL:

1. Update backend URL in extension settings
2. Ensure backend has the same API key configured
3. Backend must support the extension API endpoints

### Environment Variables

Set these in your backend `.env`:

```
EXTENSION_API_KEY=your-custom-key
```

### Monitoring

Monitor extension activity:

1. Enable detailed logging in settings
2. Check browser console for logs
3. Monitor backend logs for requests
4. Use Chrome DevTools Network tab

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check backend logs for API errors
4. Visit https://docs.hyperbrowser.ai for documentation
5. Open an issue on GitHub

## Next Steps

- [DeepCrawler Documentation](https://docs.hyperbrowser.ai)
- [Hyperbrowser API Reference](https://docs.hyperbrowser.ai/api)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)

