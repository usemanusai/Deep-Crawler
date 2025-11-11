/**
 * DeepCrawler Extension - Background Service Worker
 * Manages connection to backend, message routing, and tab management
 */

let BACKEND_URL = 'http://localhost:3002';
let EXTENSION_API_KEY = 'deepcrawler-extension-v1';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 5000; // 5 seconds
const POLL_INTERVAL = 2000; // 2 seconds - poll for pending crawls

let connectionStatus = 'disconnected';
let backendSocket = null;
let pendingRequests = new Map();
let connectedTabs = new Set();
let heartbeatTimer = null;
let pollTimer = null;
let processingCrawls = new Set(); // Track crawls being processed

/**
 * This function is injected into the page context to intercept network requests
 * It runs in the MAIN world, not the content script's isolated world
 * This allows it to intercept the page's actual fetch/XHR calls
 * UPDATED: Now includes blob: and data: URL capture
 */
function setupNetworkInterceptionInPage() {
  const NETWORK_REQUESTS = [];
  const MAX_REQUESTS = 10000;
  let requestCounter = 0;

  console.log('[DeepCrawler] Network interception script injected into page context');

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    requestCounter++;
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = (config?.method || 'GET').toUpperCase();
    const startTime = Date.now();

    return originalFetch.apply(this, args).then(response => {
      if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
        const contentLength = response.headers.get('content-length') || 0;
        const contentType = response.headers.get('content-type') || '';

        NETWORK_REQUESTS.push({
          method,
          url,
          status: response.status,
          size: parseInt(contentLength, 10),
          contentType,
          type: 'fetch',
          timestamp: startTime,
          duration: Date.now() - startTime,
          id: requestCounter
        });
        window.postMessage({ type: 'DEEPCRAWLER_NETWORK_REQUEST', request: NETWORK_REQUESTS[NETWORK_REQUESTS.length - 1] }, '*');
      }
      return response;
    }).catch(error => {
      if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
        NETWORK_REQUESTS.push({
          method,
          url,
          status: 0,
          type: 'fetch',
          timestamp: startTime,
          error: error.message,
          id: requestCounter
        });
      }
      throw error;
    });
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._deepcrawlerMethod = method;
    this._deepcrawlerUrl = url;
    this._deepcrawlerStartTime = Date.now();
    this._deepcrawlerId = ++requestCounter;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const self = this;
    const onReadyStateChange = this.onreadystatechange;

    this.onreadystatechange = function() {
      if (this.readyState === 4 && NETWORK_REQUESTS.length < MAX_REQUESTS) {
        NETWORK_REQUESTS.push({
          method: self._deepcrawlerMethod || 'GET',
          url: self._deepcrawlerUrl,
          status: this.status,
          type: 'xhr',
          timestamp: self._deepcrawlerStartTime,
          headers: this.getAllResponseHeaders()
        });
        window.postMessage({ type: 'DEEPCRAWLER_NETWORK_REQUEST', request: NETWORK_REQUESTS[NETWORK_REQUESTS.length - 1] }, '*');
      }
      if (onReadyStateChange) onReadyStateChange.call(this);
    };

    return originalSend.apply(this, args);
  };

  // Intercept URL.createObjectURL to capture blob: URLs
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = function(blob) {
    const blobUrl = originalCreateObjectURL.call(this, blob);
    requestCounter++;

    if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
      const request = {
        method: 'GET',
        url: blobUrl,
        status: 200,
        size: blob.size || 0,
        contentType: blob.type || 'application/octet-stream',
        timestamp: Date.now(),
        duration: 0,
        type: 'blob_created',
        id: requestCounter
      };
      NETWORK_REQUESTS.push(request);
      console.log(`[DeepCrawler] Captured blob: URL: ${blobUrl.substring(0, 100)}...`);
      window.postMessage({
        type: 'DEEPCRAWLER_NETWORK_REQUEST',
        request: request
      }, '*');
    }

    return blobUrl;
  };

  // Scan DOM for data: URLs in attributes and CSS
  function scanForDataUrls() {
    const dataUrls = new Set();

    // Scan all elements for data: URLs in attributes
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      // Check all attributes
      for (const attr of element.attributes) {
        if (attr.value && attr.value.includes('data:')) {
          const matches = attr.value.match(/data:[^"'\s;)]+/g);
          if (matches) {
            for (const url of matches) {
              dataUrls.add(url);
            }
          }
        }
      }

      // Check computed styles for data: URLs
      try {
        const styles = window.getComputedStyle(element);
        for (let i = 0; i < styles.length; i++) {
          const value = styles.getPropertyValue(styles[i]);
          if (value && value.includes('data:')) {
            const matches = value.match(/data:[^"'\s;)]+/g);
            if (matches) {
              for (const url of matches) {
                dataUrls.add(url);
              }
            }
          }
        }
      } catch (e) {
        // Silently ignore style parsing errors
      }
    }

    // Add captured data: URLs to network requests
    for (const url of dataUrls) {
      if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
        const exists = NETWORK_REQUESTS.some(r => r.url === url);
        if (!exists) {
          requestCounter++;
          const request = {
            method: 'GET',
            url: url,
            status: 200,
            size: 0,
            contentType: 'data',
            timestamp: Date.now(),
            duration: 0,
            type: 'data_url',
            id: requestCounter
          };
          NETWORK_REQUESTS.push(request);
          console.log(`[DeepCrawler] Captured data: URL: ${url.substring(0, 100)}...`);
          window.postMessage({
            type: 'DEEPCRAWLER_NETWORK_REQUEST',
            request: request
          }, '*');
        }
      }
    }
  }

  // Scan for data: URLs on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForDataUrls);
  } else {
    scanForDataUrls();
  }

  // Scan for data: URLs periodically (every 2 seconds) to catch dynamically added URLs
  setInterval(scanForDataUrls, 2000);

  // Store requests in global for fallback access
  window.__deepcrawlerRequests = NETWORK_REQUESTS;
  console.log('[DeepCrawler] Network interception setup complete');
  console.log('[DeepCrawler] Fetch interceptor: ✓');
  console.log('[DeepCrawler] XHR interceptor: ✓');
  console.log('[DeepCrawler] Blob URL interceptor: ✓');
  console.log('[DeepCrawler] Data URL scanner: ✓');
}

// Load settings from chrome.storage and apply
const DEFAULT_SETTINGS = {
  backendUrl: 'http://localhost:3002',
  extensionKey: 'deepcrawler-extension-v1'
};

function loadSettingsAndInit() {
  try {
    if (!chrome?.storage?.sync) {
      console.warn('[DeepCrawler] chrome.storage.sync not available; using defaults');
      initializeConnection();
      return;
    }
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      try {
        if (settings?.backendUrl) BACKEND_URL = settings.backendUrl;
        if (settings?.extensionKey) EXTENSION_API_KEY = settings.extensionKey;
        console.log('[DeepCrawler] Settings loaded', { BACKEND_URL, EXTENSION_API_KEY });
      } catch (e) {
        console.warn('[DeepCrawler] Failed applying settings; using defaults', e);
      }
      initializeConnection();
    });
  } catch (err) {
    console.warn('[DeepCrawler] Failed to load settings; proceeding with defaults', err);
    initializeConnection();
  }
}

// React to settings changes on the fly
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      if (changes.backendUrl?.newValue) BACKEND_URL = changes.backendUrl.newValue;
      if (changes.extensionKey?.newValue) EXTENSION_API_KEY = changes.extensionKey.newValue;
      console.log('[DeepCrawler] Settings updated', { BACKEND_URL, EXTENSION_API_KEY });
    }
  });
}

/**
 * Initialize extension connection to backend
 */
async function initializeConnection() {
  try {
    console.log('[DeepCrawler] Initializing connection to backend...');
    console.log('[DeepCrawler] Backend URL:', BACKEND_URL);
    console.log('[DeepCrawler] API Key:', EXTENSION_API_KEY);

    // CRITICAL FIX: Start heartbeat IMMEDIATELY before checking connection status
    // This prevents the chicken-and-egg problem where the extension can't connect
    // because the backend checks if the extension has sent a heartbeat, but the
    // extension only starts sending heartbeats after the connection check succeeds
    console.log('[DeepCrawler] Starting heartbeat immediately...');
    startHeartbeat();
    startPollingForCrawls();

    // Now test backend connectivity
    const response = await fetch(`${BACKEND_URL}/api/extension/status`, {
      method: 'GET',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('[DeepCrawler] Response status:', response.status);
    if (response.ok) {
      connectionStatus = 'connected';
      console.log('[DeepCrawler] Connected to backend');
      notifyAllTabs({ type: 'CONNECTION_STATUS', status: 'connected' });
    } else {
      connectionStatus = 'disconnected';
      console.warn('[DeepCrawler] Backend returned non-OK status:', response.status);
      const errorText = await response.text();
      console.warn('[DeepCrawler] Error response:', errorText);
      notifyAllTabs({ type: 'CONNECTION_STATUS', status: 'disconnected' });
    }
  } catch (error) {
    connectionStatus = 'error';
    console.error('[DeepCrawler] Connection error:', error);
    console.error('[DeepCrawler] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    notifyAllTabs({ type: 'CONNECTION_STATUS', status: 'error', error: error.message });
  }
}

/**
 * Start heartbeat to maintain connection
 */
function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  console.log('[DeepCrawler] Starting heartbeat with interval:', HEARTBEAT_INTERVAL, 'ms');

  // Send first heartbeat immediately
  (async () => {
    try {
      console.log('[DeepCrawler] Sending initial heartbeat to', `${BACKEND_URL}/api/extension/ping`);
      const response = await fetch(`${BACKEND_URL}/api/extension/ping`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': EXTENSION_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log('[DeepCrawler] Initial heartbeat response:', response.status);
      if (response.ok) {
        console.log('[DeepCrawler] Initial heartbeat successful');
      } else {
        console.warn('[DeepCrawler] Initial heartbeat failed with status:', response.status);
      }
    } catch (error) {
      console.error('[DeepCrawler] Initial heartbeat error:', error);
    }
  })();

  // Then set up interval for subsequent heartbeats
  heartbeatTimer = setInterval(async () => {
    try {
      console.log('[DeepCrawler] Sending periodic heartbeat...');
      const response = await fetch(`${BACKEND_URL}/api/extension/ping`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': EXTENSION_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('[DeepCrawler] Heartbeat successful');
        connectionStatus = 'connected';
      } else {
        console.warn('[DeepCrawler] Heartbeat failed with status:', response.status);
        connectionStatus = 'disconnected';
        notifyAllTabs({ type: 'CONNECTION_STATUS', status: 'disconnected' });
      }
    } catch (error) {
      connectionStatus = 'error';
      console.error('[DeepCrawler] Heartbeat error:', error.message);
      notifyAllTabs({ type: 'CONNECTION_STATUS', status: 'error' });
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Start polling for pending crawls
 */
function startPollingForCrawls() {
  if (pollTimer) clearInterval(pollTimer);

  let pollCount = 0;
  pollTimer = setInterval(async () => {
    pollCount++;
    try {
      const response = await fetch(`${BACKEND_URL}/api/extension/crawl/pending`, {
        method: 'GET',
        headers: {
          'X-Extension-Key': EXTENSION_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('[DeepCrawler] Failed to fetch pending crawls:', response.status);
        return;
      }

      const data = await response.json();
      const pendingCrawls = data.pendingCrawls || [];

      if (pollCount % 5 === 0 || pendingCrawls.length > 0) {
        console.log(`[DeepCrawler] Poll #${pollCount}: Found ${pendingCrawls.length} pending crawls`);
      }

      // Process each pending crawl
      for (const crawl of pendingCrawls) {
        if (!processingCrawls.has(crawl.requestId)) {
          processingCrawls.add(crawl.requestId);
          console.log('[DeepCrawler] Found pending crawl:', crawl.requestId);
          console.log('[DeepCrawler] Crawl URL:', crawl.url);
          console.log('[DeepCrawler] Tab ID from backend:', crawl.tabId);

          // If we have a tabId from the backend, use it directly
          if (crawl.tabId) {
            // Ensure interception is injected before sending START_CRAWL
            sendStartCrawlToTab(crawl.tabId, crawl);
          } else {
            // Fallback: try to find the tab by URL
            console.log('[DeepCrawler] No tabId provided, searching for tab with URL:', crawl.url);

            // Try exact match first
            chrome.tabs.query({ url: crawl.url }, (tabs) => {
              if (chrome.runtime.lastError) {
                console.warn('[DeepCrawler] Error querying tabs:', chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError));
              }

              if (tabs && tabs.length > 0) {
                const tabId = tabs[0].id;
                console.log('[DeepCrawler] Found tab', tabId, 'with URL:', crawl.url);
                sendStartCrawlToTab(tabId, crawl);
              } else {
                // Try pattern match (with or without trailing slash)
                const urlPattern = crawl.url.replace(/\/$/, '') + '*';
                console.log('[DeepCrawler] Exact match failed, trying pattern:', urlPattern);
                chrome.tabs.query({ url: urlPattern }, (tabs2) => {
                  if (chrome.runtime.lastError) {
                    console.warn('[DeepCrawler] Error querying tabs with pattern:', chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError));
                  }

                  if (tabs2 && tabs2.length > 0) {
                    const tabId = tabs2[0].id;
                    console.log('[DeepCrawler] Found tab', tabId, 'with pattern:', urlPattern);
                    sendStartCrawlToTab(tabId, crawl);
                  } else {
                    // Tab doesn't exist - CREATE IT
                    console.log('[DeepCrawler] Tab not found, creating new tab for:', crawl.url);
                    chrome.tabs.create({ url: crawl.url }, (newTab) => {
                      if (chrome.runtime.lastError) {
                        console.warn('[DeepCrawler] Error creating tab:', chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError));
                        processingCrawls.delete(crawl.requestId);
                        return;
                      }

                      if (newTab && newTab.id) {
                        console.log('[DeepCrawler] Created new tab:', newTab.id);
                        console.log('[DeepCrawler] Tab URL:', newTab.url);
                        console.log('[DeepCrawler] Tab status:', newTab.status);
                        console.log('[DeepCrawler] Content script will inject network interceptor automatically');

                        // Wait for tab to load before sending START_CRAWL
                        waitForTabLoad(newTab.id, () => {
                          console.log('[DeepCrawler] Tab loaded, sending START_CRAWL');
                          sendStartCrawlToTab(newTab.id, crawl);
                        });
                      } else {
                        console.warn('[DeepCrawler] Failed to create tab - newTab is null or has no id');
                        processingCrawls.delete(crawl.requestId);
                      }
                    });
                  }
                });
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn('[DeepCrawler] Polling error:', error.message);
    }
  }, POLL_INTERVAL);
}

/**
 * Notify all connected tabs of status changes
 */
function notifyAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script loaded
        });
      }
    });
  });
}

/**
 * Handle crawl request from content script
 */
async function handleCrawlRequest(tabId, crawlData) {
  const requestId = `crawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[DeepCrawler] Processing crawl request ${requestId}`, crawlData);
    console.log(`[DeepCrawler] Tab ID: ${tabId}`);

    // First, send START_CRAWL message to content script to begin capturing
    console.log(`[DeepCrawler] Sending START_CRAWL to tab ${tabId}`);
    let startCrawlSent = false;
    try {
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          type: 'START_CRAWL',
          requestId,
          url: crawlData.url,
          crawlMode: crawlData.crawlMode || 'manual'
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[DeepCrawler] START_CRAWL error:', chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError));
            reject(chrome.runtime.lastError);
          } else {
            console.log('[DeepCrawler] START_CRAWL sent successfully, response:', response);
            resolve(response);
          }
        });
      });
    } catch (err) {
      console.warn('[DeepCrawler] Failed to send START_CRAWL:', err?.message || JSON.stringify(err));
    }

    // Wait a bit for content script to start capturing
    console.log('[DeepCrawler] Waiting for content script to start capturing...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send crawl request to backend
    console.log('[DeepCrawler] Sending crawl request to backend...');
    const response = await fetch(`${BACKEND_URL}/api/extension/crawl`, {
      method: 'POST',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestId,
        url: crawlData.url,
        tabId,
        sameOriginOnly: crawlData.sameOriginOnly,
        mode: 'extension',
        crawlMode: crawlData.crawlMode || 'manual',
        inactivityTimeout: crawlData.inactivityTimeout || 60
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    // Handle SSE stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let finalResult = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log(`[DeepCrawler] SSE event:`, data.type, data);

              // Send progress updates to content script
              if (data.type === 'progress' || data.type === 'log') {
                chrome.tabs.sendMessage(tabId, {
                  type: 'CRAWL_PROGRESS',
                  requestId,
                  data
                }).catch(err => console.warn('[DeepCrawler] Failed to send progress:', err));
              }

              // Capture final result
              if (data.type === 'complete') {
                finalResult = data.result;
              }
            } catch (e) {
              console.warn('[DeepCrawler] Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Send STOP_CRAWL message to stop network data submission
    chrome.tabs.sendMessage(tabId, {
      type: 'STOP_CRAWL',
      requestId
    }).catch(err => console.warn('[DeepCrawler] Failed to send STOP_CRAWL to tab:', err));

    // Send final result back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'CRAWL_RESPONSE',
      requestId,
      success: true,
      data: finalResult
    }).catch(err => console.warn('[DeepCrawler] Failed to send response to tab:', err));

    return finalResult;
  } catch (error) {
    console.error(`[DeepCrawler] Crawl request failed: ${requestId}`, error);

    // Send STOP_CRAWL message to stop network data submission
    chrome.tabs.sendMessage(tabId, {
      type: 'STOP_CRAWL',
      requestId
    }).catch(err => console.warn('[DeepCrawler] Failed to send STOP_CRAWL to tab:', err));

    // Send error back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'CRAWL_RESPONSE',
      requestId,
      success: false,
      error: error.message
    }).catch(err => console.warn('[DeepCrawler] Failed to send error to tab:', err));

    throw error;
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DeepCrawler] Message received:', message.type, 'from tab:', sender.tab?.id);

  if (message.type === 'SETUP_NETWORK_INTERCEPTION' || message.type === 'INJECT_NETWORK_INTERCEPTION') {
    // CRITICAL FIX: This handler should NOT be called anymore!
    // The manifest.json already injects network-interceptor.js at document_start with world: "MAIN"
    // If this handler is called, it means the content script is requesting injection AFTER page load,
    // which would overwrite the manifest injection and create a new NETWORK_REQUESTS array!
    // This handler is kept for backward compatibility only and should log a warning.
    const tabId = sender.tab.id;
    console.warn('[DeepCrawler] DEPRECATED: Received SETUP_NETWORK_INTERCEPTION request from tab', tabId);
    console.warn('[DeepCrawler] Network interception should already be injected via manifest.json at document_start');
    console.warn('[DeepCrawler] Ignoring this request to prevent overwriting the manifest injection');

    sendResponse({ success: false, error: 'Network interception already injected via manifest.json' });
    return true;
  }

  if (message.type === 'GET_CONNECTION_STATUS') {
    sendResponse({ status: connectionStatus });
    return true;
  }

  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }

  if (message.type === 'CRAWL_REQUEST') {
    handleCrawlRequest(sender.tab.id, message.data)
      .then(result => {
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'EXTRACT_DATA') {
    // Forward extraction request to content script in target tab
    chrome.tabs.sendMessage(message.targetTabId, {
      type: 'EXTRACT_DATA_REQUEST',
      selectors: message.selectors,
      requestId: message.requestId
    }).catch(err => console.warn('[DeepCrawler] Failed to send extraction request:', err));
    
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SCREENSHOT_REQUEST') {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (screenshotUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, screenshot: screenshotUrl });
      }
    });
    return true;
  }

  if (message.type === 'GET_CRAWL_NETWORK_REQUESTS') {
    // Return empty array - background script doesn't track network requests
    // All network requests are captured by the content script via network-interceptor.js
    sendResponse({ requests: [] });
    return false;
  }

  if (message.type === 'SEND_NETWORK_DATA') {
    // Forward network data from content script to backend
    console.log('[DeepCrawler] Received network data from content script:', message.requestId, 'with', message.networkRequests.length, 'requests');

    fetch(`${BACKEND_URL}/api/extension/crawl/data`, {
      method: 'PUT',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestId: message.requestId,
        networkRequests: message.networkRequests,
        action: 'add_requests'
      })
    })
      .then(response => {
        if (response.ok) {
          console.log('[DeepCrawler] Successfully forwarded network data to backend');
          sendResponse({ success: true, message: 'Data sent to backend', status: response.status });
        } else {
          console.warn('[DeepCrawler] Backend returned error:', response.status);
          // Pass the status code so content script can handle 410 (Gone) responses
          sendResponse({ success: false, error: `Backend error: ${response.status}`, status: response.status });
        }
      })
      .catch(error => {
        console.error('[DeepCrawler] Failed to send network data to backend:', error?.message || JSON.stringify(error));
        sendResponse({ success: false, error: error?.message || 'Unknown error' });
      });

    return true; // Keep channel open for async response
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

/**
 * Handle tab updates to track active tabs
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('[DeepCrawler] Tab loaded:', tabId, tab.url);
  }
});



/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  connectedTabs.delete(tabId);
  console.log('[DeepCrawler] Tab removed:', tabId);
});

/**
 * Wait for tab to load before sending START_CRAWL
 */
function waitForTabLoad(tabId, callback) {
  const maxWait = 10000; // 10 seconds
  const startTime = Date.now();
  let checkCount = 0;

  const checkLoad = () => {
    checkCount++;
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        console.warn('[DeepCrawler] Error checking tab status:', chrome.runtime.lastError);
        console.log('[DeepCrawler] Proceeding anyway after error');
        callback(); // Try anyway
        return;
      }

      if (tab && tab.status === 'complete') {
        console.log('[DeepCrawler] Tab loaded:', tabId, `(checked ${checkCount} times)`);
        // Wait a bit more to ensure content script is ready
        setTimeout(() => {
          console.log('[DeepCrawler] Waiting 500ms for content script to be ready...');
          callback();
        }, 500);
      } else if (Date.now() - startTime < maxWait) {
        if (checkCount % 5 === 0) {
          console.log(`[DeepCrawler] Tab still loading (${checkCount} checks, ${Date.now() - startTime}ms elapsed)...`);
        }
        setTimeout(checkLoad, 500);
      } else {
        console.warn('[DeepCrawler] Tab load timeout after', checkCount, 'checks, proceeding anyway');
        callback(); // Try anyway
      }
    });
  };

  checkLoad();
}

/**
 * Send START_CRAWL message to a specific tab
 */
function sendStartCrawlToTab(tabId, crawl) {
  console.log('[DeepCrawler] Sending START_CRAWL to tab', tabId, 'for crawl', crawl.requestId);
  console.log('[DeepCrawler] Crawl details:', {
    requestId: crawl.requestId,
    url: crawl.url,
    seedHost: crawl.seedHost,
    sameOriginOnly: crawl.sameOriginOnly,
    crawlMode: crawl.crawlMode,
    inactivityTimeout: crawl.inactivityTimeout
  });

  const messagePayload = {
    type: 'START_CRAWL',
    requestId: crawl.requestId,
    url: crawl.url,
    crawlMode: crawl.crawlMode || 'manual',
    inactivityTimeout: crawl.inactivityTimeout || 60
  };

  const sendMessage = () => {
    chrome.tabs.sendMessage(tabId, messagePayload, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[DeepCrawler] Failed to send START_CRAWL:', chrome.runtime.lastError);
        // Retry once after 1s
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, messagePayload, (response2) => {
            if (chrome.runtime.lastError) {
              console.warn('[DeepCrawler] Retry to send START_CRAWL failed:', chrome.runtime.lastError);
              processingCrawls.delete(crawl.requestId);
            } else {
              console.log('[DeepCrawler] START_CRAWL sent successfully on retry:', response2);
            }
          });
        }, 1000);
      } else {
        console.log('[DeepCrawler] START_CRAWL sent successfully, response:', response);
      }
    });
  };

  // CRITICAL FIX: Do NOT inject network interception here!
  // The manifest.json already injects network-interceptor.js at document_start with world: "MAIN"
  // Injecting again here would overwrite the manifest injection and create a new NETWORK_REQUESTS array
  // that only captures requests made AFTER this injection, missing all initial page load requests!
  // Instead, we rely on the manifest injection which runs at document_start before any page scripts
  console.log('[DeepCrawler] Network interception already injected via manifest.json at document_start');
  sendMessage();
}

/**
 * Setup message handlers for crawl tracking
 * Note: webRequest API is not available in Manifest V3 service workers
 * Instead, we rely on content script to capture network requests
 */
function setupMessageHandlers() {
  console.log('[DeepCrawler] Setting up message handlers for crawl tracking');

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_CRAWL_TRACKING') {
      const crawlId = request.requestId;
      console.log('[DeepCrawler] Crawl tracking started for:', crawlId);
      sendResponse({ success: true });
    } else if (request.type === 'STOP_CRAWL_TRACKING') {
      const crawlId = request.requestId;
      console.log('[DeepCrawler] Crawl tracking stopped for:', crawlId);
      sendResponse({ success: true });
    }
  });
}

/**
 * Initialize on extension load
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[DeepCrawler] Extension installed');
  setupMessageHandlers();
  loadSettingsAndInit();
});

/**
 * Initialize connection on startup
 */
setupMessageHandlers();
loadSettingsAndInit();

