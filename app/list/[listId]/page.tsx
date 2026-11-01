'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { EyeOffIcon, PlusIcon, Share2Icon } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'
import { ItemCard } from '@/components/ItemCard'
import { AddItemSheet } from '@/components/AddItemSheet'
import { ShareSheet } from '@/components/ShareSheet'
import { useWishlistApi } from '@/lib/wishlist-api'
import { getCover } from '@/data/covers'
import { daysUntil, formatEventDate, formatPrice } from '@/utils/format'
import { Wishlist } from '@/types/wishlist'

export default function ListDetail() {
  const { listId } = useParams<{ listId: string }>()
  const { user } = useUser()
  const api = useWishlistApi()
  const [addOpen, setAddOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [list, setList] = useState<Wishlist | null | undefined>(undefined)

  const refresh = useCallback(() => {
    if (!user) return
    api.fetchOwnerList(listId, user.id).then(setList)
  }, [api, listId, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (list === undefined) {
    return (
      <MobileScreen>
        <TopBar title="List" backTo="/lists" />
        <div className="animate-pulse space-y-3 px-5 pt-4">
          <div className="h-40 rounded-xl2 bg-paper/60" />
          <div className="h-20 rounded-xl2 bg-paper/60" />
        </div>
      </MobileScreen>
    )
  }
  if (!list) {
    return (
      <MobileScreen>
        <TopBar title="List" backTo="/lists" />
        <div className="px-6 py-20 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">List not found</h2>
          <Link href="/lists" className="mt-3 inline-block text-sm font-semibold text-accent underline">
            Back to your lists
          </Link>
        </div>
      </MobileScreen>
    )
  }
  const cover = getCover(list.cover)
  const days = daysUntil(list.eventDate)
  const total = list.items.reduce((sum, item) => sum + item.price, 0)
  return (
    <MobileScreen>
      <TopBar
        backTo="/lists"
        title={list.title}
        right={
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label="Share list"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-ink shadow-sm transition active:scale-95"
          >
            <Share2Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />
      <section className={`mx-5 mt-2 rounded-xl2 ${cover.bg} p-5`}>
        <span className="text-3xl" aria-hidden="true">
          {cover.emoji}
        </span>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink">
          {list.title}
        </h2>
        <p className="mt-1 text-xs font-medium text-ink/60">
          {list.occasion}
          {formatEventDate(list.eventDate) && ` · ${formatEventDate(list.eventDate)}`}
          {days !== null && days >= 0 && ` · ${days} days away`}
        </p>
        {list.note && <p className="mt-3 text-sm leading-relaxed text-ink/75">{list.note}</p>}
        <div className="mt-4 flex gap-4 border-t border-ink/10 pt-3 text-xs text-ink/60">
          <span>
            <span className="font-semibold text-ink">{list.items.length}</span> items
          </span>
          <span>
            <span className="font-semibold text-ink">{formatPrice(total)}</span> total
          </span>
        </div>
      </section>
      <p className="mx-5 mt-3 flex items-start gap-2 rounded-2xl border border-line bg-paper px-3 py-2.5 text-[11px] leading-relaxed text-muted">
        <EyeOffIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" aria-hidden="true" />
        Surprise mode is on. Gifts claimed by your friends stay hidden from you.
      </p>
      <main className="mt-4 space-y-3 px-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">Items</h3>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-cream transition active:scale-95"
          >
            <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Add item
          </button>
        </div>
        {list.items.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
            <h4 className="font-display text-base font-semibold text-ink">Nothing here yet</h4>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">
              Add the things you&apos;d love, with a link so friends know exactly what to get.
            </p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Add your first item
            </button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {list.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                mode="owner"
                onRemove={() => api.removeItem(item.id).then(refresh)}
              />
            ))}
          </AnimatePresence>
        )}
      </main>
      <div className="fixed bottom-0 w-full max-w-md border-t border-line bg-paper/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          <Share2Icon className="h-4 w-4" aria-hidden="true" />
          Share list
        </button>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
      <AddItemSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(input) => api.addItem(list.id, input).then(refresh)}
      />
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareId={list.shareId}
        listTitle={list.title}
      />
    </MobileScreen>
  )
}
