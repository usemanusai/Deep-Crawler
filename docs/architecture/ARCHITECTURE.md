# DeepCrawler Extension Architecture

## Overview

The DeepCrawler extension acts as a session bridge between the user's authenticated Chrome browser and the DeepCrawler backend, enabling API discovery while preserving authentication state.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Chrome Browser                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         DeepCrawler Chrome Extension                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Background Service Worker (background.js)  │    │   │
│  │  │  - Connection management                    │    │   │
│  │  │  - Message routing                          │    │   │
│  │  │  - Heartbeat mechanism                      │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                      ↕                               │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Content Script (content.js)                │    │   │
│  │  │  - Network interception                     │    │   │
│  │  │  - Data extraction                          │    │   │
│  │  │  - Session data access                      │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                      ↕                               │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Popup UI (popup.html/js/css)               │    │   │
│  │  │  - Status display                           │    │   │
│  │  │  - Quick actions                            │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  Settings Page (options.html/js/css)        │    │   │
│  │  │  - Configuration management                 │    │   │
│  │  │  - Mode selection                           │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Authenticated Web Pages                       │   │
│  │  - Cookies, localStorage, sessionStorage             │   │
│  │  - Authentication tokens                             │   │
│  │  - Network requests                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│              DeepCrawler Backend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Extension API Routes                                │   │
│  │  - GET /api/extension/status                         │   │
│  │  - POST /api/extension/ping                          │   │
│  │  - POST /api/extension/crawl                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↕                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Extension Manager (lib/extensionManager.ts)         │   │
│  │  - Connection state management                       │   │
│  │  - Mode selection logic                              │   │
│  │  - Configuration management                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↕                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Crawl API Routes                                    │   │
│  │  - POST /api/crawl (with extension fallback)         │   │
│  └──────────────────────────────────────────────────────┘   │
│                      ↕                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Hyperbrowser SDK                                    │   │
│  │  - Browser automation                               │   │
│  │  - Network interception                             │   │
│  │  - Session management                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### Background Service Worker (background.js)

**Responsibilities**:
- Maintain connection to backend
- Route messages between content scripts and backend
- Manage heartbeat mechanism
- Handle tab lifecycle events

**Key Functions**:
- `initializeConnection()`: Establish backend connection
- `startHeartbeat()`: Maintain connection with periodic pings
- `handleCrawlRequest()`: Process crawl requests
- `notifyAllTabs()`: Broadcast status updates

**Communication**:
- Receives messages from content scripts via `chrome.runtime.sendMessage`
- Sends HTTP requests to backend API
- Broadcasts status to all tabs

### Content Script (content.js)

**Responsibilities**:
- Intercept network requests
- Extract page data
- Access session storage
- Execute scripts in page context

**Key Functions**:
- `setupNetworkInterception()`: Monkey-patch fetch/XHR
- `extractData()`: Extract DOM data using selectors
- `getCookies()`: Access cookies
- `getLocalStorage()`: Access localStorage
- `getSessionStorage()`: Access sessionStorage

**Communication**:
- Receives messages from background script
- Sends page data to background script
- Accesses page context directly

### Popup UI (popup.html/js/css)

**Responsibilities**:
- Display connection status
- Show backend information
- Provide quick actions
- Display activity logs

**Features**:
- Real-time status indicator
- Connection test button
- Settings access
- Activity log display

### Settings Page (options.html/js/css)

**Responsibilities**:
- Manage extension configuration
- Allow mode selection
- Store user preferences
- Provide help information

**Configuration Options**:
- Backend URL
- API Key
- Crawling mode
- Logging level
- Data collection options

### Extension Manager (lib/extensionManager.ts)

**Responsibilities**:
- Manage extension connection state
- Handle mode selection logic
- Provide configuration management
- Format status information

**Key Functions**:
- `checkExtensionStatus()`: Verify backend connection
- `shouldUseExtension()`: Determine if extension should be used
- `sendCrawlToExtension()`: Send crawl request to extension

### Extension API Routes

**GET /api/extension/status**
- Check if backend is available
- Verify extension connection
- Return version information

**POST /api/extension/ping**
- Heartbeat endpoint
- Maintain connection
- Detect disconnections

**POST /api/extension/crawl**
- Execute crawl in extension context
- Stream results via SSE
- Return discovered endpoints

## Data Flow

### Connection Establishment

1. Extension loads in Chrome
2. Background script initializes
3. Sends GET request to `/api/extension/status`
4. Backend validates API key
5. Returns connection status
6. Background script starts heartbeat

### Crawl Request Flow

1. User enters URL in DeepCrawler frontend
2. Frontend checks extension status
3. If extension available, sends request to `/api/extension/crawl`
4. Backend routes request to extension
5. Extension's content script intercepts network requests
6. Results streamed back via SSE
7. Frontend displays discovered endpoints

### Fallback Flow

1. User initiates crawl
2. Extension unavailable or in server mode
3. Request routed to `/api/crawl`
4. Backend uses Hyperbrowser SDK
5. Results returned via SSE

## Security Architecture

### Authentication

- API key validation on every request
- Header-based authentication (`X-Extension-Key`)
- Secure key storage in Chrome sync storage

### Input Validation

- URL validation before processing
- API key validation
- Request body validation
- Response validation

### Content Security Policy

- Inline scripts disabled
- Unsafe eval disabled
- Cross-origin requests restricted
- Only backend communication allowed

### Data Protection

- No sensitive data in logs
- API keys not exposed in frontend
- Session data encrypted in transit
- HTTPS required in production

## Operational Modes

### Auto Mode (Default)

- Use extension if available
- Fallback to server mode if unavailable
- Automatic mode switching
- Transparent to user

### Extension Only Mode

- Fail if extension unavailable
- Require authenticated session
- Preserve all session data
- No server-side fallback

### Server-side Only Mode

- Always use Hyperbrowser backend
- Ignore extension availability
- Use proxy/stealth mode
- No session preservation

## Performance Considerations

### Network Optimization

- HTTP polling instead of WebSocket
- Efficient message serialization
- Minimal payload sizes
- Connection pooling

### Memory Management

- Limit network request storage (1000 max)
- Clean up old logs
- Efficient data structures
- No memory leaks

### Browser Impact

- Minimal CPU usage
- Efficient network interception
- Non-blocking operations
- Responsive UI

## Scalability

### Horizontal Scaling

- Stateless backend design
- Load balancer compatible
- Multiple backend instances
- Distributed session management

### Vertical Scaling

- Efficient resource usage
- Configurable timeouts
- Batch processing support
- Caching mechanisms

## Monitoring & Observability

### Logging

- Structured logging with timestamps
- Log levels (info, warn, error)
- Request/response logging
- Performance metrics

### Metrics

- Connection uptime
- Request latency
- Error rates
- User activity

### Debugging

- Browser console logs
- Network tab inspection
- Extension inspector
- Backend logs

## Future Enhancements

- WebSocket support for real-time updates
- Multi-tab session management
- Advanced filtering options
- Custom extraction rules
- Performance optimizations
- Additional authentication methods

