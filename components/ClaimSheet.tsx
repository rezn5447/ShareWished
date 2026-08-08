'use client'
import React, { useState } from 'react'
import { EyeOffIcon } from 'lucide-react'
import { Sheet } from './Sheet'
import { WishlistItem } from '@/types/wishlist'
interface ClaimSheetProps {
  item: WishlistItem | null
  ownerName: string
  defaultName: string
  onClose: () => void
  onConfirm: (name: string) => void
}
export function ClaimSheet({ item, ownerName, defaultName, onClose, onConfirm }: ClaimSheetProps) {
  const [name, setName] = useState(defaultName)
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onConfirm(name.trim())
  }
  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="Mark as bought">
      {item && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 rounded-2xl border border-line bg-cream p-3">
            <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <p className="self-center text-sm font-semibold leading-snug text-ink">{item.title}</p>
          </div>
          <div>
            <label htmlFor="gifter-name" className="mb-1.5 block text-xs font-semibold text-ink">
              Who should we show this as?
            </label>
            <input
              id="gifter-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jonah, or Mum & Dad"
              className="w-full rounded-2xl border border-line bg-cream px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
              required
            />
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Only other visitors see this, so nobody doubles up.
            </p>
          </div>
          <p className="flex items-start gap-2 rounded-2xl bg-sage-soft px-3 py-3 text-xs font-medium leading-relaxed text-sage">
            <EyeOffIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {ownerName.split(' ')[0]} will never see that this was bought — their list looks
            untouched.
          </p>
          <button
            type="submit"
            className="w-full rounded-full bg-ink py-3.5 text-sm font-semibold text-cream transition active:scale-[0.99]"
          >
            Yes, I bought it
          </button>
        </form>
      )}
    </Sheet>
  )
}
