'use client'

import { useEffect, useState } from 'react'

interface ConnectionStatusProps {
  onStatusChange?: (status: 'connected' | 'disconnected' | 'error') => void
}

export default function ConnectionStatus({ onStatusChange }: ConnectionStatusProps) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected')
  const [mode, setMode] = useState<'auto' | 'extension' | 'server'>('auto')
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkExtensionStatus()
    const interval = setInterval(checkExtensionStatus, 10000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    onStatusChange?.(status)
  }, [status, onStatusChange])

  const checkExtensionStatus = async () => {
    try {
      setIsChecking(true)
      const response = await fetch('/api/extension/status', {
        method: 'GET',
        headers: {
          'X-Extension-Key': 'deepcrawler-extension-v1',
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setStatus('connected')
      } else {
        setStatus('disconnected')
      }
    } catch (error) {
      console.warn('[ConnectionStatus] Check failed:', error)
      setStatus('disconnected')
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#4ade80'
      case 'disconnected':
        return '#888888'
      case 'error':
        return '#ef4444'
      default:
        return '#666666'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Extension Connected'
      case 'disconnected':
        return 'Extension Disconnected'
      case 'error':
        return 'Connection Error'
      default:
        return 'Unknown'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return '🟢'
      case 'disconnected':
        return '⚪'
      case 'error':
        return '🔴'
      default:
        return '❓'
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-black/40 border border-gray-700/40">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="text-sm font-medium text-gray-300">{getStatusText()}</span>
      </div>

      <div className="w-px h-4 bg-gray-700/40"></div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Mode:</span>
        <span className="text-xs font-medium text-gray-300">{mode.toUpperCase()}</span>
      </div>

      <button
        onClick={checkExtensionStatus}
        disabled={isChecking}
        className="ml-auto px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
        title="Refresh connection status"
      >
        {isChecking ? '⏳' : '🔄'}
      </button>
    </div>
  )
}

