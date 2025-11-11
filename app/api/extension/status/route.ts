import { NextRequest, NextResponse } from 'next/server'
import { isExtensionRecentlyAlive, extensionHeartbeat } from '@/lib/extensionState'

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY || 'deepcrawler-extension-v1'

/**
 * Validate extension API key from request headers
 */
function validateExtensionKey(request: NextRequest): boolean {
  const key = request.headers.get('X-Extension-Key')
  return key === EXTENSION_API_KEY
}

/**
 * GET /api/extension/status
 * Check if backend is available and extension is connected
 */
export async function GET(request: NextRequest) {
  try {
    if (!validateExtensionKey(request)) {
      return NextResponse.json(
        { error: 'Invalid or missing extension API key' },
        { status: 401 }
      )
    }

    const connected = isExtensionRecentlyAlive()
    console.log('[Extension API] /status', { connected, lastHeartbeatMs: extensionHeartbeat.lastHeartbeatMs })

    return NextResponse.json({
      status: connected ? 'connected' : 'disconnected',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      backend: 'deepcrawler-v1',
      lastHeartbeatMs: extensionHeartbeat.lastHeartbeatMs
    })
  } catch (error) {
    console.error('[Extension API] Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

