/**
 * DeepCrawler Extension - Content Script
 * Injected into all pages to capture network requests and perform DOM operations
 */

// Version check - helps identify if extension is using old cached code
const CONTENT_SCRIPT_VERSION = '3.0.0-csp-bypass';
console.log('[DeepCrawler Content] Version:', CONTENT_SCRIPT_VERSION);

const NETWORK_REQUESTS = [];
const MAX_REQUESTS = 1000;
const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';
let currentCrawlRequestId = null;

/**
 * Inject network interception script using chrome.scripting.executeScript
 * This bypasses CSP restrictions by running in the MAIN world
 */
function setupNetworkInterception() {
  console.log('[DeepCrawler Content] Setting up network interception via chrome.scripting.executeScript');

  // Method 1: Listen for messages from the injected script via window.postMessage()
  window.addEventListener('message', (event) => {
    console.log('[DeepCrawler Content] Received postMessage event:', event.data?.type, 'source:', event.source === window ? 'SAME_WINDOW' : 'DIFFERENT_WINDOW');

    // Only accept messages from the same window
    if (event.source !== window) {
      console.log('[DeepCrawler Content] Ignoring message from different source');
      return;
    }

    if (event.data.type === 'DEEPCRAWLER_NETWORK_REQUEST') {
      if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
        NETWORK_REQUESTS.push(event.data.request);
        console.log('[DeepCrawler Content] Captured request:', event.data.request.method, event.data.request.url, event.data.request.status);
        console.log('[DeepCrawler Content] Total requests now:', NETWORK_REQUESTS.length);
      } else {
        console.log('[DeepCrawler Content] Max requests reached, ignoring new request');
      }
    } else {
      console.log('[DeepCrawler Content] Received unknown message type:', event.data?.type);
    }
  });

  // Method 2: Periodically check for requests in global variable (fallback)
  // This is more reliable than postMessage for cross-world communication
  setInterval(() => {
    try {
      const globalRequests = window.__deepcrawlerRequests;
      if (globalRequests && Array.isArray(globalRequests) && globalRequests.length > 0) {
        console.log('[DeepCrawler Content] Found', globalRequests.length, 'requests in global variable');

        // Copy new requests from global variable
        for (const request of globalRequests) {
          if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
            // Check if we already have this request
            const exists = NETWORK_REQUESTS.some(r => r.url === request.url && r.timestamp === request.timestamp);
            if (!exists) {
              NETWORK_REQUESTS.push(request);
              console.log('[DeepCrawler Content] Captured request from global:', request.method, request.url, request.status);
              console.log('[DeepCrawler Content] Total requests now:', NETWORK_REQUESTS.length);
            }
          }
        }
      }
    } catch (error) {
      // Silently ignore errors
    }
  }, 100);

  // Use chrome.scripting.executeScript to inject the network interception script
  // This bypasses CSP restrictions by running in the MAIN world
  const injectionCode = `
    (function() {
      console.log('[DeepCrawler] ===== INJECTED SCRIPT STARTING =====');
      console.log('[DeepCrawler] Running in context:', window === top ? 'MAIN' : 'IFRAME');
      console.log('[DeepCrawler] window.fetch exists:', typeof window.fetch);

      // Initialize global request storage
      if (!window.__deepcrawlerRequests) {
        window.__deepcrawlerRequests = [];
        console.log('[DeepCrawler] Created global __deepcrawlerRequests array');
      }

      const MAX_REQUESTS = 1000;
      let captureCount = 0;

      // Intercept fetch
      const originalFetch = window.fetch;
      console.log('[DeepCrawler] Original fetch:', typeof originalFetch);

      window.fetch = function(...args) {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;
        const method = (config?.method || 'GET').toUpperCase();
        const startTime = Date.now();

        console.log('[DeepCrawler] FETCH CALLED:', method, url);

        return originalFetch.apply(this, args)
          .then(response => {
            const duration = Date.now() - startTime;
            const contentLength = response.headers.get('content-length') || 0;
            const contentType = response.headers.get('content-type') || '';

            if (window.__deepcrawlerRequests.length < MAX_REQUESTS) {
              const request = {
                method,
                url,
                status: response.status,
                size: parseInt(contentLength, 10),
                contentType,
                timestamp: Date.now(),
                duration,
                type: 'fetch'
              };
              window.__deepcrawlerRequests.push(request);
              captureCount++;

              // Send to content script via postMessage (Method 1)
              console.log('[DeepCrawler] SENDING postMessage for fetch:', method, url);
              window.postMessage({
                type: 'DEEPCRAWLER_NETWORK_REQUEST',
                request: request
              }, '*');

              console.log('[DeepCrawler] Captured fetch #' + captureCount + ':', method, url, response.status);
            }

            return response;
          })
          .catch(error => {
            console.warn('[DeepCrawler] Fetch error:', error);
            throw error;
          });
      };

      // Intercept XMLHttpRequest
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      console.log('[DeepCrawler] Original XMLHttpRequest.open:', typeof originalOpen);
      console.log('[DeepCrawler] Original XMLHttpRequest.send:', typeof originalSend);

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        console.log('[DeepCrawler] XHR OPEN CALLED:', method, url);
        this._dcMethod = method;
        this._dcUrl = url;
        this._dcStartTime = Date.now();
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        console.log('[DeepCrawler] XHR SEND CALLED for:', this._dcMethod, this._dcUrl);
        const originalOnReadyStateChange = this.onreadystatechange;

        this.onreadystatechange = function() {
          if (this.readyState === 4) {
            const duration = Date.now() - this._dcStartTime;
            const contentLength = this.getResponseHeader('content-length') || 0;
            const contentType = this.getResponseHeader('content-type') || '';

            console.log('[DeepCrawler] XHR COMPLETED:', this._dcMethod, this._dcUrl, this.status);

            if (window.__deepcrawlerRequests.length < MAX_REQUESTS) {
              const request = {
                method: this._dcMethod,
                url: this._dcUrl,
                status: this.status,
                size: parseInt(contentLength, 10),
                contentType,
                timestamp: Date.now(),
                duration,
                type: 'xhr'
              };
              window.__deepcrawlerRequests.push(request);
              captureCount++;

              // Send to content script via postMessage (Method 1)
              console.log('[DeepCrawler] SENDING postMessage for XHR:', this._dcMethod, this._dcUrl);
              window.postMessage({
                type: 'DEEPCRAWLER_NETWORK_REQUEST',
                request: request
              }, '*');

              console.log('[DeepCrawler] Captured XHR #' + captureCount + ':', this._dcMethod, this._dcUrl, this.status);
            }
          }

          if (originalOnReadyStateChange) {
            return originalOnReadyStateChange.apply(this, arguments);
          }
        };

        return originalSend.apply(this, args);
      };

      console.log('[DeepCrawler] ===== NETWORK INTERCEPTION SETUP COMPLETE =====');
      console.log('[DeepCrawler] window.fetch patched:', window.fetch !== originalFetch);
      console.log('[DeepCrawler] XMLHttpRequest.open patched:', XMLHttpRequest.prototype.open !== originalOpen);
      console.log('[DeepCrawler] Global __deepcrawlerRequests array:', window.__deepcrawlerRequests.length, 'requests');
    })();
  `;

  // Send message to background script to inject the script
  // This allows us to use chrome.scripting.executeScript with the correct tab ID
  chrome.runtime.sendMessage({
    type: 'INJECT_NETWORK_INTERCEPTION',
    tabId: chrome.tabs.TAB_ID_NONE
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[DeepCrawler Content] Failed to send injection message:', chrome.runtime.lastError);
    } else {
      console.log('[DeepCrawler Content] Injection message sent to background script');
    }
  });

  // Also try direct injection as fallback
  try {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        (function() {
          console.log('[DeepCrawler] ===== INJECTED SCRIPT STARTING =====');
          console.log('[DeepCrawler] Running in context:', window === top ? 'MAIN' : 'IFRAME');
          console.log('[DeepCrawler] window.fetch exists:', typeof window.fetch);

          // Initialize global request storage
          if (!window.__deepcrawlerRequests) {
            window.__deepcrawlerRequests = [];
            console.log('[DeepCrawler] Created global __deepcrawlerRequests array');
          }

          const MAX_REQUESTS = 1000;
          let captureCount = 0;

          // Intercept fetch
          const originalFetch = window.fetch;
          console.log('[DeepCrawler] Original fetch:', typeof originalFetch);

          window.fetch = function(...args) {
            const [resource, config] = args;
            const url = typeof resource === 'string' ? resource : resource.url;
            const method = (config?.method || 'GET').toUpperCase();
            const startTime = Date.now();

            console.log('[DeepCrawler] FETCH CALLED:', method, url);

            return originalFetch.apply(this, args)
              .then(response => {
                const duration = Date.now() - startTime;
                const contentLength = response.headers.get('content-length') || 0;
                const contentType = response.headers.get('content-type') || '';

                if (window.__deepcrawlerRequests.length < MAX_REQUESTS) {
                  const request = {
                    method,
                    url,
                    status: response.status,
                    size: parseInt(contentLength, 10),
                    contentType,
                    timestamp: Date.now(),
                    duration,
                    type: 'fetch'
                  };
                  window.__deepcrawlerRequests.push(request);
                  captureCount++;

                  // Send to content script via postMessage (Method 1)
                  console.log('[DeepCrawler] SENDING postMessage for fetch:', method, url);
                  window.postMessage({
                    type: 'DEEPCRAWLER_NETWORK_REQUEST',
                    request: request
                  }, '*');

                  console.log('[DeepCrawler] Captured fetch #' + captureCount + ':', method, url, response.status);
                }

                return response;
              })
              .catch(error => {
                console.warn('[DeepCrawler] Fetch error:', error);
                throw error;
              });
          };

          // Intercept XMLHttpRequest
          const originalOpen = XMLHttpRequest.prototype.open;
          const originalSend = XMLHttpRequest.prototype.send;

          console.log('[DeepCrawler] Original XMLHttpRequest.open:', typeof originalOpen);
          console.log('[DeepCrawler] Original XMLHttpRequest.send:', typeof originalSend);

          XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            console.log('[DeepCrawler] XHR OPEN CALLED:', method, url);
            this._dcMethod = method;
            this._dcUrl = url;
            this._dcStartTime = Date.now();
            return originalOpen.apply(this, [method, url, ...rest]);
          };

          XMLHttpRequest.prototype.send = function(...args) {
            console.log('[DeepCrawler] XHR SEND CALLED for:', this._dcMethod, this._dcUrl);
            const originalOnReadyStateChange = this.onreadystatechange;

            this.onreadystatechange = function() {
              if (this.readyState === 4) {
                const duration = Date.now() - this._dcStartTime;
                const contentLength = this.getResponseHeader('content-length') || 0;
                const contentType = this.getResponseHeader('content-type') || '';

                console.log('[DeepCrawler] XHR COMPLETED:', this._dcMethod, this._dcUrl, this.status);

                if (window.__deepcrawlerRequests.length < MAX_REQUESTS) {
                  const request = {
                    method: this._dcMethod,
                    url: this._dcUrl,
                    status: this.status,
                    size: parseInt(contentLength, 10),
                    contentType,
                    timestamp: Date.now(),
                    duration,
                    type: 'xhr'
                  };
                  window.__deepcrawlerRequests.push(request);
                  captureCount++;

                  // Send to content script via postMessage (Method 1)
                  console.log('[DeepCrawler] SENDING postMessage for XHR:', this._dcMethod, this._dcUrl);
                  window.postMessage({
                    type: 'DEEPCRAWLER_NETWORK_REQUEST',
                    request: request
                  }, '*');

                  console.log('[DeepCrawler] Captured XHR #' + captureCount + ':', this._dcMethod, this._dcUrl, this.status);
                }
              }

              if (originalOnReadyStateChange) {
                return originalOnReadyStateChange.apply(this, arguments);
              }
            };

            return originalSend.apply(this, args);
          };

          console.log('[DeepCrawler] ===== NETWORK INTERCEPTION SETUP COMPLETE =====');
          console.log('[DeepCrawler] window.fetch patched:', window.fetch !== originalFetch);
          console.log('[DeepCrawler] XMLHttpRequest.open patched:', XMLHttpRequest.prototype.open !== originalOpen);
          console.log('[DeepCrawler] Global __deepcrawlerRequests array:', window.__deepcrawlerRequests.length, 'requests');
        })();
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[DeepCrawler Content] Failed to inject script:', chrome.runtime.lastError);
      } else {
        console.log('[DeepCrawler Content] Script injected successfully via chrome.scripting.executeScript');
      }
    });
  } catch (error) {
    console.error('[DeepCrawler Content] Error injecting script:', error);
  }

  console.log('[DeepCrawler Content] Network interception setup complete');
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
  return document.cookie
    .split(';')
    .map(c => c.trim())
    .filter(c => c)
    .map(c => {
      const [name, value] = c.split('=');
      return { name, value };
    });
}

/**
 * Get localStorage data
 */
function getLocalStorage() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

/**
 * Get sessionStorage data
 */
function getSessionStorage() {
  const data = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key) {
      data[key] = sessionStorage.getItem(key);
    }
  }
  return data;
}

/**
 * Get page metadata
 */
function getPageMetadata() {
  return {
    url: window.location.href,
    title: document.title,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    language: navigator.language,
    cookies: getCookies(),
    localStorage: getLocalStorage(),
    sessionStorage: getSessionStorage(),
    networkRequests: NETWORK_REQUESTS.slice(0, 100) // Send first 100 for efficiency
  };
}

/**
 * Send captured network requests to backend
 */
async function sendNetworkDataToBackend(requestId) {
  console.log('[DeepCrawler Content] Preparing to send network data...');
  console.log('[DeepCrawler Content] Total requests captured:', NETWORK_REQUESTS.length);

  if (NETWORK_REQUESTS.length === 0) {
    console.warn('[DeepCrawler Content] No network requests to send');
    return;
  }

  try {
    console.log('[DeepCrawler Content] Sending', NETWORK_REQUESTS.length, 'requests via background script...');

    // Send data to background script instead of directly to backend
    // This avoids CORS/COOP policy issues
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'SEND_NETWORK_DATA',
        requestId,
        networkRequests: NETWORK_REQUESTS
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.success) {
      console.log('[DeepCrawler Content] Successfully sent network data to backend:', response);
    } else {
      console.warn('[DeepCrawler Content] Failed to send network data:', response?.error);
    }
  } catch (error) {
    console.error('[DeepCrawler Content] Error sending network data:', error);
  }
}

/**
 * Wait for page to be fully loaded
 */
async function waitForPageLoad() {
  console.log('[DeepCrawler Content] Waiting for page load...');

  // Wait for document.readyState to be complete
  await new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(null);
    } else {
      window.addEventListener('load', () => resolve(null));
    }
  });

  // Additional wait for network to settle
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('[DeepCrawler Content] Page load complete');
}

/**
 * Perform user interactions to trigger API calls
 * Mirrors the exact logic from server-side crawl
 */
async function performUserInteractions() {
  console.log('[DeepCrawler Content] Starting user interactions');

  try {
    // Wait for page to be fully loaded first
    await waitForPageLoad();

    // Scroll to trigger lazy loading (exact same logic as server-side)
    console.log('[DeepCrawler Content] Starting scroll...');
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });

    console.log('[DeepCrawler Content] Scrolling completed');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on interactive elements (MATCH SERVER-SIDE: 3 elements per selector, 500ms wait)
    const clickableSelectors = [
      'button', 'a[href="#"]', '[onclick]', '[role="button"]',
      '.nav-link', '.menu-item', '.tab', '.dropdown-toggle',
      '[data-toggle]', '[data-action]', '.btn',
      // GitHub-specific selectors
      '.js-site-search-form', '.js-global-search-toggle',
      '.header-search-button', '.octicon-search',
      '.repo-list a', '.avatar', '.user-mention',
      // More generic interactive elements
      '[data-testid]', '[data-view-component]', '[data-action]',
      'a[href*="/api"]', 'a[href*="/search"]', 'a[href*="/user"]'
    ];

    console.log('[DeepCrawler Content] Starting clicks...');
    for (const selector of clickableSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // MATCH SERVER-SIDE: Click up to 3 elements per selector
          for (let i = 0; i < Math.min(3, elements.length); i++) {
            try {
              elements[i].click({ delay: 100 });
              // MATCH SERVER-SIDE: 500ms wait between clicks
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              // Continue if click fails
            }
          }
        }
      } catch (err) {
        // Continue if selector fails
      }
    }

    console.log('[DeepCrawler Content] Clicking completed');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger form interactions and searches (MATCH SERVER-SIDE)
    console.log('[DeepCrawler Content] Starting form interactions...');
    try {
      const forms = document.querySelectorAll('form');
      // MATCH SERVER-SIDE: Process up to 3 forms
      for (const form of Array.from(forms).slice(0, 3)) {
        const inputs = form.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], textarea');
        // MATCH SERVER-SIDE: Process up to 2 inputs per form
        for (const input of Array.from(inputs).slice(0, 2)) {
          try {
            // MATCH SERVER-SIDE: Use realistic test data
            const testInputs = ['react', 'javascript', 'python', 'test'];
            const randomInput = testInputs[Math.floor(Math.random() * testInputs.length)];

            input.focus();
            // Type with delay to trigger autocomplete
            for (const char of randomInput) {
              input.value += char;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            input.dispatchEvent(new Event('change', { bubbles: true }));
            // MATCH SERVER-SIDE: 500ms wait for autocomplete/search APIs
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try pressing Enter to trigger search
            try {
              input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
              input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', bubbles: true }));
              input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
              // MATCH SERVER-SIDE: 1000ms wait after Enter
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
              // Continue if Enter press fails
            }
          } catch (err) {
            // Continue if form interaction fails
          }
        }
      }

      // Try triggering search specifically (MATCH SERVER-SIDE)
      try {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.value = 'react';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          // MATCH SERVER-SIDE: 800ms wait for autocomplete APIs
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (err) {
        // Continue if search fails
      }
    } catch (err) {
      // Continue if form interaction fails
    }

    console.log('[DeepCrawler Content] Form interactions completed');
    // MATCH SERVER-SIDE: Final wait for any remaining API calls
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.warn('[DeepCrawler Content] Error during user interactions:', error);
  }
}

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DeepCrawler Content] Message received:', message.type);

  if (message.type === 'GET_PAGE_DATA') {
    sendResponse({
      success: true,
      data: getPageMetadata()
    });
    return true;
  }

  if (message.type === 'EXTRACT_DATA_REQUEST') {
    try {
      const extracted = extractData(message.selectors);
      sendResponse({
        success: true,
        requestId: message.requestId,
        data: extracted
      });
    } catch (error) {
      sendResponse({
        success: false,
        requestId: message.requestId,
        error: error.message
      });
    }
    return true;
  }

  if (message.type === 'NAVIGATE') {
    try {
      window.location.href = message.url;
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.type === 'EXECUTE_SCRIPT') {
    try {
      const result = eval(message.script);
      sendResponse({ success: true, result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.type === 'START_CRAWL') {
    currentCrawlRequestId = message.requestId;
    console.log('[DeepCrawler Content] Starting crawl:', currentCrawlRequestId);
    console.log('[DeepCrawler Content] Current URL:', window.location.href);
    console.log('[DeepCrawler Content] Network requests captured so far:', NETWORK_REQUESTS.length);

    // Perform interactions and send data
    (async () => {
      try {
        console.log('[DeepCrawler Content] Performing user interactions...');
        await performUserInteractions();

        console.log('[DeepCrawler Content] Interactions complete, waiting for final requests...');
        // MATCH SERVER-SIDE: Wait 3 seconds for final API calls
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('[DeepCrawler Content] Total network requests captured:', NETWORK_REQUESTS.length);
        console.log('[DeepCrawler Content] Sending network data to backend...');
        await sendNetworkDataToBackend(currentCrawlRequestId);

        console.log('[DeepCrawler Content] Crawl complete, sent', NETWORK_REQUESTS.length, 'requests');
        sendResponse({ success: true, requestCount: NETWORK_REQUESTS.length });
      } catch (error) {
        console.error('[DeepCrawler Content] Crawl error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Keep channel open for async response
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

/**
 * Initialize content script
 */
function initialize() {
  console.log('[DeepCrawler Content] ===== INITIALIZING CONTENT SCRIPT =====');
  console.log('[DeepCrawler Content] Page URL:', window.location.href);
  console.log('[DeepCrawler Content] Document readyState:', document.readyState);
  console.log('[DeepCrawler Content] Setting up network interception...');

  setupNetworkInterception();

  console.log('[DeepCrawler Content] Network interception setup complete');

  // Notify background script that content script is ready
  chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    url: window.location.href
  }).catch(err => console.warn('[DeepCrawler] Failed to notify background:', err));
}

// Initialize as early as possible
console.log('[DeepCrawler Content] Content script loaded, document.readyState:', document.readyState);

// Try to initialize immediately if document is already interactive
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('[DeepCrawler Content] Document already interactive/complete, initializing immediately');
  initialize();
} else if (document.readyState === 'loading') {
  console.log('[DeepCrawler Content] Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
}

