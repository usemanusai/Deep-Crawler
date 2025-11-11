# DeepCrawler Comprehensive Test Suite

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  - URL Input Form                                            │
│  - Results Display                                           │
│  - Extension Status Indicator                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                    │
│  - POST /api/crawl (main entry)                              │
│  - POST /api/extension/crawl (extension mode)                │
│  - PUT /api/extension/crawl/data (receive network data)      │
│  - GET /api/extension/crawl/pending (polling)                │
│  - GET /api/extension/status (health check)                  │
│  - POST /api/extension/ping (heartbeat)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  Hyperbrowser    │      │  Chrome          │
│  SDK (Server)    │      │  Extension       │
│                  │      │                  │
│  - Browser Pool  │      │  - Background.js │
│  - Page Control  │      │  - Content.js    │
│  - Network Spy   │      │  - Manifest.json │
└──────────────────┘      └──────────────────┘
```

## Test Categories

### 1. Backend API Tests
- [ ] POST /api/crawl - Main crawl endpoint
- [ ] POST /api/extension/crawl - Extension crawl
- [ ] PUT /api/extension/crawl/data - Data submission
- [ ] GET /api/extension/crawl/pending - Pending crawls
- [ ] GET /api/extension/status - Health check
- [ ] POST /api/extension/ping - Heartbeat

### 2. Extension Tests
- [ ] Manifest validation
- [ ] Background script initialization
- [ ] Content script injection
- [ ] Network interception (fetch)
- [ ] Network interception (XHR)
- [ ] Message passing

### 3. Data Flow Tests
- [ ] URL validation
- [ ] Request ID generation
- [ ] Session management
- [ ] Network data capture
- [ ] Data deduplication
- [ ] Endpoint extraction

### 4. Error Handling Tests
- [ ] Invalid URLs
- [ ] Missing API keys
- [ ] Network timeouts
- [ ] Extension disconnection
- [ ] Malformed requests

### 5. Integration Tests
- [ ] Full crawl workflow
- [ ] Extension to backend communication
- [ ] Frontend to backend communication
- [ ] Fallback mechanisms

## Critical Issues to Check

1. **SDK Bundling**: Is @hyperbrowser/sdk being bundled into client code?
2. **Network Capture**: Is content.js actually capturing network requests?
3. **Message Routing**: Are messages reaching the correct tabs?
4. **Data Persistence**: Are endpoints being stored and returned?
5. **API Key Validation**: Are all endpoints validating the extension key?
6. **Timeout Handling**: What happens when crawl times out?
7. **Error Propagation**: Are errors properly communicated to frontend?

## Test Execution Plan

1. Start backend
2. Check backend health
3. Load extension
4. Verify extension connection
5. Run crawl on test URL
6. Verify network capture
7. Check results
8. Verify error handling

