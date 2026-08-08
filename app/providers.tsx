'use client'
import React from 'react'
import { WishlistProvider } from '@/contexts/WishlistContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return <WishlistProvider>{children}</WishlistProvider>
}
