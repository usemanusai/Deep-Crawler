import { NextRequest, NextResponse } from 'next/server'
import { activeCrawlSessions } from '@/lib/extensionSessions'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
}

/**
 * PUT /api/extension/crawl/data
 * Backwards-compatible handler for background.js which may POST here
 */
export async function PUT(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch (parseErr) {
      console.error('[Extension Crawl Data] Failed to parse JSON:', parseErr)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { requestId, networkRequests = [], action } = body

    console.log(`[Extension Crawl Data] Received ${networkRequests.length} requests for ${requestId}`)
    console.log(`[Extension Crawl Data] Action: ${action}`)

    const session = activeCrawlSessions.get(requestId)
    if (!session) {
      console.warn(`[Extension Crawl Data] Session not found for ${requestId}`)
      // Return 410 Gone to signal that this session is permanently gone
      // This tells the extension to stop trying to send data for this crawl
      return NextResponse.json(
        { error: 'Crawl session not found or expired', code: 'SESSION_EXPIRED' },
        { status: 410 }
      )
    }

    console.log(`[Extension Crawl Data] Session found, seedHost: ${session.seedHost}`)

    if (action === 'add_requests') {
      let processedCount = 0
      let apiEndpointCount = 0

      for (const req of networkRequests) {
        try {
          const method = (req.method || 'GET').toUpperCase()
          const reqUrl = String(req.url || '')
          const status = Number(req.status) || 0
          const size = Number(req.size) || 0
          const contentType = String(req.contentType || '')

          const skipPatterns = [
            /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
            /google-analytics|googletagmanager|facebook|twitter|linkedin/i,
            /posthog|mixpanel|segment|amplitude|hotjar/i,
            /cdn\.|assets\.|static\./i
          ]

          const isStaticAsset = skipPatterns.some(pattern => pattern.test(reqUrl))

          // Special handling for blob: and data: URLs - always capture these
          const isBlobOrDataUrl = reqUrl.startsWith('blob:') || reqUrl.startsWith('data:')

          const isApiEndpoint = isBlobOrDataUrl || (!isStaticAsset && (
            reqUrl.includes('/api/') ||
            reqUrl.includes('/v1/') || reqUrl.includes('/v2/') || reqUrl.includes('/v3/') ||
            reqUrl.match(/\/(api|rest|graphql|gql)\//i) ||
            reqUrl.includes('.json') ||
            contentType.includes('application/json') ||
            contentType.includes('application/api') ||
            (contentType.includes('text/plain') && (method === 'POST' || method === 'PUT')) ||
            (req.type === 'xhr' || req.type === 'fetch') ||
            (method !== 'GET' && !isStaticAsset) ||
            req.headers?.['x-requested-with'] === 'XMLHttpRequest' ||
            reqUrl.match(/\/(auth|login|logout|user|users|data|config|settings)/i) ||
            reqUrl.match(/\/(submit|upload|download|search|query)/i) ||
            reqUrl.match(/\/(repos|repositories|gists|notifications|issues|pulls)/i) ||
            reqUrl.match(/\/(orgs|organizations|teams|projects|actions)/i) ||
            reqUrl.match(/\/(graphql|rest|api|_private|internal)/i) ||
            ([200,201,202,400,401,403,404,422,500,502,503].includes(status) &&
              !reqUrl.includes('favicon') &&
              !reqUrl.includes('robots.txt'))
          ))

          if (isApiEndpoint) {
            apiEndpointCount++
            const endpoint = {
              method,
              url: reqUrl,
              status,
              size,
              timestamp: Date.now(),
              source: 'same-origin' as const,
            }
            session.endpoints.push(endpoint)
            session.lastChangeTime = Date.now()
          }
          processedCount++
        } catch (err) {
          console.warn('[Extension Crawl Data] Error processing request:', err, 'Request:', req)
        }
      }

      console.log(`[Extension Crawl Data] Processed ${processedCount} requests, found ${apiEndpointCount} API endpoints, total endpoints: ${session.endpoints.length}`)
      return NextResponse.json({ success: true, endpointCount: session.endpoints.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[Extension Crawl Data] Data route error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

