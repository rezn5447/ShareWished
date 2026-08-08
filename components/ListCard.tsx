import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'
import { Wishlist } from '@/types/wishlist'
import { getCover } from '@/data/covers'
import { daysUntil, formatEventDate } from '@/utils/format'
export function ListCard({ list }: { list: Wishlist }) {
  const cover = getCover(list.cover)
  const days = daysUntil(list.eventDate)
  const dateLabel = formatEventDate(list.eventDate)
  return (
    <Link
      href={`/list/${list.id}`}
      className="flex items-center gap-3 rounded-xl2 border border-line bg-paper p-3 shadow-card transition active:scale-[0.99]"
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${cover.bg}`}
        aria-hidden="true"
      >
        {cover.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-base font-semibold text-ink">{list.title}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {list.items.length} {list.items.length === 1 ? 'item' : 'items'}
          {dateLabel && ` · ${dateLabel}`}
          {days !== null && days >= 0 && days <= 60 && ` · in ${days} days`}
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
    </Link>
  )
}
