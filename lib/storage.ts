/**
 * LocalStorage helpers for reconnection persistence.
 * Stores the minimum data needed to re-identify a player after page refresh.
 */

const STORAGE_KEY = 'bunker:session'

export interface SessionData {
  roomCode: string
  nickname: string
}

export function saveSession(data: SessionData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage might be full or blocked
  }
}

export function loadSession(): SessionData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
