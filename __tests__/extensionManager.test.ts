import {
  initializeExtensionManager,
  checkExtensionStatus,
  getExtensionStatus,
  shouldUseExtension,
  getCrawlMode,
  setCrawlMode,
  getExtensionConfig,
  updateExtensionConfig,
  formatExtensionStatus,
  getStatusIndicatorColor
} from '../lib/extensionManager'

describe('ExtensionManager', () => {
  beforeEach(() => {
    // Reset to default state
    initializeExtensionManager()
  })

  describe('initialization', () => {
    it('should initialize with default config', () => {
      const config = getExtensionConfig()
      expect(config.backendUrl).toBe('http://localhost:3002')
      expect(config.apiKey).toBe('deepcrawler-extension-v1')
      expect(config.mode).toBe('auto')
      expect(config.timeout).toBe(60000)
    })

    it('should initialize with custom config', () => {
      initializeExtensionManager({
        backendUrl: 'http://custom:3000',
        mode: 'extension'
      })
      const config = getExtensionConfig()
      expect(config.backendUrl).toBe('http://custom:3000')
      expect(config.mode).toBe('extension')
    })
  })

  describe('status checking', () => {
    it('should return disconnected status initially', () => {
      const status = getExtensionStatus()
      expect(status.connected).toBe(false)
      expect(status.status).toBe('disconnected')
    })

    it('should format status correctly', () => {
      const status = formatExtensionStatus()
      expect(status).toContain('Disconnected')
    })

    it('should return correct status indicator color', () => {
      const color = getStatusIndicatorColor()
      expect(color).toBe('#888888') // Gray for disconnected
    })
  })

  describe('crawl mode', () => {
    it('should get default crawl mode', () => {
      const mode = getCrawlMode()
      expect(mode).toBe('auto')
    })

    it('should set crawl mode', () => {
      setCrawlMode('extension')
      expect(getCrawlMode()).toBe('extension')
      
      setCrawlMode('server')
      expect(getCrawlMode()).toBe('server')
    })

    it('should not use extension in server mode', () => {
      setCrawlMode('server')
      expect(shouldUseExtension()).toBe(false)
    })

    it('should not use extension when disconnected', () => {
      setCrawlMode('extension')
      expect(shouldUseExtension()).toBe(false)
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      updateExtensionConfig({
        backendUrl: 'http://new-backend:3000',
        timeout: 30000
      })
      const config = getExtensionConfig()
      expect(config.backendUrl).toBe('http://new-backend:3000')
      expect(config.timeout).toBe(30000)
      expect(config.apiKey).toBe('deepcrawler-extension-v1') // Unchanged
    })

    it('should preserve existing config when updating', () => {
      const originalConfig = getExtensionConfig()
      updateExtensionConfig({ mode: 'extension' })
      const newConfig = getExtensionConfig()
      expect(newConfig.backendUrl).toBe(originalConfig.backendUrl)
      expect(newConfig.apiKey).toBe(originalConfig.apiKey)
      expect(newConfig.mode).toBe('extension')
    })
  })

  describe('status formatting', () => {
    it('should format disconnected status', () => {
      const status = formatExtensionStatus()
      expect(status).toBe('⚪ Extension Disconnected')
    })

    it('should return gray color for disconnected', () => {
      const color = getStatusIndicatorColor()
      expect(color).toBe('#888888')
    })
  })
})

