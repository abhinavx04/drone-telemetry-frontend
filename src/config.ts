const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

// Base URLs for REST and WebSocket traffic. Ensure VITE_API_BASE is set to your VPS
// public IP or domain (e.g. http://123.45.67.89:8000 or https://drone.yourdomain.com).
export const API_BASE =
  trimTrailingSlash(import.meta.env.VITE_API_BASE || 'http://localhost:8000')

// WebSocket base mirrors the HTTP(S) host.
export const WS_BASE = API_BASE.replace(/^http(s?)/, 'ws$1')

export const STALE_THRESHOLD_MS = 10_000
export const RECONNECT_MAX_DELAY_MS = 10_000
export const RECONNECT_BASE_DELAY_MS = 1_000
export const HISTORY_POINTS = 120

