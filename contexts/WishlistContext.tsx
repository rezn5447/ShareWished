'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface WishlistContextValue {
  /**
   * Display name an anonymous gifter enters when claiming an item.
   * Persisted to localStorage so "claimed by me" survives a refresh —
   * gifters never sign in, so this is the only identity they have.
   */
  gifterName: string
  setGifterName: (name: string) => void
}

const WishlistContext = createContext<WishlistContextValue | null>(null)
const STORAGE_KEY = 'wishlisted:gifter-name'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [gifterName, setGifterNameState] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) setGifterNameState(stored)
  }, [])

  const setGifterName = (name: string) => {
    setGifterNameState(name)
    window.localStorage.setItem(STORAGE_KEY, name)
  }

  return (
    <WishlistContext.Provider value={{ gifterName, setGifterName }}>
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
