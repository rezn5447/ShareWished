'use client'
import React, { useRef, useState } from 'react'
import { LinkIcon, Loader2Icon } from 'lucide-react'
import { Sheet } from './Sheet'
import { NewItemInput } from '@/lib/wishlist-api'
import { LinkPreview, Priority } from '@/types/wishlist'
import { retailerFromUrl } from '@/utils/format'
import { fetchLinkPreview, parseSharedText, PLACEHOLDER_IMAGE } from '@/utils/linkPreview'
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
const inputClass =
  'w-full rounded-2xl border border-line bg-cream px-3 py-3 text-sm text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none'
export function AddItemSheet({ open, onClose, onAdd }: AddItemSheetProps) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [looking, setLooking] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  // Only the newest lookup may fill the form; older ones are for links since edited.
  const lookupFor = useRef('')
  const reset = () => {
    setUrl('')
    setPreview(null)
    setLooking(false)
    setLinkError('')
    setTitle('')
    setPrice('')
    setNote('')
    setPriority('normal')
    lookupFor.current = ''
  }
  const close = () => {
    reset()
    onClose()
  }
  /**
   * Best-effort fill-in after a link is pasted. Many shops (Amazon included)
   * block us, so this never blocks the form and only fills fields left empty.
   */
  const lookUp = async (input: string) => {
    const { url: link } = parseSharedText(input)
    if (!link || link === lookupFor.current) return
    lookupFor.current = link
    setLooking(true)
    try {
      const result = await fetchLinkPreview(input)
      if (lookupFor.current !== link) return
      // Swap share text for the bare link, unless the link was edited meanwhile.
      setUrl((current) => (parseSharedText(current).url === link ? link : current))
      setPreview(result)
      setTitle((current) => current || result.title)
      setPrice((current) => current || (result.price ? String(result.price) : ''))
    } catch {
      /* the person can still fill everything in by hand */
    } finally {
      if (lookupFor.current === link) setLooking(false)
    }
  }
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const { url: link } = parseSharedText(url)
    if (!link) {
      setLinkError("That doesn't look like a link. Paste the full web address.")
      return
    }
    if (!title.trim()) return
    // The lookup may be for an older link, or may not have finished.
    const matches = preview && lookupFor.current === link
    onAdd({
      title: title.trim(),
      url: link,
      retailer: matches ? preview.retailer : retailerFromUrl(link),
      image: matches ? preview.image : PLACEHOLDER_IMAGE,
      price: Number(price) || 0,
      note: note.trim() || undefined,
      priority,
    })
    close()
  }
  return (
    <Sheet open={open} onClose={close} title="Add an item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <img
            src={preview?.image ?? PLACEHOLDER_IMAGE}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover"
          />
          <div className="min-w-0 flex-1">
            <label htmlFor="item-url" className="mb-1.5 block text-xs font-semibold text-ink">
              Link
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-cream px-3 focus-within:border-ink">
              {looking ? (
                <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-muted" aria-label="Looking up details" />
              ) : (
                <LinkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              )}
              <input
                id="item-url"
                type="text"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  setLinkError('')
                }}
                onPaste={(event) => lookUp(event.clipboardData.getData('text'))}
                onBlur={() => lookUp(url)}
                placeholder="Paste from any shop"
                className="w-full bg-transparent py-3 text-sm text-ink placeholder:text-muted/70 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>
        {linkError && (
          <p role="alert" className="text-xs font-medium text-accent">
            {linkError}
          </p>
        )}
        <div>
          <label htmlFor="item-title" className="mb-1.5 block text-xs font-semibold text-ink">
            Item name
          </label>
          <input
            id="item-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What is it? Include size or colour if it matters"
            className={inputClass}
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
            className={inputClass}
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
            className={`${inputClass} resize-none`}
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
    </Sheet>
  )
}
