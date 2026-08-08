'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, EyeOffIcon, GiftIcon } from 'lucide-react'
import { MobileScreen } from '@/components/MobileScreen'
import { ItemCard } from '@/components/ItemCard'
import { ClaimSheet } from '@/components/ClaimSheet'
import { useWishlists } from '@/contexts/WishlistContext'
import { useWishlistApi } from '@/lib/wishlist-api'
import { getCover } from '@/data/covers'
import { daysUntil, formatEventDate } from '@/utils/format'
import { Wishlist } from '@/types/wishlist'
type Filter = 'available' | 'all'
export default function SharedList() {
  const { shareId } = useParams<{ shareId: string }>()
  const { gifterName, setGifterName } = useWishlists()
  const api = useWishlistApi()
  const [filter, setFilter] = useState<Filter>('available')
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [list, setList] = useState<Wishlist | null | undefined>(undefined)

  const refresh = useCallback(() => {
    api.fetchSharedList(shareId).then(setList)
  }, [api, shareId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const items = useMemo(() => {
    if (!list) return []
    const sorted = [...list.items].sort(
      (a, b) => Number(Boolean(a.purchase)) - Number(Boolean(b.purchase)),
    )
    return filter === 'available' ? sorted.filter((item) => !item.purchase) : sorted
  }, [list, filter])
  const claiming = list?.items.find((item) => item.id === claimingId) ?? null

  if (list === undefined) {
    return (
      <MobileScreen padBottom={false}>
        <div className="animate-pulse space-y-3 px-5 pt-10">
          <div className="h-40 rounded-xl2 bg-paper/60" />
          <div className="h-20 rounded-xl2 bg-paper/60" />
        </div>
      </MobileScreen>
    )
  }
  if (!list) {
    return (
      <MobileScreen padBottom={false}>
        <div className="px-6 py-24 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">This link isn't working</h1>
          <p className="mt-2 text-sm text-muted">
            The list may have been deleted, or the link was mistyped.
          </p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-accent underline">
            Go to Wishlisted
          </Link>
        </div>
      </MobileScreen>
    )
  }
  const cover = getCover(list.cover)
  const days = daysUntil(list.eventDate)
  const claimedCount = list.items.filter((item) => item.purchase).length
  const firstName = list.ownerName.split(' ')[0]
  const confirmClaim = async (name: string) => {
    if (!claiming) return
    setGifterName(name)
    await api.markPurchased(claiming.id, name)
    setToast(`Locked in. ${firstName} won't see a thing.`)
    setClaimingId(null)
    refresh()
    window.setTimeout(() => setToast(''), 3200)
  }
  return (
    <MobileScreen padBottom={false}>
      <div className="pb-16">
        <header className={`${cover.bg} px-5 pb-6 pt-10`}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">
            Wishlisted
          </p>
          <span className="mt-4 block text-3xl" aria-hidden="true">
            {cover.emoji}
          </span>
          <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-ink">
            {firstName}'s {list.title}
          </h1>
          <p className="mt-1 text-xs font-medium text-ink/60">
            {list.occasion}
            {formatEventDate(list.eventDate) && ` · ${formatEventDate(list.eventDate)}`}
            {days !== null && days >= 0 && ` · ${days} days away`}
          </p>
          {list.note && (
            <p className="mt-3 rounded-2xl bg-paper/70 p-3 text-sm leading-relaxed text-ink/80">
              "{list.note}"
            </p>
          )}
        </header>
        <div className="mx-5 -mt-3 flex items-start gap-2 rounded-2xl border border-line bg-paper px-3 py-3 shadow-card">
          <EyeOffIcon className="mt-0.5 h-4 w-4 shrink-0 text-sage" aria-hidden="true" />
          <p className="text-[12px] leading-relaxed text-muted">
            Anything marked bought is hidden from {firstName} — but visible here so two people don't
            get the same gift.
          </p>
        </div>
        <div className="sticky top-0 z-20 mt-4 flex items-center gap-2 border-b border-line bg-cream/95 px-5 py-3 backdrop-blur">
          {(['available', 'all'] as Filter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === value ? 'bg-ink text-cream' : 'bg-paper text-muted border border-line'
              }`}
            >
              {value === 'available'
                ? `Still available (${list.items.length - claimedCount})`
                : `All (${list.items.length})`}
            </button>
          ))}
        </div>
        <main className="space-y-3 px-5 pt-4">
          {items.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
              <GiftIcon className="mx-auto h-6 w-6 text-sage" aria-hidden="true" />
              <h2 className="mt-3 font-display text-base font-semibold text-ink">
                Everything's covered
              </h2>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">
                Every item on this list has been claimed by someone. Switch to "All" to see them.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  mode="gifter"
                  claimedByMe={Boolean(
                    item.purchase && gifterName && item.purchase.by === gifterName,
                  )}
                  onClaim={(claimed) => setClaimingId(claimed.id)}
                  onUndo={() => api.undoPurchase(item.id).then(refresh)}
                />
              ))}
            </AnimatePresence>
          )}
          <p className="pt-4 text-center text-xs text-muted">
            Want your own list?{' '}
            <Link href="/" className="font-semibold text-ink underline underline-offset-4">
              Try Wishlisted
            </Link>
          </p>
        </main>
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            className="fixed bottom-6 left-1/2 z-50 flex w-[min(22rem,90vw)] -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-3 text-xs font-semibold text-cream shadow-lg"
          >
            <CheckIcon className="h-4 w-4 text-sage" aria-hidden="true" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <ClaimSheet
        key={claiming?.id ?? 'claim-sheet'}
        item={claiming}
        ownerName={list.ownerName}
        defaultName={gifterName}
        onClose={() => setClaimingId(null)}
        onConfirm={confirmClaim}
      />
    </MobileScreen>
  )
}
