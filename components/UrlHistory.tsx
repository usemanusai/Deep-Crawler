'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'

interface UrlHistoryEntry {
  url: string
  timestamp: number
}

interface UrlHistoryProps {
  onSelectUrl: (url: string) => void
  onAddUrl: (url: string) => void
  isLoading: boolean
}

const STORAGE_KEY = 'deepcrawler_url_history'
const MAX_HISTORY = 500

export default function UrlHistory({ onSelectUrl, onAddUrl, isLoading }: UrlHistoryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<UrlHistoryEntry[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setHistory(parsed)
      } catch (e) {
        console.error('Failed to parse URL history:', e)
      }
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addUrlToHistory = (url: string) => {
    // Remove if already exists
    const filtered = history.filter(entry => entry.url !== url)
    
    // Add to beginning with current timestamp
    const updated = [
      { url, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY)

    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    onAddUrl(url)
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
    setIsOpen(false)
  }

  const handleSelectUrl = (url: string) => {
    onSelectUrl(url)
    setIsOpen(false)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength - 3) + '...'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="URL History"
        >
          <ChevronDown 
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/80 border border-gray-700/50 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto backdrop-blur-sm">
          {history.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No URL history yet. Start crawling to build history.
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-700/30">
                {history.map((entry, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectUrl(entry.url)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700/30 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-200 truncate font-medium">
                        {truncateUrl(entry.url)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-700/30 p-3 bg-black/40">
                <button
                  onClick={clearHistory}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

