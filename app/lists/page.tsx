'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PlusIcon, SparklesIcon } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
import { BottomNav } from '@/components/BottomNav'
import { ListCard } from '@/components/ListCard'
import { useWishlistApi } from '@/lib/wishlist-api'
import { Wishlist } from '@/types/wishlist'

export default function Lists() {
  const { user } = useUser()
  const api = useWishlistApi()
  const [myLists, setMyLists] = useState<Wishlist[]>([])
  // Id of the user whose lists have finished loading; loading until it matches.
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loading = !user || loadedFor !== user.id
  const firstName = user?.firstName ?? 'there'

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .fetchMyLists(user.id)
      .then((lists) => {
        if (!cancelled) setMyLists(lists)
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(user.id)
      })
    return () => {
      cancelled = true
    }
  }, [user, api])

  return (
    <MobileScreen>
      <header className="px-5 pb-4 pt-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Gimme</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">Hi, {firstName}</h1>
        <p className="mt-1 text-sm text-muted">
          {myLists.length === 0
            ? 'Start a list and share it with the people who ask what you want.'
            : 'Your lists are looking good. Share one to get gifts moving.'}
        </p>
      </header>
      <main className="space-y-3 px-5">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-xl2 bg-paper/60" />
            <div className="h-20 rounded-xl2 bg-paper/60" />
          </div>
        ) : myLists.length === 0 ? (
          <div className="rounded-xl2 border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
            <SparklesIcon className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
            <h2 className="mt-3 font-display text-lg font-semibold text-ink">No lists yet</h2>
            <p className="mx-auto mt-1 max-w-[16rem] text-sm leading-relaxed text-muted">
              Birthday, housewarming, or just a running list of things you love.
            </p>
            <Link
              href="/create"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Create a list
            </Link>
          </div>
        ) : (
          myLists.map((list, index) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.35 }}
            >
              <ListCard list={list} />
            </motion.div>
          ))
        )}
        {!loading && myLists.length > 0 && (
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 rounded-xl2 border border-dashed border-line py-4 text-sm font-semibold text-muted transition active:scale-[0.99]"
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            New list
          </Link>
        )}
        <div className="mt-6 rounded-xl2 bg-ink p-5 text-cream">
          <h2 className="font-display text-base font-semibold">Your lists stay a surprise</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-cream/70">
            We never show you what&apos;s been bought. Visitors see the claimed items — you just see your
            list, exactly as you wrote it.
          </p>
        </div>
      </main>
      <BottomNav />
    </MobileScreen>
  )
}
