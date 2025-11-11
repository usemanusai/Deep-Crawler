import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { dedupeEndpoints, generatePostmanCollection } from '@/lib/utils'
import { activeCrawlSessions } from '@/lib/extensionSessions'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

interface ExtensionCrawlRequest {
  requestId: string
  url: string
  tabId?: number
  sameOriginOnly?: boolean
  mode?: 'extension' | 'manual' | 'auto'
  inactivityTimeout?: number
  crawlMode?: 'manual' | 'auto'
}

interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
  timestamp?: number
  source?: 'same-origin' | 'third-party'
}

/**
 * Validate extension API key from request headers
 */
function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
}

/**
 * Validate crawl request
 */
function validateCrawlRequest(data: any): { valid: boolean; error?: string } {
  if (!data.url || typeof data.url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  try {
    new URL(data.url)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // tabId is optional - extension will use active tab if not provided
  if (data.tabId !== undefined && typeof data.tabId !== 'number') {
    return { valid: false, error: 'Tab ID must be a number if provided' }
  }

  return { valid: true }
}

// Store active crawl sessions (singleton via lib/extensionSessions)

/**
 * POST /api/extension/crawl
 * Execute a crawl request in the extension's browser context
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      console.warn('[Extension Crawl] POST request with invalid API key')
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    const body = await request.json() as ExtensionCrawlRequest
    const validation = validateCrawlRequest(body)

    if (!validation.valid) {
      console.warn('[Extension Crawl] Invalid crawl request:', validation.error)
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { url, sameOriginOnly = true, requestId, tabId, crawlMode = 'manual', inactivityTimeout = 60 } = body
    const crawlId = uuidv4()
    const endpoints: ApiEndpoint[] = []
    const seedHost = new URL(url).hostname

    // Validate inactivity timeout
    const timeout = Math.max(30, Math.min(300, inactivityTimeout || 60))

    console.log(`[Extension Crawl] ========== STARTING CRAWL ==========`)
    console.log(`[Extension Crawl] Request ID: ${requestId}`)
    console.log(`[Extension Crawl] URL: ${url}`)
    console.log(`[Extension Crawl] Seed Host: ${seedHost}`)
    console.log(`[Extension Crawl] Same Origin Only: ${sameOriginOnly}`)
    console.log(`[Extension Crawl] Crawl Mode: ${crawlMode}`)
    console.log(`[Extension Crawl] Inactivity Timeout: ${timeout}s`)
    if (tabId) {
      console.log(`[Extension Crawl] Tab ID: ${tabId}`)
    }

    // Create readable stream for SSE
    const encoder = new TextEncoder()
    let streamClosed = false

    // Batching mechanism for endpoint updates
    const BATCH_INTERVAL = 1000 // Send batches every 1 second

    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data: any) => {
          // Prevent writing to closed stream
          if (streamClosed) {
            console.warn('[Extension Crawl] Attempted to send SSE after stream closed:', data)
            return
          }

          try {
            const withTs = typeof data === 'object' && data !== null
              ? { ts: Date.now(), level: data.level || 'info', ...data }
              : data
            const encoded = encoder.encode(`data: ${JSON.stringify(withTs)}\n\n`)
            console.log(`[Extension Crawl] Sending SSE: ${data.type || 'unknown'} (${encoded.length} bytes)`)
            controller.enqueue(encoded)
          } catch (error) {
            if (error instanceof Error && error.message.includes('closed')) {
              streamClosed = true
              console.warn('[Extension Crawl] SSE stream closed, stopping sends')
            } else {
              console.error('[Extension Crawl] Error sending SSE:', error)
            }
          }
        }

        try {
          // Send requestId first so client can use it for polling if SSE fails
          sendSSE({ type: 'request_id', requestId })
          sendSSE({ type: 'log', message: `Extension crawl initiated for ${url}` })
          sendSSE({ type: 'progress', progress: 10 })

          // Store this crawl session so the extension can send data to it
          const now = Date.now()
          activeCrawlSessions.set(requestId, {
            endpoints,
            controller,
            seedHost,
            sameOriginOnly,
            startTime: now,
            lastChangeTime: now,
            tabId,
            url,
            crawlMode,
            inactivityTimeout: timeout,
            isActive: true,
            isComplete: false
          })

          // Send instruction to extension to navigate and capture network data
          sendSSE({ type: 'log', message: 'Instructing extension to navigate and capture network data...' })
          sendSSE({ type: 'progress', progress: 15 })

          // Wait for extension to complete crawl (with timeout)
          const crawlTimeout = 600000 // 10 minutes max for manual mode
          const startWait = Date.now()
          let lastEndpointCount = 0
          let noChangeCount = 0
          let lastLogTime = Date.now()
          let lastUpdateTime = Date.now()
          let lastChangeTime = Date.now()
          let keepAliveInterval: NodeJS.Timeout | null = null

          // Convert timeout from seconds to number of 500ms intervals
          const noChangeThreshold = Math.ceil((timeout * 1000) / 500)

          console.log(`[Extension Crawl] Waiting for extension to send network data (timeout: ${crawlTimeout}ms, no-change threshold: ${timeout}s)`)
          sendSSE({ type: 'log', message: `Waiting for extension to capture network requests (${crawlMode} mode, ${timeout}s inactivity timeout)...` })

          // Send keep-alive messages every 30 seconds to prevent SSE stream timeout
          keepAliveInterval = setInterval(() => {
            if (!streamClosed) {
              try {
                controller.enqueue(encoder.encode(': keep-alive\n\n'))
                console.log('[Extension Crawl] Sent keep-alive message')
              } catch (error) {
                if (error instanceof Error && error.message.includes('closed')) {
                  streamClosed = true
                  if (keepAliveInterval) clearInterval(keepAliveInterval)
                }
              }
            }
          }, 30000)

          while (Date.now() - startWait < crawlTimeout) {
            const session = activeCrawlSessions.get(requestId)
            if (!session) {
              console.warn(`[Extension Crawl] Session disappeared during wait`)
              break
            }

            // Log progress every 5 seconds
            if (Date.now() - lastLogTime > 5000) {
              console.log(`[Extension Crawl] Still waiting... Endpoints received: ${session.endpoints.length}`)
              sendSSE({ type: 'log', message: `Waiting for extension... (${session.endpoints.length} endpoints so far)` })
              lastLogTime = Date.now()
            }

            // Send endpoint count update with batching (every 1 second max)
            const now = Date.now()
            if (now - lastUpdateTime > BATCH_INTERVAL) {
              const inactivityCountdown = Math.max(0, timeout - Math.floor((now - lastChangeTime) / 1000))
              console.log(`[Extension Crawl] Sending batched endpoint update: ${session.endpoints.length} endpoints, inactivity: ${inactivityCountdown}s`)
              sendSSE({
                type: 'endpoints_update',
                count: session.endpoints.length,
                inactivityCountdown
              })
              lastUpdateTime = now
            }

            // Check if crawl is complete
            // Wait until we have endpoints AND no new endpoints for the configured timeout
            if (session.endpoints.length > 0) {
              if (session.endpoints.length === lastEndpointCount) {
                noChangeCount++
              } else {
                noChangeCount = 0
                lastEndpointCount = session.endpoints.length
                lastChangeTime = Date.now()
                console.log(`[Extension Crawl] Received ${session.endpoints.length} endpoints so far`)
              }

              // If no new endpoints for the configured timeout, consider crawl complete
              if (noChangeCount >= noChangeThreshold) {
                console.log(`[Extension Crawl] No new endpoints for ${timeout} seconds, considering crawl complete`)
                break
              }
            }

            // Also break after 120 seconds if we haven't received any data
            if (Date.now() - startWait > 120000 && session.endpoints.length === 0) {
              console.warn(`[Extension Crawl] Timeout: No data received after 120 seconds`)
              sendSSE({ type: 'log', message: 'Timeout: No data received from extension after 120 seconds' })
              break
            }

            await new Promise(resolve => setTimeout(resolve, 500))
          }

          // Clean up keep-alive interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
          }

          // Send final batch of endpoints before processing
          const session = activeCrawlSessions.get(requestId)
          if (session && session.endpoints.length > 0) {
            const inactivityCountdown = Math.max(0, timeout - Math.floor((Date.now() - lastChangeTime) / 1000))
            console.log(`[Extension Crawl] Sending final endpoint batch: ${session.endpoints.length} endpoints`)
            sendSSE({
              type: 'endpoints_update',
              count: session.endpoints.length,
              inactivityCountdown,
              final: true
            })
          }

          if (session) {
            const collectedEndpoints = session.endpoints

            sendSSE({ type: 'log', message: `Processing ${collectedEndpoints.length} captured network requests` })
            sendSSE({ type: 'progress', progress: 70 })

            // Dedupe and process endpoints
            const uniqueEndpoints = dedupeEndpoints(collectedEndpoints)
            const postmanCollection = generatePostmanCollection(url, uniqueEndpoints)

            sendSSE({ type: 'progress', progress: 90 })
            sendSSE({ type: 'log', message: `Extension crawl complete! Found ${uniqueEndpoints.length} unique endpoints` })

            // Mark session as complete
            session.isComplete = true
            session.isActive = false

            // Store final result in session for polling fallback
            session.finalResult = {
              crawlId,
              endpoints: uniqueEndpoints,
              postmanCollection,
              mode: 'extension',
              requestId
            }

            sendSSE({
              type: 'complete',
              result: session.finalResult
            })

            sendSSE({ type: 'progress', progress: 100 })
            console.log(`[Extension Crawl] Crawl ${requestId} completed with ${uniqueEndpoints.length} endpoints`)
          } else {
            sendSSE({ type: 'log', message: 'No data received from extension' })

            const emptyResult = {
              crawlId,
              endpoints: [],
              postmanCollection: generatePostmanCollection(url, []),
              mode: 'extension',
              requestId
            }

            // Store empty result in session for polling fallback
            const emptySession = activeCrawlSessions.get(requestId)
            if (emptySession) {
              emptySession.finalResult = emptyResult
              emptySession.isComplete = true
              emptySession.isActive = false
            }

            sendSSE({
              type: 'complete',
              result: emptyResult
            })
          }
        } catch (error) {
          console.error(`[Extension Crawl] Error in crawl ${requestId}:`, error)
          sendSSE({
            type: 'log',
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          })

          // Mark session as complete on error
          const session = activeCrawlSessions.get(requestId)
          if (session) {
            session.isComplete = true
            session.isActive = false
          }
        } finally {
          // Wait a bit to ensure final messages are sent before closing the stream
          // This prevents the client from missing the final 'complete' message
          await new Promise(resolve => setTimeout(resolve, 500))

          // Don't delete the session immediately - keep it for 5 minutes so the extension
          // can still send data for this crawl if needed. The session will be cleaned up
          // by a separate cleanup mechanism.
          console.log(`[Extension Crawl] Crawl ${requestId} finished, session will be cleaned up after 5 minutes`)

          // Schedule cleanup after 5 minutes
          setTimeout(() => {
            activeCrawlSessions.delete(requestId)
            console.log(`[Extension Crawl] Cleaned up session for ${requestId}`)
          }, 5 * 60 * 1000)

          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Key',
      },
    })
  } catch (error) {
    console.error('[Extension Crawl] API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/extension/crawl/pending
 * Get pending crawl requests for the extension to process
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    // Return only ACTIVE pending crawl sessions (not completed ones)
    // This prevents the extension from processing the same crawl multiple times
    const pendingCrawls = Array.from(activeCrawlSessions.entries())
      .filter(([_, session]) => session.isActive && !session.isComplete)
      .map(([requestId, session]) => ({
        requestId,
        seedHost: session.seedHost,
        sameOriginOnly: session.sameOriginOnly,
        startTime: session.startTime,
        url: session.url,
        tabId: session.tabId,
        crawlMode: session.crawlMode,
        inactivityTimeout: session.inactivityTimeout,
      }))

    console.log(`[Extension Crawl] Returning ${pendingCrawls.length} pending crawls`)
    return NextResponse.json({ pendingCrawls })
  } catch (error) {
    console.error('[Extension Crawl] Pending crawls endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/extension/crawl/data
 * Receive network data from extension during crawl
 */
export async function PUT(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      console.warn('[Extension Crawl] PUT request with invalid API key')
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { requestId, networkRequests = [], action } = body

    console.log(`[Extension Crawl] PUT request received: requestId=${requestId}, action=${action}, requests=${networkRequests.length}`)

    const session = activeCrawlSessions.get(requestId)
    if (!session) {
      console.warn(`[Extension Crawl] Session not found for requestId: ${requestId}`)
      console.log(`[Extension Crawl] Available sessions: ${Array.from(activeCrawlSessions.keys()).join(', ')}`)
      return NextResponse.json(
        { error: 'Crawl session not found' },
        { status: 404 }
      )
    }

    if (action === 'add_requests') {
      console.log(`[Extension Crawl] Processing ${networkRequests.length} network requests for session ${requestId}`)
      // Process and add network requests
      for (const req of networkRequests) {
        try {
          const method = req.method || 'GET'
          const reqUrl = req.url
          const status = req.status || 0
          const size = req.size || 0
          const contentType = req.contentType || ''

          // Skip static assets and analytics (same patterns as server-side)
          const skipPatterns = [
            /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
            /google-analytics|googletagmanager|facebook|twitter|linkedin/i,
            /posthog|mixpanel|segment|amplitude|hotjar/i,
            /cdn\.|assets\.|static\./i
          ]

          const isStaticAsset = skipPatterns.some(pattern => pattern.test(reqUrl))

          // Enhanced API detection (same as server-side)
          const isApiEndpoint = !isStaticAsset && (
            reqUrl.includes('/api/') ||
            reqUrl.includes('/v1/') || reqUrl.includes('/v2/') || reqUrl.includes('/v3/') ||
            reqUrl.match(/\/(api|rest|graphql|gql)\//i) ||
            reqUrl.includes('.json') ||
            contentType.includes('application/json') ||
            contentType.includes('application/api') ||
            contentType.includes('text/plain') && (method === 'POST' || method === 'PUT') ||
            (req.type === 'xhr' || req.type === 'fetch') ||
            (method !== 'GET' && !isStaticAsset) ||
            req.headers?.['x-requested-with'] === 'XMLHttpRequest' ||
            reqUrl.match(/\/(auth|login|logout|user|users|data|config|settings)/i) ||
            reqUrl.match(/\/(submit|upload|download|search|query)/i) ||
            reqUrl.match(/\/(repos|repositories|gists|notifications|issues|pulls)/i) ||
            reqUrl.match(/\/(orgs|organizations|teams|projects|actions)/i) ||
            reqUrl.match(/\/(graphql|rest|api|_private|internal)/i) ||
            [200, 201, 202, 400, 401, 403, 404, 422, 500, 502, 503].includes(status) &&
            !reqUrl.includes('favicon') &&
            !reqUrl.includes('robots.txt')
          )

          if (isApiEndpoint) {
            session.endpoints.push({
              method,
              url: reqUrl,
              status,
              size,
              timestamp: Date.now(),
              source: 'same-origin'
            })
          }
        } catch (err) {
          console.warn('[Extension Crawl] Error processing request:', err)
        }
      }

      console.log(`[Extension Crawl] Received ${networkRequests.length} requests, total endpoints: ${session.endpoints.length}`)
      return NextResponse.json({ success: true, endpointCount: session.endpoints.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('[Extension Crawl] Data endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

