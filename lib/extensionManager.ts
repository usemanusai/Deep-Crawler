/**
 * Extension Manager
 * Handles communication with the DeepCrawler Chrome extension
 */

export type CrawlMode = 'auto' | 'extension' | 'server'

export interface ExtensionStatus {
  connected: boolean
  status: 'connected' | 'disconnected' | 'error'
  error?: string
  timestamp: number
}

export interface ExtensionConfig {
  backendUrl: string
  apiKey: string
  mode: CrawlMode
  timeout: number
}

const DEFAULT_CONFIG: ExtensionConfig = {
  backendUrl: 'http://localhost:3002',
  apiKey: 'deepcrawler-extension-v1',
  mode: 'auto',
  timeout: 60000
}

let extensionStatus: ExtensionStatus = {
  connected: false,
  status: 'disconnected',
  timestamp: Date.now()
}

let config: ExtensionConfig = { ...DEFAULT_CONFIG }

/**
 * Initialize extension manager with configuration
 */
export function initializeExtensionManager(customConfig?: Partial<ExtensionConfig>) {
  config = { ...DEFAULT_CONFIG, ...customConfig }
  console.log('[ExtensionManager] Initialized with config:', config)
}

/**
 * Check extension connection status
 */
export async function checkExtensionStatus(): Promise<ExtensionStatus> {
  try {
    const response = await fetch(`${config.backendUrl}/api/extension/status`, {
      method: 'GET',
      headers: {
        'X-Extension-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(config.timeout)
    })

    if (response.ok) {
      const json = await response.json().catch(() => null as any)
      const isConnected = !!json && json.status === 'connected'
      extensionStatus = {
        connected: isConnected,
        status: isConnected ? 'connected' : 'disconnected',
        timestamp: Date.now()
      }
    } else {
      extensionStatus = {
        connected: false,
        status: 'disconnected',
        error: `HTTP ${response.status}`,
        timestamp: Date.now()
      }
    }
  } catch (error) {
    extensionStatus = {
      connected: false,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }
  }

  console.log('[ExtensionManager] checkExtensionStatus', { backendUrl: config.backendUrl, status: extensionStatus })
  return extensionStatus
}

/**
 * Get current extension status
 */
export function getExtensionStatus(): ExtensionStatus {
  return { ...extensionStatus }
}

/**
 * Determine if extension should be used for crawling
 */
export function shouldUseExtension(): boolean {
  if (config.mode === 'server') {
    return false
  }

  if (config.mode === 'extension') {
    return extensionStatus.connected
  }

  // Auto mode: use extension if connected
  return extensionStatus.connected
}

/**
 * Get current crawl mode
 */
export function getCrawlMode(): CrawlMode {
  return config.mode
}

/**
 * Set crawl mode
 */
export function setCrawlMode(mode: CrawlMode) {
  config.mode = mode
  console.log('[ExtensionManager] Crawl mode set to:', mode)
}

/**
 * Get extension configuration
 */
export function getExtensionConfig(): ExtensionConfig {
  return { ...config }
}

/**
 * Update extension configuration
 */
export function updateExtensionConfig(updates: Partial<ExtensionConfig>) {
  config = { ...config, ...updates }
  console.log('[ExtensionManager] Configuration updated:', config)
}

/**
 * Send crawl request to extension
 */
export async function sendCrawlToExtension(
  url: string,
  options: { sameOriginOnly: boolean; crawlMode?: 'manual' | 'auto'; inactivityTimeout?: number }
): Promise<Response> {
  if (!extensionStatus.connected) {
    throw new Error('Extension is not connected')
  }

  const requestId = `crawl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  console.log('[ExtensionManager] sendCrawlToExtension', { backendUrl: config.backendUrl, requestId, url, options })
  const response = await fetch(`${config.backendUrl}/api/extension/crawl`, {
    method: 'POST',
    headers: {
      'X-Extension-Key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requestId,
      url,
      sameOriginOnly: options.sameOriginOnly ?? true,
      mode: 'extension',
      crawlMode: options.crawlMode || 'manual',
      inactivityTimeout: options.inactivityTimeout || 60
    }),
    signal: AbortSignal.timeout(config.timeout)
  })

  if (!response.ok) {
    console.warn('[ExtensionManager] Extension crawl HTTP error', response.status)
    throw new Error(`Extension crawl failed: HTTP ${response.status}`)
  }

  return response
}

/**
 * Format extension status for display
 */
export function formatExtensionStatus(): string {
  switch (extensionStatus.status) {
    case 'connected':
      return '🟢 Extension Connected'
    case 'disconnected':
      return '⚪ Extension Disconnected'
    case 'error':
      return '🔴 Extension Error'
    default:
      return '❓ Unknown Status'
  }
}

/**
 * Get status indicator color
 */
export function getStatusIndicatorColor(): string {
  switch (extensionStatus.status) {
    case 'connected':
      return '#4ade80' // Green
    case 'disconnected':
      return '#888888' // Gray
    case 'error':
      return '#ef4444' // Red
    default:
      return '#666666'
  }
}

