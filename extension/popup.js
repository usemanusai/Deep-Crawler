/**
 * DeepCrawler Extension - Popup Script
 * Displays connection status and provides quick actions
 */

const BACKEND_URL = 'http://localhost:3002';
const EXTENSION_API_KEY = 'deepcrawler-extension-v1';

let connectionStatus = 'disconnected';
const logs = [];

/**
 * Update UI with connection status
 */
function updateConnectionStatus(status) {
  connectionStatus = status;
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const statusMessage = document.getElementById('statusMessage');
  const dot = indicator.querySelector('.status-dot');

  // Remove all status classes
  dot.classList.remove('connected', 'disconnected', 'error');

  switch (status) {
    case 'connected':
      dot.classList.add('connected');
      statusText.textContent = 'Connected';
      statusMessage.textContent = 'Extension is connected to backend';
      addLog('Connected to backend', 'success');
      break;
    case 'disconnected':
      dot.classList.add('disconnected');
      statusText.textContent = 'Disconnected';
      statusMessage.textContent = 'Extension is not connected to backend';
      addLog('Disconnected from backend', 'error');
      break;
    case 'error':
      dot.classList.add('error');
      statusText.textContent = 'Error';
      statusMessage.textContent = 'Connection error occurred';
      addLog('Connection error', 'error');
      break;
    default:
      dot.classList.add('disconnected');
      statusText.textContent = 'Unknown';
      statusMessage.textContent = 'Unknown connection status';
  }
}

/**
 * Add log entry to popup
 */
function addLog(message, type = 'info') {
  const logsContainer = document.getElementById('logsContainer');
  const entry = document.createElement('p');
  entry.className = `log-entry ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;
  
  logsContainer.appendChild(entry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
  
  // Keep only last 20 logs
  const entries = logsContainer.querySelectorAll('.log-entry');
  if (entries.length > 20) {
    entries[0].remove();
  }
  
  logs.push({ message, type, timestamp });
}

/**
 * Check connection status with backend
 */
async function checkConnectionStatus() {
  try {
    console.log('[DeepCrawler Popup] Checking connection to:', `${BACKEND_URL}/api/extension/status`);
    const response = await fetch(`${BACKEND_URL}/api/extension/status`, {
      method: 'GET',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log('[DeepCrawler Popup] Response status:', response.status);
    if (response.ok) {
      updateConnectionStatus('connected');
    } else {
      console.warn('[DeepCrawler Popup] Backend returned status:', response.status);
      updateConnectionStatus('disconnected');
    }
  } catch (error) {
    console.error('[DeepCrawler Popup] Connection check failed:', error);
    console.error('[DeepCrawler Popup] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    updateConnectionStatus('error');
  }
}

/**
 * Get current tab information
 */
async function updateCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      const url = new URL(tab.url);
      document.getElementById('currentTab').textContent = url.hostname;
    }
  } catch (error) {
    console.warn('[DeepCrawler Popup] Failed to get current tab:', error);
    document.getElementById('currentTab').textContent = 'Unknown';
  }
}

/**
 * Test connection to backend
 */
async function testConnection() {
  const btn = document.getElementById('testConnectionBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ Testing...';

  try {
    addLog('Testing connection to backend...');
    
    const response = await fetch(`${BACKEND_URL}/api/extension/ping`, {
      method: 'POST',
      headers: {
        'X-Extension-Key': EXTENSION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      addLog('✓ Connection test successful', 'success');
      updateConnectionStatus('connected');
    } else {
      addLog('✗ Connection test failed: ' + response.status, 'error');
      updateConnectionStatus('disconnected');
    }
  } catch (error) {
    addLog('✗ Connection test error: ' + error.message, 'error');
    updateConnectionStatus('error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

/**
 * Open settings page
 */
function openSettings() {
  chrome.runtime.openOptionsPage();
}

/**
 * Initialize popup
 */
function initialize() {
  console.log('[DeepCrawler Popup] Initializing');
  
  // Set up event listeners
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
  document.getElementById('openSettingsBtn').addEventListener('click', openSettings);

  // Initial checks
  updateCurrentTab();
  checkConnectionStatus();

  // Refresh status every 5 seconds
  setInterval(checkConnectionStatus, 5000);

  addLog('Popup initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

