'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, ExternalLinkIcon, PencilIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { WishlistItem } from '@/types/wishlist'
import { formatPrice } from '@/utils/format'
interface ItemCardProps {
  item: WishlistItem
  mode: 'owner' | 'gifter'
  /** Owner only. */
  onEdit?: (item: WishlistItem) => void
  /** Owner only. */
  onRemove?: (item: WishlistItem) => void
  /** Gifter only. */
  onClaim?: (item: WishlistItem) => void
  onUndo?: (item: WishlistItem) => void
  /** Gifter only — true when the current visitor is the one who claimed it. */
  claimedByMe?: boolean
}
export function ItemCard({ item, mode, onEdit, onRemove, onClaim, onUndo, claimedByMe }: ItemCardProps) {
  const purchased = mode === 'gifter' && Boolean(item.purchase)
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`rounded-xl2 border bg-paper p-3 shadow-card transition ${
        purchased ? 'border-sage/30 bg-sage-soft/40' : 'border-line'
      }`}
    >
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-cream">
          <img
            src={item.image}
            alt={item.title}
            className={`h-full w-full object-cover ${purchased ? 'opacity-55 saturate-50' : ''}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          {item.editedAt && (
            // Tells gifters the details changed since they may have last looked.
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <time dateTime={item.editedAt} title={`Edited ${new Date(item.editedAt).toLocaleString()}`}>
                Edited
              </time>
            </p>
          )}
          <div className="flex items-start gap-1">
            <h3
              className={`flex-1 text-[15px] font-semibold leading-snug text-ink ${
                purchased ? 'opacity-70' : ''
              }`}
            >
              {item.title}
            </h3>
            {mode === 'owner' && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label={`Edit ${item.title}`}
                className="-mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-cream active:scale-95"
              >
                <PencilIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {mode === 'owner' && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item.title}`}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-cream active:scale-95"
              >
                <Trash2Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-semibold text-ink">
              {item.price > 0 ? formatPrice(item.price) : 'Price varies'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{item.retailer}</span>
            {item.priority === 'must' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                <StarIcon className="h-3 w-3" aria-hidden="true" />
                Top pick
              </span>
            )}
          </div>
          {item.note && (
            <p className="mt-1.5 text-xs leading-relaxed text-muted">&quot;{item.note}&quot;</p>
          )}
        </div>
      </div>
      {mode === 'gifter' && (
        <div className="mt-3 border-t border-line/70 pt-3">
          {purchased ? (
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-sage">
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                {claimedByMe ? "You're covering this" : `Covered by ${item.purchase?.by}`}
              </p>
              {claimedByMe && onUndo && (
                <button
                  type="button"
                  onClick={() => onUndo(item)}
                  className="text-xs font-semibold text-muted underline underline-offset-2"
                >
                  Undo
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-cream px-3 py-2.5 text-xs font-semibold text-ink transition active:scale-[0.98]"
              >
                View at {item.retailer}
                <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => onClaim?.(item)}
                className="flex-1 rounded-full bg-ink px-3 py-2.5 text-xs font-semibold text-cream transition active:scale-[0.98]"
              >
                I bought this
              </button>
            </div>
          )}
        </div>
      )}
    </motion.article>
  )
}
