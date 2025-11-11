/**
 * Integration tests for extension API routes
 * These tests verify the extension API endpoints work correctly
 */

describe('Extension API Routes', () => {
  const BACKEND_URL = 'http://localhost:3002'
  const VALID_API_KEY = 'deepcrawler-extension-v1'
  const INVALID_API_KEY = 'invalid-key'

  describe('GET /api/extension/status', () => {
    it('should return 401 without API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(response.status).toBe(401)
    })

    it('should return 401 with invalid API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/status`, {
        method: 'GET',
        headers: {
          'X-Extension-Key': INVALID_API_KEY,
          'Content-Type': 'application/json'
        }
      })
      expect(response.status).toBe(401)
    })

    it('should return 200 with valid API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/status`, {
        method: 'GET',
        headers: {
          'X-Extension-Key': VALID_API_KEY,
          'Content-Type': 'application/json'
        }
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('connected')
      expect(data.version).toBeDefined()
    })
  })

  describe('POST /api/extension/ping', () => {
    it('should return 401 without API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(response.status).toBe(401)
    })

    it('should return 200 with valid API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/ping`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': VALID_API_KEY,
          'Content-Type': 'application/json'
        }
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.status).toBe('pong')
    })
  })

  describe('POST /api/extension/crawl', () => {
    it('should return 401 without API key', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          sameOriginOnly: true
        })
      })
      expect(response.status).toBe(401)
    })

    it('should return 400 with invalid URL', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/crawl`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': VALID_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'not-a-url',
          sameOriginOnly: true
        })
      })
      expect(response.status).toBe(400)
    })

    it('should return 400 without URL', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/crawl`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': VALID_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sameOriginOnly: true
        })
      })
      expect(response.status).toBe(400)
    })

    it('should return SSE stream with valid request', async () => {
      const response = await fetch(`${BACKEND_URL}/api/extension/crawl`, {
        method: 'POST',
        headers: {
          'X-Extension-Key': VALID_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          sameOriginOnly: true
        })
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    })
  })

  describe('POST /api/crawl with extension fallback', () => {
    it('should fallback to server mode if extension unavailable', async () => {
      const response = await fetch(`${BACKEND_URL}/api/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          sameOriginOnly: true
        })
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/event-stream')
    })
  })
})

