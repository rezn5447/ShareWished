'use client'
import React, { createContext, useCallback, useContext, useSyncExternalStore } from 'react'

interface WishlistContextValue {
  /**
   * Display name an anonymous gifter enters when claiming an item.
   * Persisted to localStorage so it's prefilled next time.
   */
  gifterName: string
  setGifterName: (name: string) => void
  /**
   * Claim tokens by item id. Gifters never sign in, so holding the token
   * returned by `claim_item` is what proves "I claimed this" — and is the
   * only thing that lets them undo it.
   */
  claimTokens: Record<string, string>
  rememberClaim: (itemId: string, token: string) => void
  forgetClaim: (itemId: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)
const STORAGE_KEY = 'wishlisted:gifter-name'
const CLAIMS_KEY = 'wishlisted:claims'
const NO_CLAIMS: Record<string, string> = {}

// Minimal localStorage-backed store for useSyncExternalStore. Falls back to
// memory when storage is unavailable (private mode), so values still last
// for the session.
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keeps other tabs in sync, e.g. a claim made in a second tab.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  memory.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* storage unavailable — the in-memory copy is used instead */
  }
  listeners.forEach((listener) => listener())
}

// useSyncExternalStore needs a stable snapshot, so cache the parsed claims
// against the raw string they came from.
let claimsCache: { raw: string | null; value: Record<string, string> } = {
  raw: null,
  value: NO_CLAIMS,
}

function readClaims(): Record<string, string> {
  const raw = read(CLAIMS_KEY)
  if (raw !== claimsCache.raw) {
    let value = NO_CLAIMS
    try {
      value = raw ? JSON.parse(raw) : NO_CLAIMS
    } catch {
      /* corrupted entry — treat as no claims */
    }
    claimsCache = { raw, value }
  }
  return claimsCache.value
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const gifterName = useSyncExternalStore(
    subscribe,
    () => read(STORAGE_KEY) ?? '',
    () => '',
  )
  const claimTokens = useSyncExternalStore(subscribe, readClaims, () => NO_CLAIMS)

  const setGifterName = useCallback((name: string) => write(STORAGE_KEY, name), [])

  const rememberClaim = useCallback((itemId: string, token: string) => {
    write(CLAIMS_KEY, JSON.stringify({ ...readClaims(), [itemId]: token }))
  }, [])

  const forgetClaim = useCallback((itemId: string) => {
    const next = { ...readClaims() }
    delete next[itemId]
    write(CLAIMS_KEY, JSON.stringify(next))
  }, [])

  return (
    <WishlistContext.Provider
      value={{ gifterName, setGifterName, claimTokens, rememberClaim, forgetClaim }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlists(): WishlistContextValue {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlists must be used inside a WishlistProvider')
  }
  return context
}
