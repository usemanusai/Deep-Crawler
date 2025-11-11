import { Hyperbrowser } from '@hyperbrowser/sdk'

let hbInstance: Hyperbrowser | null = null

/**
 * Get or create Hyperbrowser instance (lazy initialization)
 * Only initializes when actually needed, not at module load time
 */
export function getHyperbrowser(): Hyperbrowser {
  if (!hbInstance) {
    const apiKey = process.env.HYPERBROWSER_API_KEY
    if (!apiKey) {
      throw new Error('HYPERBROWSER_API_KEY environment variable is required')
    }
    hbInstance = new Hyperbrowser({
      apiKey,
    })
  }
  return hbInstance
}

/**
 * Export for backward compatibility
 * This is a getter that returns the instance
 */
export const hb = new Proxy({} as Hyperbrowser, {
  get: (target, prop) => {
    const instance = getHyperbrowser()
    return (instance as any)[prop]
  },
})

export interface CrawlOptions {
  url: string
  timeout?: number
  stealth?: boolean
  proxy?: 'residential' | 'datacenter' | false
}

export interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
  timestamp?: number
}

export const defaultCrawlOptions: Partial<CrawlOptions> = {
  timeout: 60000,
  stealth: true,
  proxy: 'residential'
} 