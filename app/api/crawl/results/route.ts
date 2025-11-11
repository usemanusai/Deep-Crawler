import { NextRequest, NextResponse } from 'next/server'
import { activeCrawlSessions } from '@/lib/extensionSessions'
import { dedupeEndpoints, generatePostmanCollection } from '@/lib/utils'

/**
 * POST /api/crawl/results
 * Retrieve final results for a completed crawl
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId } = body

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

    console.log(`[Crawl Results] Retrieving results for ${requestId}: ${session.endpoints.length} endpoints`)

    // If we have a pre-computed final result (from extension crawl), use it directly
    if (session.finalResult) {
      console.log(`[Crawl Results] Using pre-computed final result with ${session.finalResult.endpoints.length} endpoints`)
      return NextResponse.json({
        ...session.finalResult,
        url: session.url,
        timestamp: Date.now()
      })
    }

    // Otherwise, deduplicate endpoints on-the-fly
    const deduped = dedupeEndpoints(session.endpoints)
    console.log(`[Crawl Results] After deduplication: ${deduped.length} unique endpoints`)

    // Generate Postman collection
    const postmanCollection = generatePostmanCollection(session.url, deduped)

    const result = {
      crawlId: requestId,
      url: session.url,
      endpoints: deduped,
      postmanCollection,
      timestamp: Date.now()
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Crawl Results] Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

