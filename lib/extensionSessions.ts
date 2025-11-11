// Singleton store for active extension crawl sessions across HMR/reloads
// Ensures POST/GET/PUT handlers share the same Map instance in dev and prod

export type ApiEndpoint = {
  method: string
  url: string
  status: number
  size: number
  timestamp?: number
  source?: 'same-origin' | 'third-party'
}

export type CrawlSession = {
  endpoints: ApiEndpoint[]
  controller: ReadableStreamDefaultController<Uint8Array>
  seedHost: string
  sameOriginOnly: boolean
  startTime: number
  lastChangeTime: number
  tabId?: number
  url: string
  crawlMode?: 'manual' | 'auto'
  inactivityTimeout?: number
  isActive: boolean
  isComplete: boolean
  finalResult?: {
    crawlId: string
    endpoints: ApiEndpoint[]
    postmanCollection: any
    mode: string
    requestId: string
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __ACTIVE_CRAWL_SESSIONS__: Map<string, CrawlSession> | undefined
}

const g = globalThis as unknown as { __ACTIVE_CRAWL_SESSIONS__?: Map<string, CrawlSession> }

export const activeCrawlSessions: Map<string, CrawlSession> =
  g.__ACTIVE_CRAWL_SESSIONS__ || (g.__ACTIVE_CRAWL_SESSIONS__ = new Map<string, CrawlSession>())

export function listPendingCrawls() {
  return Array.from(activeCrawlSessions.entries()).map(([requestId, session]) => ({
    requestId,
    seedHost: session.seedHost,
    sameOriginOnly: session.sameOriginOnly,
    startTime: session.startTime,
    url: session.url,
    tabId: session.tabId,
    crawlMode: session.crawlMode,
    inactivityTimeout: session.inactivityTimeout,
  }))
}

export function cleanupExpiredSessions(): { removed: number; remaining: number } {
  let removed = 0
  const now = Date.now()
  const SESSION_TTL_MS = 10 * 60 * 1000 // 10 minutes hard cap
  const COMPLETE_GRACE_MS = 2 * 60 * 1000 // 2 minutes grace after completion

  for (const [id, session] of activeCrawlSessions.entries()) {
    const age = now - session.startTime
    const isExpired = age > SESSION_TTL_MS || (session.isComplete && now - session.lastChangeTime > COMPLETE_GRACE_MS)

    if (isExpired) {
      activeCrawlSessions.delete(id)
      removed++
    }
  }

  return { removed, remaining: activeCrawlSessions.size }
}

