# DeepCrawler Extension Testing Checklist

Complete testing checklist for the extension session bridge feature.

## Phase 1: Installation & Setup

- [ ] Extension loads without errors in Chrome
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking extension icon
- [ ] Settings page opens from popup
- [ ] Settings page opens from navbar
- [ ] All UI elements render correctly
- [ ] No console errors on popup load
- [ ] No console errors on settings page load

## Phase 2: Connection Management

- [ ] Backend connection status displays correctly
- [ ] Status indicator shows "🟢 Connected" when backend is running
- [ ] Status indicator shows "⚪ Disconnected" when backend is offline
- [ ] Status indicator shows "🔴 Error" on connection error
- [ ] Test Connection button works
- [ ] Connection status updates every 10 seconds
- [ ] Heartbeat mechanism maintains connection
- [ ] Extension recovers from temporary disconnections

## Phase 3: Settings Management

- [ ] Backend URL can be changed
- [ ] API Key can be changed
- [ ] Crawling mode can be changed (auto/extension/server)
- [ ] Settings persist after closing popup
- [ ] Settings persist after browser restart
- [ ] Reset to defaults button works
- [ ] Validation prevents invalid URLs
- [ ] Validation prevents empty API keys
- [ ] Save status message displays correctly

## Phase 4: Extension Mode Crawling

- [ ] Crawl request is sent to extension endpoint
- [ ] Extension receives crawl request with correct parameters
- [ ] Network requests are captured during crawl
- [ ] Cookies are preserved during crawl
- [ ] localStorage is preserved during crawl
- [ ] sessionStorage is preserved during crawl
- [ ] Authentication tokens are used in requests
- [ ] Crawl completes successfully
- [ ] Results are returned to frontend

## Phase 5: Fallback Behavior

- [ ] Falls back to server mode when extension unavailable
- [ ] Falls back to server mode in "Server-side Only" mode
- [ ] Fails gracefully in "Extension Only" mode when unavailable
- [ ] Auto mode uses extension when available
- [ ] Auto mode falls back when extension unavailable
- [ ] Error messages are clear and helpful

## Phase 6: Frontend Integration

- [ ] Connection status displays in navbar
- [ ] Connection status updates in real-time
- [ ] Settings button is accessible from navbar
- [ ] Settings panel opens and closes correctly
- [ ] Settings changes are reflected in crawls
- [ ] Mode selection affects crawl behavior
- [ ] Terminal sidebar shows extension logs
- [ ] Progress bar updates during crawl

## Phase 7: API Endpoints

- [ ] GET /api/extension/status returns 200 with valid key
- [ ] GET /api/extension/status returns 401 without key
- [ ] GET /api/extension/status returns 401 with invalid key
- [ ] POST /api/extension/ping returns 200 with valid key
- [ ] POST /api/extension/ping returns 401 without key
- [ ] POST /api/extension/crawl returns 200 with valid request
- [ ] POST /api/extension/crawl returns 400 with invalid URL
- [ ] POST /api/extension/crawl returns 401 without key
- [ ] POST /api/extension/crawl returns SSE stream

## Phase 8: Security

- [ ] API key is validated on every request
- [ ] Invalid API keys are rejected
- [ ] URLs are validated before processing
- [ ] XSS attacks are prevented
- [ ] CSRF attacks are prevented
- [ ] Content Security Policy is enforced
- [ ] No sensitive data in logs
- [ ] No API keys exposed in frontend

## Phase 9: Error Handling

- [ ] Network errors are handled gracefully
- [ ] Timeout errors are handled gracefully
- [ ] Invalid responses are handled gracefully
- [ ] Malformed JSON is handled gracefully
- [ ] Missing required fields are handled gracefully
- [ ] Error messages are user-friendly
- [ ] Errors are logged for debugging

## Phase 10: Performance

- [ ] Extension doesn't slow down browser
- [ ] Popup opens quickly
- [ ] Settings page loads quickly
- [ ] Connection checks don't block UI
- [ ] Network interception doesn't impact page performance
- [ ] Memory usage is reasonable
- [ ] No memory leaks detected
- [ ] Crawls complete in reasonable time

## Phase 11: Authenticated Sessions

- [ ] GitHub login session is preserved
- [ ] Twitter login session is preserved
- [ ] API authentication tokens are used
- [ ] Session cookies are sent with requests
- [ ] Protected endpoints are accessible
- [ ] Unauthorized endpoints return 401/403
- [ ] Session expires correctly
- [ ] Re-authentication works

## Phase 12: Data Extraction

- [ ] Network requests are captured correctly
- [ ] Request methods are recorded (GET, POST, etc.)
- [ ] Request URLs are captured
- [ ] Response status codes are recorded
- [ ] Response sizes are recorded
- [ ] Request/response headers are captured
- [ ] Request/response bodies are captured
- [ ] Duplicate endpoints are deduplicated

## Phase 13: Browser Compatibility

- [ ] Works in Chrome 88+
- [ ] Works in Chromium-based browsers
- [ ] Works with different screen sizes
- [ ] Works with dark mode
- [ ] Works with light mode
- [ ] Works with different languages
- [ ] Works with accessibility features

## Phase 14: Edge Cases

- [ ] Handles very long URLs
- [ ] Handles URLs with special characters
- [ ] Handles URLs with query parameters
- [ ] Handles URLs with fragments
- [ ] Handles redirects correctly
- [ ] Handles CORS requests
- [ ] Handles WebSocket connections
- [ ] Handles file downloads

## Phase 15: Documentation

- [ ] README.md is complete and accurate
- [ ] EXTENSION_SETUP.md is complete and accurate
- [ ] Code comments are clear and helpful
- [ ] API documentation is complete
- [ ] Error messages are documented
- [ ] Configuration options are documented
- [ ] Troubleshooting guide is helpful

## Test Results

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Installation & Setup | ⬜ | |
| 2. Connection Management | ⬜ | |
| 3. Settings Management | ⬜ | |
| 4. Extension Mode Crawling | ⬜ | |
| 5. Fallback Behavior | ⬜ | |
| 6. Frontend Integration | ⬜ | |
| 7. API Endpoints | ⬜ | |
| 8. Security | ⬜ | |
| 9. Error Handling | ⬜ | |
| 10. Performance | ⬜ | |
| 11. Authenticated Sessions | ⬜ | |
| 12. Data Extraction | ⬜ | |
| 13. Browser Compatibility | ⬜ | |
| 14. Edge Cases | ⬜ | |
| 15. Documentation | ⬜ | |

## Sign-off

- [ ] All tests passed
- [ ] No critical issues
- [ ] No security vulnerabilities
- [ ] Documentation is complete
- [ ] Ready for production

**Tested by**: _______________
**Date**: _______________
**Notes**: _______________

