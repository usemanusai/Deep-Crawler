// Global state for Chrome extension connectivity
// Tracks last heartbeat timestamp from the extension background service worker

export type ExtensionHeartbeatState = {
  lastHeartbeatMs: number | null
}

declare global {
  // eslint-disable-next-line no-var
  var __EXTENSION_HEARTBEAT__: ExtensionHeartbeatState | undefined
}

const g = globalThis as unknown as { __EXTENSION_HEARTBEAT__?: ExtensionHeartbeatState }

export const extensionHeartbeat: ExtensionHeartbeatState =
  g.__EXTENSION_HEARTBEAT__ || (g.__EXTENSION_HEARTBEAT__ = { lastHeartbeatMs: null })

export function markExtensionHeartbeat() {
  extensionHeartbeat.lastHeartbeatMs = Date.now()
}

export function isExtensionRecentlyAlive(graceMs = 45000): boolean {
  if (!extensionHeartbeat.lastHeartbeatMs) return false
  return Date.now() - extensionHeartbeat.lastHeartbeatMs < graceMs
}

