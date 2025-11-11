import { NextRequest, NextResponse } from 'next/server'
import { activeCrawlSessions } from '@/lib/extensionSessions'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
}

/**
 * GET /api/extension/crawl/results?requestId=xxx
 * Polling endpoint to retrieve crawl results and status
 * Used as fallback when SSE connection fails
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json(
        { error: 'requestId is required' },
        { status: 400 }
      )
    }

    const session = activeCrawlSessions.get(requestId)
    if (!session) {
      return NextResponse.json(
        { error: 'Crawl session not found' },
        { status: 404 }
      )
    }

    const now = Date.now()
    const elapsedSeconds = Math.floor((now - session.startTime) / 1000)
    const timeout = session.inactivityTimeout || 60
    const inactivitySeconds = Math.max(0, timeout - Math.floor((now - session.lastChangeTime) / 1000))
    const isActive = session.isActive
    const isComplete = session.isComplete

    console.log(`[Extension Crawl Results] Polling for ${requestId}: ${session.endpoints.length} endpoints, active: ${isActive}, complete: ${isComplete}`)

    return NextResponse.json({
      success: true,
      requestId,
      endpoints: session.endpoints,
      endpointCount: session.endpoints.length,
      isActive,
      isComplete,
      elapsedSeconds,
      inactivityCountdown: inactivitySeconds,
      timestamp: now
    })
  } catch (error) {
    console.error('[Extension Crawl Results] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

