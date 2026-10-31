'use client'
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

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

function readClaims(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CLAIMS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeClaims(claims: Record<string, string>) {
  try {
    window.localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims))
  } catch {
    /* storage may be unavailable (private mode) — claims just won't survive a refresh */
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [gifterName, setGifterNameState] = useState('')
  const [claimTokens, setClaimTokens] = useState<Record<string, string>>({})

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setGifterNameState(stored)
    setClaimTokens(readClaims())
  }, [])

  const setGifterName = (name: string) => {
    setGifterNameState(name)
    window.localStorage.setItem(STORAGE_KEY, name)
  }

  const rememberClaim = useCallback((itemId: string, token: string) => {
    setClaimTokens((current) => {
      const next = { ...current, [itemId]: token }
      writeClaims(next)
      return next
    })
  }, [])

  const forgetClaim = useCallback((itemId: string) => {
    setClaimTokens((current) => {
      const { [itemId]: _removed, ...next } = current
      writeClaims(next)
      return next
    })
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
