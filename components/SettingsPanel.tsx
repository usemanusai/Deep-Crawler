'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [mode, setMode] = useState<'auto' | 'extension' | 'server'>('auto')
  const [backendUrl, setBackendUrl] = useState('http://localhost:3002')
  const [apiKey, setApiKey] = useState('deepcrawler-extension-v1')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const handleSave = async () => {
    setSaveStatus('saving')
    try {
      // Save to localStorage for persistence
      localStorage.setItem('deepcrawler-settings', JSON.stringify({
        mode,
        backendUrl,
        apiKey
      }))
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-black/90 border border-gray-700/40 rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Crawling Mode
            </label>
            <div className="space-y-2">
              {(['auto', 'extension', 'server'] as const).map((m) => (
                <label key={m} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    checked={mode === m}
                    onChange={(e) => setMode(e.target.value as typeof m)}
                    className="w-4 h-4 accent-[#F0FF26]"
                  />
                  <span className="text-sm text-gray-300 capitalize">
                    {m === 'auto' && 'Auto (Extension if available, fallback to server)'}
                    {m === 'extension' && 'Extension Only (fail if unavailable)'}
                    {m === 'server' && 'Server-side Only (always use Hyperbrowser)'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Backend URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backend URL
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3002"
              className="w-full px-3 py-2 bg-black/40 border border-gray-700/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#F0FF26] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL where DeepCrawler backend is running
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Extension API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="deepcrawler-extension-v1"
                className="w-full px-3 py-2 bg-black/40 border border-gray-700/50 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#F0FF26] focus:border-transparent"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              API key for authenticating with backend
            </p>
          </div>

          {/* Info */}
          <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-3">
            <p className="text-xs text-gray-400">
              <strong>Extension Status:</strong> Check the indicator at the top of the page
            </p>
            <p className="text-xs text-gray-400 mt-2">
              <strong>Install Extension:</strong> Load the extension from <code className="text-gray-500">extension/</code> folder
            </p>
          </div>

          {/* Status Message */}
          {saveStatus !== 'idle' && (
            <div className={`p-3 rounded-lg text-sm text-center ${
              saveStatus === 'saving' ? 'bg-blue-900/30 text-blue-300' :
              saveStatus === 'saved' ? 'bg-green-900/30 text-green-300' :
              'bg-red-900/30 text-red-300'
            }`}>
              {saveStatus === 'saving' && '💾 Saving...'}
              {saveStatus === 'saved' && '✓ Settings saved'}
              {saveStatus === 'error' && '✗ Failed to save'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-[#F0FF26] text-black font-semibold rounded-lg hover:bg-[#e8ff00] transition-colors"
            >
              💾 Save
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-800 text-gray-200 font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

