import { NextRequest, NextResponse } from 'next/server'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

import { listPendingCrawls, cleanupExpiredSessions } from '@/lib/extensionSessions'

/**
 * Validate extension API key from request headers
 */
function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
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

    // Cleanup expired sessions first
    cleanupExpiredSessions()

    // Return only active, non-expired pending crawls
    const pendingCrawls = listPendingCrawls()

    console.log(`[Extension Crawl Pending] Returning ${pendingCrawls.length} pending crawls`)
    if (pendingCrawls.length > 0) {
      console.log(`[Extension Crawl Pending] Pending crawls:`, pendingCrawls.map(c => ({ requestId: c.requestId, url: c.url })))
    }

    return NextResponse.json({ pendingCrawls })
  } catch (error) {
    console.error('[Extension Crawl Pending] Endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

