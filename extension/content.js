/**
 * DeepCrawler Extension - Content Script v3
 * Fixed CSP bypass using chrome.scripting.executeScript
 */

const CONTENT_SCRIPT_VERSION = '3.0.0-csp-bypass-fixed';
console.log('[DeepCrawler Content] Version:', CONTENT_SCRIPT_VERSION);
// CRITICAL FIX: Do NOT request MAIN-world interception injection from background!
// The manifest.json already injects network-interceptor.js at document_start with world: "MAIN"
// Requesting injection here would cause the background script to inject AFTER page load,
// overwriting the manifest injection and creating a new NETWORK_REQUESTS array that only
// captures requests made AFTER the injection, missing all initial page load requests!
console.log('[DeepCrawler Content] Network interception already injected via manifest.json at document_start');


const NETWORK_REQUESTS = [];
const MAX_REQUESTS = 5000; // Increased from 1000 to capture more requests
let BACKEND_URL = 'http://localhost:3002';
let EXTENSION_API_KEY = 'deepcrawler-extension-v1';
let currentCrawlRequestId = null;

// Load settings from chrome.storage.sync so dev/prod hosts and keys work
(function loadSettings() {
  try {
    if (!chrome?.storage?.sync) {
      console.warn('[DeepCrawler Content] chrome.storage.sync not available; using defaults');
      return;
    }
    const DEFAULTS = { backendUrl: 'http://localhost:3002', extensionKey: 'deepcrawler-extension-v1' };
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      if (settings?.backendUrl) BACKEND_URL = settings.backendUrl;
      if (settings?.extensionKey) EXTENSION_API_KEY = settings.extensionKey;
      console.log('[DeepCrawler Content] Settings loaded', { BACKEND_URL, EXTENSION_API_KEY });
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
          if (changes.backendUrl?.newValue) BACKEND_URL = changes.backendUrl.newValue;
          if (changes.extensionKey?.newValue) EXTENSION_API_KEY = changes.extensionKey.newValue;
          console.log('[DeepCrawler Content] Settings updated', { BACKEND_URL, EXTENSION_API_KEY });
        }
      });
    }
  } catch (e) {
    console.warn('[DeepCrawler Content] Failed to load settings; using defaults', e);
  }
})();
let isCrawling = false;
let lastSentRequestCount = 0;
let crawlSubmissionInterval = null;
// Generation token to invalidate stale send loops when a new crawl starts
let crawlGeneration = 0;
let crawlMode = 'manual'; // Default to manual mode (no automated interactions)

/**
 * Network interceptor is now injected directly via manifest.json with world: "MAIN"
 * This ensures it runs before any page scripts execute
 */


/**
 * Setup network interception by listening for messages from injected script
 */
function setupNetworkInterception() {
  console.log('[DeepCrawler Content] Setting up network interception listeners');

  // Listen for messages from the injected script via window.postMessage()
  // Note: When injected via manifest.json with world: "MAIN", the source will be the MAIN world window
  // We need to accept messages from any source that has the correct message type
  let messageCount = 0;
  window.addEventListener('message', (event) => {
    // Accept messages from the MAIN world (injected script)
    // The event.source check is not reliable across worlds, so we check the message type instead
    if (event.data && event.data.type && event.data.type.startsWith('DEEPCRAWLER')) {
      console.log('[DeepCrawler Content] Received message type:', event.data.type);
    }
    if (event.data && event.data.type === 'DEEPCRAWLER_NETWORK_REQUEST') {
      messageCount++;
      if (messageCount <= 5 || messageCount % 10 === 0) {
        console.log(`[DeepCrawler Content] Message #${messageCount} received: ${event.data.request.method} ${event.data.request.url}`);
      }

      if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
        NETWORK_REQUESTS.push(event.data.request);
        if (messageCount <= 5 || messageCount % 10 === 0) {
          console.log('[DeepCrawler Content] Captured request:', event.data.request.method, event.data.request.url, `(${NETWORK_REQUESTS.length} total)`);
        }
      } else {
        console.warn('[DeepCrawler Content] Max requests reached, dropping request:', event.data.request.url);
      }
    } else if (event.data && event.data.type === 'DEEPCRAWLER_START_CRAWL') {
      // Handle START_CRAWL message from page context (for Playwright testing)
      console.log('[DeepCrawler Content] START_CRAWL message received from page context:', event.data.requestId);
      handleStartCrawl(event.data);
    } else if (event.data && event.data.type === 'DEEPCRAWLER_START_CRAWL_FROM_INTERCEPTOR') {
      // Handle START_CRAWL message forwarded from network interceptor (for Playwright testing)
      console.log('[DeepCrawler Content] START_CRAWL message received from interceptor:', event.data.requestId);
      handleStartCrawl(event.data);
    } else if (event.data && event.data.type) {
      // Log other message types for debugging
      if (messageCount % 100 === 0) {
        console.debug('[DeepCrawler Content] Received non-network message:', event.data.type);
      }
    }
  });

  // Periodically check for requests in global variable (fallback)
  let lastStartCrawlTimestamp = 0;
  setInterval(() => {
    try {
      const globalRequests = window.__deepcrawlerRequests;
      if (globalRequests && Array.isArray(globalRequests) && globalRequests.length > 0) {
        for (const request of globalRequests) {
          if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
            const exists = NETWORK_REQUESTS.some(r => r.url === request.url && r.timestamp === request.timestamp);
            if (!exists) {
              NETWORK_REQUESTS.push(request);
              console.log('[DeepCrawler Content] Captured request from global:', request.method, request.url);
            }
          }
        }
      }

      // Check for START_CRAWL message in global variable (for Playwright testing)
      const startCrawlMessage = window.__deepcrawlerStartCrawl;
      if (startCrawlMessage) {
        if (startCrawlMessage.timestamp > lastStartCrawlTimestamp) {
          console.log('[DeepCrawler Content] START_CRAWL message found in global variable:', startCrawlMessage.requestId);
          lastStartCrawlTimestamp = startCrawlMessage.timestamp;
          handleStartCrawl(startCrawlMessage);
        }
      }
    } catch (error) {
      // Silently ignore
    }
  }, 100);

  console.log('[DeepCrawler Content] Network interception listeners setup complete');
}

/**
 * Extract data from page using CSS selectors
 */
function extractData(selectors) {
  const results = {};
  for (const [key, selector] of Object.entries(selectors)) {
    try {
      const elements = document.querySelectorAll(selector);
      results[key] = Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        attributes: Object.fromEntries(
          Array.from(el.attributes).map(attr => [attr.name, attr.value])
        )
      }));
    } catch (error) {
      console.warn(`[DeepCrawler] Failed to extract selector "${selector}":`, error);
      results[key] = [];
    }
  }
  return results;
}

/**
 * Get all cookies for current domain
 */
function getCookies() {
  return document.cookie.split(';').map(c => {
    const [name, value] = c.split('=');
    return { name: name.trim(), value: value?.trim() };
  });
}

/**
 * Get all local storage items
 */
function getLocalStorage() {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items[key] = localStorage.getItem(key);
  }
  return items;
}

/**
 * Get all session storage items
 */
function getSessionStorage() {
  const items = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    items[key] = sessionStorage.getItem(key);
  }
  return items;
}

/**
 * Fetch captured network requests from background script
 */
async function fetchBackgroundNetworkRequests(crawlId) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({
        type: 'GET_CRAWL_NETWORK_REQUESTS',
        requestId: crawlId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[DeepCrawler Content] Failed to fetch background requests:', chrome.runtime.lastError);
          resolve([]);
        } else if (response && response.requests) {
          resolve(response.requests);
        } else {
          resolve([]);
        }
      });
    } catch (error) {
      console.warn('[DeepCrawler Content] Error fetching background requests:', error);
      resolve([]);
    }
  });
}

/**
 * Send captured network requests to backend via background script
 * This avoids CORS issues when the page is on a different origin
 * Falls back to direct fetch if background script is not available
 */
async function sendNetworkDataToBackend() {
  // Do not send if no active crawl or nothing new to send
  if (!isCrawling) {
    if (Math.random() < 0.05) {
      console.debug('[DeepCrawler Content] Not crawling, skipping send');
    }
    return;
  }

  if (!currentCrawlRequestId) {
    console.warn('[DeepCrawler Content] No crawl request ID set');
    return;
  }

  if (Math.random() < 0.05) {
    console.debug(`[DeepCrawler Content] sendNetworkDataToBackend called for crawl ${currentCrawlRequestId}`);
  }

  // Fetch requests captured by background script's webRequest listener
  const backgroundRequests = await fetchBackgroundNetworkRequests(currentCrawlRequestId);

  // Merge background requests with content script requests (avoid duplicates)
  for (const bgReq of backgroundRequests) {
    const isDuplicate = NETWORK_REQUESTS.some(r =>
      r.url === bgReq.url &&
      r.method === bgReq.method &&
      Math.abs(r.timestamp - bgReq.timestamp) < 500 // Within 500ms
    );
    if (!isDuplicate) {
      NETWORK_REQUESTS.push(bgReq);
    }
  }

  if (NETWORK_REQUESTS.length === 0) {
    // Log this less frequently to avoid spam
    if (Math.random() < 0.1) {
      console.debug('[DeepCrawler Content] No network requests captured yet');
    }
    return;
  }

  // Capture current requestId and generation to detect staleness across awaits
  const requestId = currentCrawlRequestId;
  const myGeneration = crawlGeneration;

  // Only send new requests since last submission
  const newRequests = NETWORK_REQUESTS.slice(lastSentRequestCount);
  if (newRequests.length === 0) {
    // Log this less frequently to avoid spam
    if (Math.random() < 0.1) {
      console.debug('[DeepCrawler Content] No new requests to send');
    }
    return;
  }

  try {
    console.log(`[DeepCrawler Content] Sending ${newRequests.length} new network requests to backend for crawl ${requestId}`);
    console.log(`[DeepCrawler Content] Total captured: ${NETWORK_REQUESTS.length}, Already sent: ${lastSentRequestCount}`);
    console.log('[DeepCrawler Content] Sample requests:', newRequests.slice(0, 3).map(r => `${r.method} ${r.url}`));

    // Try to send through background script first (with timeout)
    let sentViaBackground = false;
    try {
      await Promise.race([
        new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'SEND_NETWORK_DATA',
            requestId,
            networkRequests: newRequests,
            action: 'add_requests'
          }, (response) => {
            // If a new crawl started while we were awaiting, discard results
            if (myGeneration !== crawlGeneration || requestId !== currentCrawlRequestId) {
              console.warn(`[DeepCrawler Content] Discarding response for stale crawl ${requestId}`);
              resolve();
              return;
            }

            if (chrome.runtime.lastError) {
              console.warn(`[DeepCrawler Content] Background script error:`, chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError));
              resolve();
              return;
            }

            if (response && response.success) {
              lastSentRequestCount = NETWORK_REQUESTS.length;
              console.log(`[DeepCrawler Content] Successfully sent network data via background script`);
              sentViaBackground = true;
            } else if (response && (response.status === 404 || response.status === 410)) {
              console.warn(`[DeepCrawler Content] Backend session not found or expired for ${requestId} (status: ${response.status}). Stopping crawl.`);
              stopCrawl('session_not_found');
            } else {
              console.warn(`[DeepCrawler Content] Background script failed:`, response);
            }
            resolve();
          });
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('background_timeout')), 2000))
      ]);
    } catch (error) {
      console.warn(`[DeepCrawler Content] Background script unavailable or timeout:`, error.message);
    }

    // If background script didn't work, try direct fetch (fallback for Playwright)
    if (!sentViaBackground) {
      console.log(`[DeepCrawler Content] Falling back to direct fetch to backend...`);
      try {
        const response = await fetch('http://localhost:3002/api/extension/crawl/data', {
          method: 'PUT',
          headers: {
            'X-Extension-Key': 'deepcrawler-extension-v1',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requestId,
            networkRequests: newRequests,
            action: 'add_requests'
          })
        });

        if (response.ok) {
          lastSentRequestCount = NETWORK_REQUESTS.length;
          console.log(`[DeepCrawler Content] Successfully sent network data via direct fetch`);
        } else if (response.status === 404 || response.status === 410) {
          console.warn(`[DeepCrawler Content] Backend session not found or expired for ${requestId} (status: ${response.status}). Stopping crawl.`);
          stopCrawl('session_not_found');
        } else {
          console.warn(`[DeepCrawler Content] Direct fetch failed with status:`, response.status);
        }
      } catch (error) {
        console.error(`[DeepCrawler Content] Direct fetch error:`, error?.message || JSON.stringify(error));
      }
    }
  } catch (error) {
    console.error(`[DeepCrawler Content] Error sending network data:`, error?.message || JSON.stringify(error));
  }
}


/**
 * Stop current crawl cleanly and reset state
 */
function stopCrawl(reason) {
  try {
    if (crawlSubmissionInterval) {
      clearInterval(crawlSubmissionInterval);
      crawlSubmissionInterval = null;
    }
  } catch (_) {}
  isCrawling = false;
  currentCrawlRequestId = null;
  lastSentRequestCount = 0;
  console.log(`[DeepCrawler Content] Crawl stopped${reason ? ' - ' + reason : ''}`);
}

// Ensure we clean up on page unload/navigation
window.addEventListener('beforeunload', () => stopCrawl('page_unload'));


/**
 * Handle START_CRAWL message (extracted for reuse from both background and page context)
 */
async function handleStartCrawl(message) {
  console.log(`[DeepCrawler Content] START_CRAWL received for crawl ${message.requestId}`);
  console.log(`[DeepCrawler Content] Current NETWORK_REQUESTS count: ${NETWORK_REQUESTS.length}`);
  console.log(`[DeepCrawler Content] Page URL: ${window.location.href}`);
  console.log(`[DeepCrawler Content] Document ready state: ${document.readyState}`);

  // CRITICAL FIX: Notify background script to start tracking network requests
  // This activates the webRequest listener for this crawl
  try {
    chrome.runtime.sendMessage({
      type: 'START_CRAWL_TRACKING',
      requestId: message.requestId
    }, (_response) => {
      if (chrome.runtime.lastError) {
        console.warn('[DeepCrawler Content] Failed to notify background of crawl start:', chrome.runtime.lastError);
      } else {
        console.log('[DeepCrawler Content] Background script notified to start tracking');
      }
    });
  } catch (error) {
    console.warn('[DeepCrawler Content] Error notifying background script:', error);
  }

  // CRITICAL FIX: Retrieve requests captured during page load
  // The page makes most requests during initial load, before START_CRAWL is sent
  // We need to capture those requests from the network-interceptor.js via window.postMessage
  try {
    console.log(`[DeepCrawler Content] Requesting network requests from network-interceptor.js...`);

    // Send a message to the network-interceptor.js to get the captured requests
    console.log(`[DeepCrawler Content] Sending GET_NETWORK_REQUESTS message to page context...`);
    window.postMessage({
      type: 'DEEPCRAWLER_GET_NETWORK_REQUESTS'
    }, window.location.origin);

    // Wait for the response (with timeout)
    const pageLoadRequests = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`[DeepCrawler Content] Timeout waiting for network requests from network-interceptor.js`);
        resolve([]);
      }, 2000);

      const handler = (event) => {
        console.log(`[DeepCrawler Content] Message received:`, event.data?.type);
        if (event.data && event.data.type === 'DEEPCRAWLER_NETWORK_REQUESTS_RESPONSE') {
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          console.log(`[DeepCrawler Content] Received ${event.data.requests.length} requests from network-interceptor.js`);
          resolve(event.data.requests || []);
        }
      };

      window.addEventListener('message', handler);
      console.log(`[DeepCrawler Content] Listening for DEEPCRAWLER_NETWORK_REQUESTS_RESPONSE message...`);
    });

    console.log(`[DeepCrawler Content] Found ${pageLoadRequests.length} requests from page load`);

    // Add page load requests to NETWORK_REQUESTS (avoid duplicates)
    for (const req of pageLoadRequests) {
      const isDuplicate = NETWORK_REQUESTS.some(r =>
        r.url === req.url &&
        Math.abs(r.timestamp - req.timestamp) < 100 // Within 100ms
      );
      if (!isDuplicate) {
        NETWORK_REQUESTS.push(req);
        if (NETWORK_REQUESTS.length <= 10) {
          console.log(`[DeepCrawler Content] Added page load request: ${req.method} ${req.url}`);
        }
      }
    }

    console.log(`[DeepCrawler Content] Total NETWORK_REQUESTS after page load retrieval: ${NETWORK_REQUESTS.length}`);
  } catch (error) {
    console.warn(`[DeepCrawler Content] Error retrieving page load requests:`, error);
  }

  // Fully stop any previous crawl and invalidate stale send loops
  if (crawlSubmissionInterval) {
    clearInterval(crawlSubmissionInterval);
    crawlSubmissionInterval = null;
  }
  isCrawling = false; // ensure a clean state before starting

  // Initialize new crawl state
  currentCrawlRequestId = message.requestId;
  lastSentRequestCount = 0;
  // DO NOT clear NETWORK_REQUESTS - keep requests captured before START_CRAWL
  // NETWORK_REQUESTS.length = 0;
  crawlGeneration += 1;

  // Extract crawl mode from message (default to manual)
  crawlMode = message.crawlMode || 'manual';
  console.log(`[DeepCrawler Content] Crawl mode: ${crawlMode}`);

  // SECONDARY FIX: Trigger page interactions to capture additional requests
  // Only in AUTO mode - in MANUAL mode, user controls interactions
  if (crawlMode === 'auto') {
    (async () => {
      try {
        console.log(`[DeepCrawler Content] Triggering page interactions to capture additional requests`);

        // Prevent navigation by intercepting link clicks
        const preventNavigation = (e) => {
          if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`[DeepCrawler Content] Prevented navigation to ${e.target.href}`);
          }
        };
        document.addEventListener('click', preventNavigation, true);

        try {
          // Phase 1: Gentle scrolling to trigger lazy loading
          console.log(`[DeepCrawler Content] Phase 1: Scrolling to trigger lazy loading`);
          const scrollHeight = document.body.scrollHeight;
          const viewportHeight = window.innerHeight;
          const scrollSteps = Math.min(10, Math.ceil(scrollHeight / viewportHeight));

          for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i <= scrollSteps; i++) {
              window.scrollTo(0, (scrollHeight / scrollSteps) * i);
              await new Promise(resolve => setTimeout(resolve, 150));
            }
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Phase 2: Click safe interactive elements (buttons, tabs, not links)
          console.log(`[DeepCrawler Content] Phase 2: Clicking safe interactive elements`);
          const buttons = document.querySelectorAll('button, [role="button"], [role="tab"], [role="menuitem"]');
          for (let i = 0; i < Math.min(15, buttons.length); i++) {
            const el = buttons[i];
            try {
              // Skip if element is not visible
              if (!el.offsetParent) continue;

              const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
              el.dispatchEvent(clickEvent);
              await new Promise(resolve => setTimeout(resolve, 250));
            } catch (e) {
              // Silently ignore errors for individual elements
            }
          }

          // Phase 3: Trigger input events on search/filter fields
          console.log(`[DeepCrawler Content] Phase 3: Triggering input events`);
          const inputElements = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
          for (let i = 0; i < Math.min(5, inputElements.length); i++) {
            const el = inputElements[i];
            try {
              if (!el.offsetParent) continue; // Skip hidden elements
              el.focus();
              el.value = 'test';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 300));
              el.value = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 150));
            } catch (e) {
              // Silently ignore errors
            }
          }

          // Phase 4: Trigger select/dropdown changes
          console.log(`[DeepCrawler Content] Phase 4: Triggering select changes`);
          const selectElements = document.querySelectorAll('select');
          for (let i = 0; i < Math.min(5, selectElements.length); i++) {
            const el = selectElements[i];
            try {
              if (!el.offsetParent) continue; // Skip hidden elements
              const options = el.querySelectorAll('option');
              if (options.length > 1) {
                el.value = options[1].value;
                el.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            } catch (e) {
              // Silently ignore errors
            }
          }

          // Phase 5: Final scroll to bottom to catch remaining lazy-loaded content
          console.log(`[DeepCrawler Content] Phase 5: Final scroll to bottom`);
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.scrollTo(0, 0);

          // Phase 6: Multiple final scroll passes to catch any remaining lazy-loaded content
          console.log(`[DeepCrawler Content] Phase 6: Multiple final aggressive scroll passes`);
          for (let pass = 0; pass < 2; pass++) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 1000));
            window.scrollTo(0, 0);
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // Phase 7: Keyboard events on input fields to trigger additional API calls
          console.log(`[DeepCrawler Content] Phase 7: Triggering keyboard events`);
          const keyboardInputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
          for (let i = 0; i < Math.min(5, keyboardInputs.length); i++) {
            const el = keyboardInputs[i];
            try {
              if (!el.offsetParent) continue; // Skip hidden elements
              el.focus();
              el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (e) {
              // Silently ignore errors
            }
          }

          console.log(`[DeepCrawler Content] All page interactions completed successfully`);
        } finally {
          // Remove navigation prevention listener
          document.removeEventListener('click', preventNavigation, true);
        }
      } catch (error) {
        console.warn(`[DeepCrawler Content] Error triggering page interactions:`, error);
      }
    })();
  } else {
    console.log(`[DeepCrawler Content] Manual mode: waiting for user interactions`);
  }

  // Begin sending for this crawl
  isCrawling = true;
  crawlSubmissionInterval = setInterval(() => {
    sendNetworkDataToBackend();
  }, 250); // Increased frequency from 500ms to 250ms for faster data transmission
}

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[DeepCrawler Content] Message received:', message.type);

  if (message.type === 'GET_PAGE_DATA') {
    const pageData = {
      url: window.location.href,
      title: document.title,
      cookies: getCookies(),
      localStorage: getLocalStorage(),
      sessionStorage: getSessionStorage(),
      networkRequests: NETWORK_REQUESTS,
      data: message.selectors ? extractData(message.selectors) : {}
    };
    sendResponse(pageData);
  } else if (message.type === 'GET_NETWORK_REQUESTS') {
    sendResponse({ requests: NETWORK_REQUESTS });
  } else if (message.type === 'CLEAR_NETWORK_REQUESTS') {
    NETWORK_REQUESTS.length = 0;
    lastSentRequestCount = 0;
    sendResponse({ success: true });
  } else if (message.type === 'SET_CRAWL_REQUEST_ID') {
    currentCrawlRequestId = message.requestId;
    sendResponse({ success: true });
  } else if (message.type === 'START_CRAWL') {
    handleStartCrawl(message);
    sendResponse({ success: true, message: 'Crawl started' });
  } else if (message.type === 'STOP_CRAWL') {
    console.log(`[DeepCrawler Content] STOP_CRAWL received`);

    // Stop periodic sends first
    if (crawlSubmissionInterval) {
      clearInterval(crawlSubmissionInterval);
      crawlSubmissionInterval = null;
    }

    // Send any remaining data before marking crawl stopped
    // Use async sendResponse pattern
    sendNetworkDataToBackend()
      .catch(() => {})
      .finally(() => {
        stopCrawl('stop_message');
        sendResponse({ success: true, message: 'Crawl stopped' });
      });
    return true; // keep the message channel open for async sendResponse
  }
});

/**
 * Initialize content script
 */
console.log('[DeepCrawler Content] Content script loaded, document.readyState:', document.readyState);

// Network interceptor is already injected via manifest.json with world: "MAIN"
// Setup listeners to receive network requests from the injected script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[DeepCrawler Content] DOMContentLoaded fired');
    setupNetworkInterception();
  });
} else {
  console.log('[DeepCrawler Content] Document already loaded');
  setupNetworkInterception();
}

