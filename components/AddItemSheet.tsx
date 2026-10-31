'use client'
import React, { useState } from 'react'
import { AlertCircleIcon, LinkIcon, Loader2Icon } from 'lucide-react'
import { Sheet } from './Sheet'
import { NewItemInput } from '@/lib/wishlist-api'
import { LinkPreview, Priority } from '@/types/wishlist'
import { fetchLinkPreview } from '@/utils/linkPreview'
interface AddItemSheetProps {
  open: boolean
  onClose: () => void
  onAdd: (input: NewItemInput) => void
}
const priorities: Array<{ value: Priority; label: string }> = [
  { value: 'low', label: 'Nice to have' },
  { value: 'normal', label: 'Would love' },
  { value: 'must', label: 'Top pick' },
]
export function AddItemSheet({ open, onClose, onAdd }: AddItemSheetProps) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const reset = () => {
    setUrl('')
    setStatus('idle')
    setError('')
    setPreview(null)
    setTitle('')
    setPrice('')
    setNote('')
    setPriority('normal')
  }
  const close = () => {
    reset()
    onClose()
  }
  const handleFetch = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const result = await fetchLinkPreview(url)
      setPreview(result)
      setTitle(result.title)
      setPrice(result.price ? String(result.price) : '')
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!preview || !title.trim()) return
    onAdd({
      title: title.trim(),
      url: url.trim(),
      retailer: preview.retailer,
      image: preview.image,
      price: Number(price) || 0,
      note: note.trim() || undefined,
      priority,
    })
    close()
  }
  return (
    <Sheet open={open} onClose={close} title="Add from a link">
      {status !== 'ready' ? (
        <form onSubmit={handleFetch} className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            Paste a product link from Amazon, Target, Etsy — anywhere you shop. We&apos;ll pull in the
            details.
          </p>
          <div>
            <label htmlFor="item-url" className="mb-1.5 block text-xs font-semibold text-ink">
              Product link
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-cream px-3 focus-within:border-ink">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                id="item-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.amazon.com/..."
                className="w-full bg-transparent py-3 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
                required
              />
            </div>
          </div>
          {status === 'error' && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-xs font-medium text-accent"
            >
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={status === 'loading' || !url.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-cream transition active:scale-[0.99] disabled:opacity-40"
          >
            {status === 'loading' ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
                Reading the page…
              </>
            ) : (
              'Fetch details'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3 rounded-2xl border border-line bg-cream p-3">
            <img
              src={preview?.image}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {preview?.retailer}
              </p>
              <p className="mt-0.5 truncate text-sm text-ink">{url}</p>
            </div>
          </div>
          <div>
            <label htmlFor="item-title" className="mb-1.5 block text-xs font-semibold text-ink">
              Item name
            </label>
            <input
              id="item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-line bg-cream px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="item-price" className="mb-1.5 block text-xs font-semibold text-ink">
              Price (USD)
            </label>
            <input
              id="item-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border border-line bg-cream px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="item-note" className="mb-1.5 block text-xs font-semibold text-ink">
              Note for gifters <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder="Size, colour, anything helpful"
              className="w-full resize-none rounded-2xl border border-line bg-cream px-3 py-3 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink">How much do you want it?</legend>
            <div className="flex gap-2">
              {priorities.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  aria-pressed={priority === option.value}
                  className={`flex-1 rounded-full border px-2 py-2.5 text-xs font-semibold transition ${
                    priority === option.value
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line bg-cream text-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            Add to wishlist
          </button>
        </form>
      )}
    </Sheet>
  )
}
