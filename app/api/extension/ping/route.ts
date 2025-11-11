import { NextRequest, NextResponse } from 'next/server'
import { markExtensionHeartbeat } from '@/lib/extensionState'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

/**
 * Validate extension API key from request headers
 */
function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
}

/**
 * POST /api/extension/ping
 * Heartbeat endpoint to maintain connection
 */
export async function POST(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    // Update heartbeat timestamp so server knows extension is alive
    markExtensionHeartbeat()
    console.log('[Extension API] /ping received')

    return NextResponse.json({
      status: 'pong',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Extension API] Ping error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

