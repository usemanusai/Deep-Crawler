'use client'

import { useState, useRef, useEffect } from 'react'
import UrlForm from '../components/UrlForm'
import ProgressBar from '../components/ProgressBar'
import ResultCard from '../components/ResultCard'
import EndpointList from '../components/EndpointList'
import TerminalSidebar from '../components/TerminalSidebar'
import Navbar from '../components/Navbar'
import ConnectionStatus from '../components/ConnectionStatus'
import SettingsPanel from '../components/SettingsPanel'

interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
}

interface CrawlResult {
  endpoints: ApiEndpoint[]
  postmanCollection: any
  crawlId: string
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CrawlResult | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [extensionStatus, setExtensionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [crawlMode, setCrawlMode] = useState<'manual' | 'auto'>('manual')
  const [inactivityTimeout, setInactivityTimeout] = useState(60)
  const [endpointCount, setEndpointCount] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [inactivityCountdown, setInactivityCountdown] = useState(0)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sseEventCountRef = useRef(0)

  // Timer effect for elapsed time
  useEffect(() => {
    if (!isLoading) return

    timerIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [isLoading])

  const handleStopCrawl = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
      setLogs(prev => [...prev, 'Crawl stopped by user'])
    }
  }

  const pollForResults = async (requestId: string, signal: AbortSignal) => {
    console.log('[Polling] Starting polling for results')
    setLogs(prev => [...prev, 'SSE connection lost, switching to polling mode...'])

    let pollCount = 0
    const maxPolls = 600 // 10 minutes with 1-second intervals

    while (pollCount < maxPolls && !signal.aborted) {
      try {
        const response = await fetch(`/api/extension/crawl/results?requestId=${requestId}`, {
          headers: { 'X-Extension-Key': 'deepcrawler-extension-v1' },
          signal
        })

        if (!response.ok) {
          console.warn(`[Polling] Error response: ${response.status}`)
          await new Promise(r => setTimeout(r, 1000))
          pollCount++
          continue
        }

        const data = await response.json()
        console.log(`[Polling] Poll #${pollCount}: ${data.endpointCount} endpoints, active: ${data.isActive}, complete: ${data.isComplete}`)

        setEndpointCount(data.endpointCount)
        setInactivityCountdown(data.inactivityCountdown || 0)

        if (data.isComplete) {
          console.log(`[Polling] Crawl complete: ${data.endpointCount} endpoints`)
          setLogs(prev => [...prev, `Polling: Crawl completed with ${data.endpointCount} endpoints`])
          setProgress(100)
          setIsLoading(false)

          // Fetch final results
          const finalResponse = await fetch('/api/crawl/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId })
          })

          if (finalResponse.ok) {
            const result = await finalResponse.json()
            setResult(result)
            console.log(`[Polling] Final result received: ${result.endpoints.length} endpoints`)
          } else {
            console.warn(`[Polling] Failed to fetch final results: ${finalResponse.status}`)
          }
          return
        }

        await new Promise(r => setTimeout(r, 1000))
        pollCount++
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[Polling] Polling aborted')
          return
        }
        console.error('[Polling] Error:', error)
        await new Promise(r => setTimeout(r, 1000))
        pollCount++
      }
    }

    if (pollCount >= maxPolls) {
      setLogs(prev => [...prev, 'Polling timeout: crawl took too long'])
      setErrorDetails('Polling timeout: crawl took too long to complete')
    }
  }

  const handleCrawl = async (url: string, options: { sameOriginOnly: boolean }) => {
    setIsLoading(true)
    setProgress(0)
    setResult(null)
    setLogs([])
    setEndpointCount(0)
    setElapsedTime(0)
    setInactivityCountdown(0)
    setErrorDetails(null)
    setSidebarOpen(true)
    startTimeRef.current = Date.now()
    sseEventCountRef.current = 0

    // Create abort controller for stop functionality
    abortControllerRef.current = new AbortController()
    let requestId: string | null = null

    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          sameOriginOnly: options?.sameOriginOnly ?? true,
          mode: crawlMode,
          inactivityTimeout
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              sseEventCountRef.current++

              if (data.type === 'request_id') {
                requestId = data.requestId
                console.log(`[SSE] Received request ID: ${requestId}`)
              } else if (data.type === 'progress') {
                setProgress(data.progress)
              } else if (data.type === 'log') {
                setLogs(prev => [...prev, data.message])
              } else if (data.type === 'endpoints_update') {
                setEndpointCount(data.count)
                setInactivityCountdown(data.inactivityCountdown || 0)
                console.log(`[SSE] Received endpoints_update: ${data.count} endpoints, inactivity: ${data.inactivityCountdown}s`)
              } else if (data.type === 'complete') {
                setResult(data.result)
                setProgress(100)
                setIsLoading(false)
                console.log(`[SSE] Crawl complete: ${data.result.endpoints.length} endpoints discovered`)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Crawl aborted by user')
        setLogs(prev => [...prev, 'Crawl stopped by user'])
        setIsLoading(false)
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Crawl failed:', error)
        console.log(`[SSE] Received ${sseEventCountRef.current} SSE events before error`)
        console.log(`[SSE] Current endpointCount state: ${endpointCount}`)

        // If SSE failed but we have a requestId, try polling regardless of current endpoint count
        // The endpoint count might not be updated in state yet when the stream closes
        if (requestId) {
          console.log(`[SSE] SSE connection lost, switching to polling with requestId: ${requestId}`)
          setLogs(prev => [...prev, `SSE connection lost. Switching to polling mode...`])
          await pollForResults(requestId, abortControllerRef.current!.signal)
        } else {
          // Provide more detailed error information
          let detailedError = errorMsg
          if (errorMsg.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')) {
            detailedError = 'SSE connection interrupted (chunked encoding error). Partial results may have been captured.'
          } else if (errorMsg.includes('network error')) {
            detailedError = 'Network connection lost. Partial results may have been captured.'
          } else if (errorMsg.includes('timeout')) {
            detailedError = 'Request timeout. The crawl took too long to complete.'
          }

          setErrorDetails(detailedError)
          setLogs(prev => [...prev, `Error: ${detailedError}`])
          setIsLoading(false)
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar onSettingsClick={() => setSettingsOpen(true)} />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Connection Status Bar */}
        <div className="mb-8">
          <ConnectionStatus onStatusChange={setExtensionStatus} />
        </div>

        <div className="text-center mb-12">
          <img src="/logo.svg" alt="DeepCrawler logo" className="mx-auto mb-5 h-10 w-auto" />
          <h1 className="font-manrope font-semibold tracking-tight-2 text-5xl md:text-6xl">
            <span className="text-gray-400">Deep</span>
            <span className="text-white">Crawler</span>
          </h1>
          <p className="mt-6 font-dmmono font-medium tracking-tight-2 text-xs md:text-sm text-gray-400 uppercase">
            Unlock hidden APIs in seconds from any website
          </p>
          <p className="mt-3 font-dmmono tracking-tight-2 text-[10px] md:text-xs text-gray-500 uppercase">
            An open-source project powered by Hyperbrowser.ai<br />
            Connect your Hyperbrowser API keys to get started
          </p>
        </div>

        <div className="relative rounded-2xl p-6 md:p-8 overflow-hidden bg-black/40 border border-gray-700/40">
          <ProgressBar progress={progress} isLoading={isLoading} />

          {isLoading ? (
            <div className="space-y-6">
              {/* Live Status Display */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-300">
                      Capturing... {endpointCount} endpoints found
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Elapsed: {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
                  </span>
                </div>
                {inactivityCountdown > 0 && (
                  <div className="text-xs text-yellow-500">
                    Auto-complete in {inactivityCountdown}s if no new endpoints detected
                  </div>
                )}
              </div>

              {/* Stop Crawl Button */}
              <button
                onClick={handleStopCrawl}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Stop Crawl
              </button>
            </div>
          ) : (
            <UrlForm
              onSubmit={handleCrawl}
              isLoading={isLoading}
              crawlMode={crawlMode}
              onCrawlModeChange={setCrawlMode}
              inactivityTimeout={inactivityTimeout}
              onInactivityTimeoutChange={setInactivityTimeout}
            />
          )}

          {result && (
            <div className="mt-8 animate-in fade-in duration-500">
              <ResultCard
                endpointCount={result.endpoints.length}
                crawlId={result.crawlId}
                postmanCollection={result.postmanCollection}
              />
              <EndpointList endpoints={result.endpoints} />
            </div>
          )}
        </div>

        {result && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium tracking-tight4">
              Powered by{' '}
              <a
                href="https://hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Hyperbrowser
              </a>
              {' • '}
              <a
                href="https://docs.hyperbrowser.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white transition-colors"
              >
                Get your API key
              </a>
            </p>
          </div>
        )}
      </main>

      <TerminalSidebar
        logs={logs}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
