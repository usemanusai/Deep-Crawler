/**
 * DeepCrawler Extension - Options Script
 * Manages extension settings and preferences
 */

const DEFAULT_SETTINGS = {
  backendUrl: 'http://localhost:3002',
  extensionKey: 'deepcrawler-extension-v1',
  mode: 'auto',
  enableLogging: true,
  captureScreenshots: true,
  preserveSession: true,
  requestTimeout: 60,
  collectCookies: true,
  collectStorage: true,
  collectNetworkRequests: true
};

/**
 * Load settings from storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      resolve(settings);
    });
  });
}

/**
 * Save settings to storage
 */
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

/**
 * Populate form with current settings
 */
async function populateForm() {
  const settings = await loadSettings();

  document.getElementById('backendUrl').value = settings.backendUrl;
  document.getElementById('extensionKey').value = settings.extensionKey;
  document.getElementById('enableLogging').checked = settings.enableLogging;
  document.getElementById('captureScreenshots').checked = settings.captureScreenshots;
  document.getElementById('preserveSession').checked = settings.preserveSession;
  document.getElementById('requestTimeout').value = settings.requestTimeout;
  document.getElementById('collectCookies').checked = settings.collectCookies;
  document.getElementById('collectStorage').checked = settings.collectStorage;
  document.getElementById('collectNetworkRequests').checked = settings.collectNetworkRequests;

  // Set mode radio button
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  modeRadios.forEach(radio => {
    radio.checked = radio.value === settings.mode;
  });
}

/**
 * Get form values
 */
function getFormValues() {
  const modeRadios = document.querySelectorAll('input[name="mode"]');
  let selectedMode = 'auto';
  modeRadios.forEach(radio => {
    if (radio.checked) {
      selectedMode = radio.value;
    }
  });

  return {
    backendUrl: document.getElementById('backendUrl').value,
    extensionKey: document.getElementById('extensionKey').value,
    mode: selectedMode,
    enableLogging: document.getElementById('enableLogging').checked,
    captureScreenshots: document.getElementById('captureScreenshots').checked,
    preserveSession: document.getElementById('preserveSession').checked,
    requestTimeout: parseInt(document.getElementById('requestTimeout').value, 10),
    collectCookies: document.getElementById('collectCookies').checked,
    collectStorage: document.getElementById('collectStorage').checked,
    collectNetworkRequests: document.getElementById('collectNetworkRequests').checked
  };
}

/**
 * Validate settings
 */
function validateSettings(settings) {
  const errors = [];

  if (!settings.backendUrl.trim()) {
    errors.push('Backend URL is required');
  } else {
    try {
      new URL(settings.backendUrl);
    } catch {
      errors.push('Backend URL must be a valid URL');
    }
  }

  if (!settings.extensionKey.trim()) {
    errors.push('Extension API Key is required');
  }

  if (settings.requestTimeout < 5 || settings.requestTimeout > 300) {
    errors.push('Request timeout must be between 5 and 300 seconds');
  }

  return errors;
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'status-message';
  }, 3000);
}

/**
 * Save settings
 */
async function handleSave() {
  const settings = getFormValues();
  const errors = validateSettings(settings);

  if (errors.length > 0) {
    showStatus('Error: ' + errors.join(', '), 'error');
    return;
  }

  try {
    await saveSettings(settings);
    showStatus('✓ Settings saved successfully', 'success');
    console.log('[DeepCrawler Options] Settings saved:', settings);
  } catch (error) {
    showStatus('Error saving settings: ' + error.message, 'error');
    console.error('[DeepCrawler Options] Save error:', error);
  }
}

/**
 * Reset to default settings
 */
async function handleReset() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    try {
      await saveSettings(DEFAULT_SETTINGS);
      await populateForm();
      showStatus('✓ Settings reset to defaults', 'success');
      console.log('[DeepCrawler Options] Settings reset to defaults');
    } catch (error) {
      showStatus('Error resetting settings: ' + error.message, 'error');
      console.error('[DeepCrawler Options] Reset error:', error);
    }
  }
}

/**
 * Initialize options page
 */
async function initialize() {
  console.log('[DeepCrawler Options] Initializing');

  // Load and populate form
  await populateForm();

  // Set up event listeners
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('resetBtn').addEventListener('click', handleReset);

  // Save on Enter key in input fields
  document.querySelectorAll('.input-field').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    });
  });

  console.log('[DeepCrawler Options] Initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

