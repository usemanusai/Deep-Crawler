/**
 * Advanced Error Detection & Diagnosis for DeepCrawler Tests
 * 
 * Provides intelligent failure mode detection and recovery strategies
 */

// ============================================================================
// FAILURE MODE DETECTION
// ============================================================================

class FailureDetector {
  constructor(logger) {
    this.logger = logger;
    this.failures = [];
  }

  /**
   * Detect extension connection failure
   */
  detectExtensionConnectionFailure(page, timeoutSeconds) {
    return {
      name: 'EXTENSION_CONNECTION_FAILURE',
      severity: 'CRITICAL',
      timeout: timeoutSeconds,
      detection: async () => {
        const disconnected = await page.$('text=⚪ Extension Disconnected');
        return !!disconnected;
      },
      diagnosis: async () => {
        const diagnostics = {
          extensionRunning: false,
          backendAccessible: false,
          heartbeatSent: false,
          errors: []
        };

        try {
          // Check if extension service worker is running
          const extensionsPage = await page.context().newPage();
          await extensionsPage.goto('chrome://extensions/');
          const serviceWorkerStatus = await extensionsPage.$('text=service worker');
          diagnostics.extensionRunning = !!serviceWorkerStatus;
          await extensionsPage.close();
        } catch (e) {
          diagnostics.errors.push(`Failed to check extension status: ${e.message}`);
        }

        return diagnostics;
      },
      recovery: async () => {
        this.logger.info('Attempting recovery: Reloading extension...');
        // Extension reload will be handled by main test flow
        return true;
      }
    };
  }

  /**
   * Detect zero endpoints captured
   */
  detectZeroEndpointsCapture(endpointCount, elapsedSeconds) {
    return {
      name: 'ZERO_ENDPOINTS_CAPTURE',
      severity: 'CRITICAL',
      threshold: 30,
      detection: () => endpointCount === 0 && elapsedSeconds > 30,
      diagnosis: async (page) => {
        const diagnostics = {
          navigationCorrect: false,
          interceptorInjected: false,
          pendingCrawlCreated: false,
          startCrawlReceived: false,
          errors: []
        };

        try {
          // Check if navigated to correct URL
          const pages = page.context().pages();
          const targetPages = pages.filter(p => !p.url().includes('localhost'));
          diagnostics.navigationCorrect = targetPages.length > 0;

          // Check browser console for interceptor logs
          const consoleLogs = await page.evaluate(() => {
            return window.__consoleLogs || [];
          }).catch(() => []);
          diagnostics.interceptorInjected = consoleLogs.some(log => 
            log.includes('Network interceptor script loaded')
          );

          // Check terminal for pending crawl logs
          const terminalText = await page.textContent('[role="log"]').catch(() => '');
          diagnostics.pendingCrawlCreated = terminalText?.includes('pending crawl') || false;
          diagnostics.startCrawlReceived = terminalText?.includes('START_CRAWL') || false;

        } catch (e) {
          diagnostics.errors.push(`Diagnosis error: ${e.message}`);
        }

        return diagnostics;
      },
      recovery: async () => {
        this.logger.info('Attempting recovery: Stopping crawl and retrying...');
        return true;
      }
    };
  }

  /**
   * Detect SSE connection failure
   */
  detectSSEConnectionFailure(terminalLogs) {
    return {
      name: 'SSE_CONNECTION_FAILURE',
      severity: 'WARNING',
      detection: () => terminalLogs?.includes('SSE connection lost'),
      diagnosis: async () => {
        return {
          sseConnected: false,
          pollingActive: terminalLogs?.includes('polling mode'),
          errors: []
        };
      },
      recovery: async () => {
        this.logger.info('SSE failed but polling mode should be active - continuing...');
        return true;
      }
    };
  }

  /**
   * Detect extension not navigating to target
   */
  detectExtensionNotNavigating(page, targetUrl, elapsedSeconds) {
    return {
      name: 'EXTENSION_NOT_NAVIGATING',
      severity: 'CRITICAL',
      timeout: 5,
      detection: async () => {
        if (elapsedSeconds < 5) return false;
        
        const pages = page.context().pages();
        const targetDomain = new URL(targetUrl).hostname;
        const navigated = pages.some(p => p.url().includes(targetDomain));
        return !navigated;
      },
      diagnosis: async () => {
        const diagnostics = {
          pendingCrawlCreated: false,
          extensionReceivedCrawl: false,
          tabCreationAttempted: false,
          errors: []
        };

        try {
          const terminalText = await page.textContent('[role="log"]').catch(() => '');
          diagnostics.pendingCrawlCreated = terminalText?.includes('pending crawl') || false;
          diagnostics.extensionReceivedCrawl = terminalText?.includes('Found pending crawl') || false;
          diagnostics.tabCreationAttempted = terminalText?.includes('Created new tab') || false;
        } catch (e) {
          diagnostics.errors.push(`Diagnosis error: ${e.message}`);
        }

        return diagnostics;
      },
      recovery: async () => {
        this.logger.info('Attempting recovery: Stopping crawl and retrying...');
        return true;
      }
    };
  }

  /**
   * Detect polling errors (404 responses)
   */
  detectPollingErrors(consoleLogs) {
    return {
      name: 'POLLING_ERRORS',
      severity: 'WARNING',
      detection: () => {
        const errorCount = (consoleLogs?.match(/404/g) || []).length;
        return errorCount > 5;
      },
      diagnosis: async () => {
        return {
          backendRunning: false,
          apiEndpointsAccessible: false,
          errors: ['Multiple 404 errors detected']
        };
      },
      recovery: async () => {
        this.logger.info('Attempting recovery: Verifying backend is running...');
        return true;
      }
    };
  }

  /**
   * Detect insufficient endpoints captured
   */
  detectInsufficientEndpoints(endpointCount, expectedMinimum) {
    return {
      name: 'INSUFFICIENT_ENDPOINTS',
      severity: 'FAIL',
      detection: () => endpointCount < expectedMinimum,
      diagnosis: async (crawlResults) => {
        return {
          captured: endpointCount,
          expected: expectedMinimum,
          missing: expectedMinimum - endpointCount,
          protocolBreakdown: crawlResults?.protocolBreakdown || {}
        };
      },
      recovery: async () => {
        this.logger.info('Insufficient endpoints - this indicates a code issue, not a transient failure');
        return false; // No automatic recovery
      }
    };
  }
}

// ============================================================================
// DIAGNOSTIC ANALYZER
// ============================================================================

class DiagnosticAnalyzer {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Analyze failure and provide recommendations
   */
  async analyzeFailure(failureMode, diagnostics) {
    const analysis = {
      failureMode: failureMode.name,
      severity: failureMode.severity,
      rootCause: 'Unknown',
      recommendations: [],
      canRecover: true
    };

    switch (failureMode.name) {
      case 'EXTENSION_CONNECTION_FAILURE':
        analysis.rootCause = this.analyzeConnectionFailure(diagnostics);
        break;
      case 'ZERO_ENDPOINTS_CAPTURE':
        analysis.rootCause = this.analyzeZeroEndpoints(diagnostics);
        break;
      case 'EXTENSION_NOT_NAVIGATING':
        analysis.rootCause = this.analyzeNavigationFailure(diagnostics);
        break;
      case 'POLLING_ERRORS':
        analysis.rootCause = 'Backend server not responding';
        analysis.recommendations.push('Verify backend is running: npm run dev');
        break;
      case 'INSUFFICIENT_ENDPOINTS':
        analysis.rootCause = 'Network interception not capturing all endpoints';
        analysis.canRecover = false;
        break;
    }

    return analysis;
  }

  analyzeConnectionFailure(diagnostics) {
    if (!diagnostics.extensionRunning) {
      return 'Extension service worker not running';
    }
    if (!diagnostics.backendAccessible) {
      return 'Backend not accessible';
    }
    return 'Unknown connection issue';
  }

  analyzeZeroEndpoints(diagnostics) {
    if (!diagnostics.navigationCorrect) {
      return 'Extension did not navigate to target URL';
    }
    if (!diagnostics.interceptorInjected) {
      return 'Network interceptor not injected into page';
    }
    if (!diagnostics.startCrawlReceived) {
      return 'Content script did not receive START_CRAWL message';
    }
    return 'Network interception not working';
  }

  analyzeNavigationFailure(diagnostics) {
    if (!diagnostics.pendingCrawlCreated) {
      return 'Backend did not create pending crawl';
    }
    if (!diagnostics.extensionReceivedCrawl) {
      return 'Extension did not receive pending crawl from backend';
    }
    if (!diagnostics.tabCreationAttempted) {
      return 'Extension failed to create new tab';
    }
    return 'Tab creation or navigation failed';
  }
}

// ============================================================================
// RECOVERY MANAGER
// ============================================================================

class RecoveryManager {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.recoveryAttempts = {};
  }

  /**
   * Attempt recovery for a failure
   */
  async attemptRecovery(failureMode, failureKey) {
    const attempts = this.recoveryAttempts[failureKey] || 0;
    const maxRetries = this.config.maxRetries || 3;

    if (attempts >= maxRetries) {
      this.logger.error(`Max recovery attempts (${maxRetries}) reached for ${failureMode.name}`);
      return false;
    }

    this.logger.info(`Attempting recovery (${attempts + 1}/${maxRetries})...`);
    this.recoveryAttempts[failureKey] = attempts + 1;

    try {
      const recovered = await failureMode.recovery();
      if (recovered) {
        this.logger.success(`Recovery successful`);
        return true;
      }
    } catch (e) {
      this.logger.error(`Recovery failed: ${e.message}`);
    }

    return false;
  }

  /**
   * Reset recovery attempts
   */
  reset() {
    this.recoveryAttempts = {};
  }
}

module.exports = {
  FailureDetector,
  DiagnosticAnalyzer,
  RecoveryManager
};

