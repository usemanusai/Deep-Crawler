# DeepCrawler Session Bridge Extension

A Chrome extension that bridges your authenticated browser sessions with the DeepCrawler backend, enabling seamless API discovery while preserving all existing authentication state.

## Features

- **Session Preservation**: Maintains all cookies, localStorage, sessionStorage, and authentication tokens
- **Network Interception**: Captures all network requests made by the page
- **DOM Extraction**: Extract data from pages using CSS selectors
- **Real-time Status**: Connection status indicator in popup
- **Configurable**: Customize backend URL, API key, and crawling behavior
- **Fallback Support**: Automatically falls back to server-side mode if extension unavailable

## Installation

### Development Mode

1. Clone or download this extension folder
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `extension` folder
6. The extension should now appear in your Chrome toolbar

### Production Mode

Once published to Chrome Web Store, users can install directly from the store.

## Configuration

### Backend URL

By default, the extension connects to `http://localhost:3002`. To change this:

1. Click the extension icon in Chrome toolbar
2. Click "⚙️ Settings"
3. Update "Backend URL" field
4. Click "💾 Save Settings"

### API Key

The default API key is `deepcrawler-extension-v1`. To change:

1. Open extension settings (see above)
2. Update "Extension API Key" field
3. Ensure the backend is configured with the same key

### Crawling Mode

Three modes are available:

- **Auto** (default): Use extension when available, fallback to server-side
- **Extension Only**: Fail if extension unavailable
- **Server-side Only**: Always use Hyperbrowser backend

## Architecture

### Files

- `manifest.json` - Extension configuration and permissions
- `background.js` - Service worker for connection management
- `content.js` - Content script injected into all pages
- `popup.html/js/css` - Popup UI for status and quick actions
- `options.html/js/css` - Settings page

### Communication Flow

```
DeepCrawler Frontend
    ↓
Backend API (/api/extension/crawl)
    ↓
Extension Background Service Worker
    ↓
Content Script (in target tab)
    ↓
Browser Page (with preserved sessions)
```

## API Endpoints

The extension communicates with these backend endpoints:

### GET /api/extension/status
Check if backend is available and extension is connected.

**Headers:**
- `X-Extension-Key`: Extension API key

**Response:**
```json
{
  "status": "connected",
  "version": "1.0.0"
}
```

### POST /api/extension/ping
Heartbeat to maintain connection.

**Headers:**
- `X-Extension-Key`: Extension API key

**Response:**
```json
{
  "status": "pong"
}
```

### POST /api/extension/crawl
Execute a crawl request in the extension's browser context.

**Headers:**
- `X-Extension-Key`: Extension API key
- `Content-Type`: application/json

**Body:**
```json
{
  "requestId": "crawl-123456",
  "url": "https://example.com",
  "tabId": 123,
  "sameOriginOnly": true,
  "mode": "extension"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "endpoints": [...],
    "crawlId": "uuid",
    "postmanCollection": {...}
  }
}
```

## Message Protocol

### Content Script Messages

#### GET_PAGE_DATA
Retrieve current page metadata including cookies, storage, and network requests.

```javascript
chrome.runtime.sendMessage({
  type: 'GET_PAGE_DATA'
}, (response) => {
  console.log(response.data);
});
```

#### EXTRACT_DATA_REQUEST
Extract data from page using CSS selectors.

```javascript
chrome.runtime.sendMessage({
  type: 'EXTRACT_DATA_REQUEST',
  selectors: {
    'links': 'a[href]',
    'buttons': 'button'
  },
  requestId: 'extract-123'
}, (response) => {
  console.log(response.data);
});
```

#### NAVIGATE
Navigate to a different URL.

```javascript
chrome.runtime.sendMessage({
  type: 'NAVIGATE',
  url: 'https://example.com'
}, (response) => {
  console.log(response.success);
});
```

## Security Considerations

1. **Origin Validation**: All messages are validated for origin
2. **API Key Authentication**: Backend requests require valid API key
3. **Content Security Policy**: Manifest includes CSP headers
4. **Input Sanitization**: All inputs are validated before use
5. **HTTPS in Production**: Use secure WebSocket (wss://) in production

## Troubleshooting

### Extension not connecting to backend

1. Verify backend is running on configured URL
2. Check browser console for errors (F12 → Console)
3. Verify API key matches between extension and backend
4. Check firewall/network settings

### Network requests not being captured

1. Ensure content script is injected (check popup status)
2. Verify page is not using Service Workers that bypass fetch
3. Check browser console for CSP violations

### Settings not saving

1. Verify Chrome storage is enabled
2. Check browser console for errors
3. Try resetting to defaults

## Development

### Building

No build step required - extension uses vanilla JavaScript.

### Testing

1. Load extension in development mode
2. Open popup (click extension icon)
3. Click "🔄 Test Connection"
4. Check console logs (F12 → Console)

### Debugging

Enable detailed logging in settings to see all extension activity in console.

## License

Part of the Hyperbrowser project. See main repository for license details.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Visit https://docs.hyperbrowser.ai for documentation

