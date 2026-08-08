'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { CheckIcon, CopyIcon, EyeIcon, MessageCircleIcon } from 'lucide-react'
import { Sheet } from './Sheet'
interface ShareSheetProps {
  open: boolean
  onClose: () => void
  shareId: string
  listTitle: string
}
export function ShareSheet({ open, onClose, shareId, listTitle }: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const url = `wishlisted.app/w/${shareId}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${url}`)
    } catch {
      /* clipboard may be unavailable — the link is still visible above */
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Share your list">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Anyone with this link can see <span className="font-semibold text-ink">{listTitle}</span>{' '}
          and claim a gift — no account needed.
        </p>
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line bg-cream px-3 py-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{url}</span>
          <button
            type="button"
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-cream transition active:scale-95"
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5" aria-hidden="true" /> Copy
              </>
            )}
          </button>
        </div>
        <a
          href={`sms:&body=${encodeURIComponent(`Here's my wishlist: https://${url}`)}`}
          className="flex items-center justify-center gap-2 rounded-full border border-line bg-cream py-3.5 text-sm font-semibold text-ink transition active:scale-[0.99]"
        >
          <MessageCircleIcon className="h-4 w-4" aria-hidden="true" />
          Send in a message
        </a>
        <Link
          href={`/w/${shareId}`}
          className="flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold text-muted underline underline-offset-4"
        >
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
          Peek at what visitors see
        </Link>
      </div>
    </Sheet>
  )
}
