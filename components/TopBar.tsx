'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
interface TopBarProps {
  title?: string
  backTo?: string
  right?: React.ReactNode
  transparent?: boolean
}
export function TopBar({ title, backTo, right, transparent = false }: TopBarProps) {
  const router = useRouter()
  return (
    <header
      className={`sticky top-0 z-30 flex h-14 items-center gap-2 px-3 ${
        transparent ? 'bg-transparent' : 'border-b border-line bg-cream/90 backdrop-blur'
      }`}
    >
      {backTo !== undefined ? (
        <button
          type="button"
          onClick={() => (backTo ? router.push(backTo) : router.back())}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink shadow-sm transition active:scale-95"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : (
        <span className="w-1" />
      )}
      <h1 className="flex-1 truncate text-center font-display text-lg font-semibold text-ink">
        {title}
      </h1>
      <div className="flex min-w-[2.5rem] justify-end">{right}</div>
    </header>
  )
}
