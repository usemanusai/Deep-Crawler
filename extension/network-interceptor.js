/**
 * DeepCrawler Network Interceptor - ENHANCED VERSION
 * This script runs in the page's MAIN world and intercepts ALL network requests
 * It uses multiple interception methods to ensure comprehensive capture
 */

(function() {
  'use strict';

  const NETWORK_REQUESTS = [];
  const MAX_REQUESTS = 10000; // Increased from 5000 to capture more requests
  let requestCounter = 0;

  console.log('[DeepCrawler] Network interceptor script loaded in page context');

  // Method 1: Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    requestCounter++;
    const currentId = requestCounter;
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = (config?.method || 'GET').toUpperCase();
    const startTime = Date.now();

    if (currentId <= 10) {
      console.log(`[DeepCrawler] Fetch #${currentId}: ${method} ${url}`);
    }

    // Log blob: and data: URLs for debugging
    if (url && (url.startsWith('blob:') || url.startsWith('data:'))) {
      console.log(`[DeepCrawler] Captured special URL: ${method} ${url.substring(0, 100)}...`);
    }

    return originalFetch.apply(this, args)
      .then(response => {
        const duration = Date.now() - startTime;
        const contentLength = response.headers.get('content-length') || 0;
        const contentType = response.headers.get('content-type') || '';

        if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
          const request = {
            method,
            url,
            status: response.status,
            size: parseInt(contentLength, 10),
            contentType,
            timestamp: startTime,
            duration,
            type: 'fetch',
            id: currentId
          };
          NETWORK_REQUESTS.push(request);

          // Send to content script via postMessage
          try {
            window.postMessage({
              type: 'DEEPCRAWLER_NETWORK_REQUEST',
              request: request
            }, '*');
          } catch (e) {
            // Silently ignore postMessage errors
          }

          if (NETWORK_REQUESTS.length <= 10 || NETWORK_REQUESTS.length % 50 === 0) {
            console.log(`[DeepCrawler] Captured: ${method} ${url} ${response.status} (${NETWORK_REQUESTS.length} total)`);
          }
        }

        return response;
      })
      .catch(error => {
        if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
          NETWORK_REQUESTS.push({
            method,
            url,
            status: 0,
            error: error.message,
            timestamp: startTime,
            type: 'fetch',
            id: currentId
          });
        }
        throw error;
      });
  };

  // Copy properties from original fetch
  Object.defineProperty(window, 'fetch', {
    value: window.fetch,
    writable: true,
    configurable: true
  });

  // Method 2: Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._dcMethod = method;
    this._dcUrl = url;
    this._dcStartTime = Date.now();
    this._dcId = ++requestCounter;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const self = this;
    const originalOnReadyStateChange = this.onreadystatechange;

    this.onreadystatechange = function() {
      if (this.readyState === 4) {
        const duration = Date.now() - self._dcStartTime;
        const contentLength = this.getResponseHeader('content-length') || 0;
        const contentType = this.getResponseHeader('content-type') || '';

        if (NETWORK_REQUESTS.length < MAX_REQUESTS) {
          const request = {
            method: self._dcMethod,
            url: self._dcUrl,
            status: this.status,
            size: parseInt(contentLength, 10),
            contentType,
            timestamp: self._dcStartTime,
            duration,
            type: 'xhr',
            id: self._dcId
          };
          NETWORK_REQUESTS.push(request);

          // Send to content script via postMessage
          try {
            window.postMessage({
              type: 'DEEPCRAWLER_NETWORK_REQUEST',
              request: request
            }, '*');
          } catch (e) {
            // Silently ignore postMessage errors
          }

          if (NETWORK_REQUESTS.length <= 10 || NETWORK_REQUESTS.length % 50 === 0) {
            console.log(`[DeepCrawler] Captured: ${self._dcMethod} ${self._dcUrl} ${this.status} (${NETWORK_REQUESTS.length} total)`);
          }
        }
      }

      if (originalOnReadyStateChange) {
        return originalOnReadyStateChange.apply(this, arguments);
      }
    };

    return originalSend.apply(this, args);
  };

  // Method 3: Store in global for direct access
  window.__deepcrawlerRequests = NETWORK_REQUESTS;

  // Method 4: Expose function to get requests
  window.__deepcrawlerGetRequests = function() {
    return NETWORK_REQUESTS.slice();
  };

  // Method 5: Expose function to get request count
  window.__deepcrawlerGetRequestCount = function() {
    return NETWORK_REQUESTS.length;
  };

  console.log('[DeepCrawler] Network interception setup complete');
  console.log('[DeepCrawler] Fetch interceptor: ✓');
  console.log('[DeepCrawler] XHR interceptor: ✓');
  console.log('[DeepCrawler] Global access: ✓');
})();

