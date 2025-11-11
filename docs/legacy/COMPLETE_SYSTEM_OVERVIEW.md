# Complete System Overview - DeepCrawler Extension

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser (Chrome)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DeepCrawler Extension                               │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  • manifest.json - Extension configuration           │   │
│  │  • background.js - Service worker (polling logic)    │   │
│  │  • content.js - Injected into all pages              │   │
│  │  • popup.html - Extension popup UI                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (http://localhost:3002)                    │   │
│  │  • User enters URL and clicks "Start Discovery"      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Target Website (e.g., https://example.com)          │   │
│  │  • Content script captures network requests          │   │
│  │  • Performs user interactions                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Next.js)                │
├─────────────────────────────────────────────────────────────┤
│  • POST /api/crawl - Main crawl endpoint                    │
│  • POST /api/extension/crawl - Extension crawl endpoint     │
│  • GET /api/extension/crawl/pending - Polling endpoint      │
│  • PUT /api/extension/crawl/data - Data submission endpoint │
│  • GET /api/extension/status - Status check endpoint        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Step 1: User Initiates Crawl
```
Frontend (http://localhost:3002)
  ↓ User enters URL and clicks "Start Discovery"
  ↓ POST /api/crawl with { url, sameOriginOnly }
Backend
  ↓ Checks if extension is connected
  ↓ Calls sendCrawlToExtension()
  ↓ POST /api/extension/crawl with { requestId, url, sameOriginOnly }
Backend
  ↓ Creates crawl session in activeCrawlSessions Map
  ↓ Returns SSE stream
  ↓ Waits for extension to send data (60 second timeout)
```

### Step 2: Extension Polls for Pending Crawls
```
Extension (background.js)
  ↓ Polls every 2 seconds
  ↓ GET /api/extension/crawl/pending
Backend
  ↓ Returns pending crawls from activeCrawlSessions Map
Extension
  ↓ Gets pending crawl with { requestId, url, seedHost, sameOriginOnly, tabId }
  ↓ Checks if tab with URL exists
  ↓ If NOT: Creates new tab with chrome.tabs.create()
  ↓ Waits for tab to load (max 10 seconds)
  ↓ Sends START_CRAWL message to content script
```

### Step 3: Content Script Captures Network
```
Content Script (content.js)
  ↓ Receives START_CRAWL message
  ↓ Performs user interactions:
    • Scrolls page
    • Clicks buttons
    • Fills forms
    • Triggers API calls
  ↓ Network interception captures all requests:
    • fetch() calls
    • XMLHttpRequest calls
    • Stores in NETWORK_REQUESTS array
  ↓ Waits 3 seconds for final API calls
  ↓ Sends data to backend
```

### Step 4: Backend Processes Data
```
Backend
  ↓ Receives PUT /api/extension/crawl/data
  ↓ Gets network requests from content script
  ↓ Filters for API endpoints:
    • Skips static assets (CSS, JS, images)
    • Skips analytics (Google Analytics, etc.)
    • Detects API patterns (/api/, /v1/, /graphql, etc.)
    • Filters by status code and content type
  ↓ Deduplicates endpoints
  ↓ Stores in session.endpoints
  ↓ Returns success response
```

### Step 5: Backend Returns Results
```
Backend
  ↓ Checks if data received (or timeout reached)
  ↓ Processes collected endpoints
  ↓ Generates Postman collection
  ↓ Sends SSE updates to frontend:
    • Progress updates
    • Log messages
    • Final results
Frontend
  ↓ Receives SSE updates
  ↓ Displays "Found X endpoints"
  ↓ Shows endpoint list
```

## Key Components

### 1. Extension (Chrome)
- **manifest.json**: Configuration, permissions, content scripts
- **background.js**: Service worker, polling logic, message routing
- **content.js**: Network interception, user interactions, data submission

### 2. Backend (Node.js)
- **POST /api/crawl**: Main entry point, decides extension vs server mode
- **POST /api/extension/crawl**: Creates crawl session, waits for data
- **GET /api/extension/crawl/pending**: Returns pending crawls for polling
- **PUT /api/extension/crawl/data**: Receives network data from extension
- **GET /api/extension/status**: Returns extension connection status

### 3. Frontend (React)
- **UrlForm**: Input form for URL
- **ProgressBar**: Shows crawl progress
- **EndpointList**: Displays discovered endpoints
- **ConnectionStatus**: Shows extension connection status

## Critical Fix Applied

**Problem**: Extension was not creating tabs for target URLs

**Solution**: Modified `extension/background.js` to:
1. Check if tab with URL exists
2. If NOT: Create new tab with `chrome.tabs.create()`
3. Wait for tab to load with `waitForTabLoad()`
4. Send START_CRAWL message with `sendStartCrawlToTab()`

**Result**: Extension now works automatically without manual tab opening

## Testing

```bash
# 1. Start backend
npm run dev

# 2. Load extension
# chrome://extensions/ → Load unpacked

# 3. Test crawl
# http://localhost:3002 → Enter URL → Click "Start Discovery"

# 4. Expected result
# Frontend shows "Found X endpoints" (X > 0)
```

## Success Indicators

✅ Extension creates new tab
✅ Content script receives START_CRAWL
✅ Network requests are captured
✅ Data is sent to backend
✅ Backend processes data
✅ Frontend displays endpoints

