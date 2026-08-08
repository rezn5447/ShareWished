'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellIcon, EyeOffIcon, HelpCircleIcon, LogOutIcon, ShieldIcon } from 'lucide-react'
import { useClerk, useUser } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'
import { useWishlistApi } from '@/lib/wishlist-api'
import { initials } from '@/utils/format'
import { Wishlist } from '@/types/wishlist'
const rows = [
  { Icon: BellIcon, label: 'Notifications', hint: 'New items, shared lists' },
  { Icon: ShieldIcon, label: 'Privacy', hint: 'Who can open your links' },
  { Icon: HelpCircleIcon, label: 'Help & feedback', hint: 'We read everything' },
]

export default function Profile() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const api = useWishlistApi()
  const router = useRouter()
  const [myLists, setMyLists] = useState<Wishlist[]>([])

  useEffect(() => {
    if (!user) return
    api.fetchMyLists(user.id).then(setMyLists)
  }, [user, api])

  const itemCount = myLists.reduce((sum, list) => sum + list.items.length, 0)
  const handleSignOut = () => {
    signOut(() => router.push('/'))
  }
  return (
    <MobileScreen>
      <TopBar title="You" />
      <main className="px-5 pt-4">
        <section className="flex items-center gap-4 rounded-xl2 border border-line bg-paper p-4 shadow-card">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft font-display text-lg font-semibold text-accent"
            aria-hidden="true"
          >
            {initials(user?.fullName ?? 'You')}
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink">{user?.fullName}</p>
            <p className="truncate text-xs text-muted">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </section>
        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="font-display text-2xl font-semibold text-ink">{myLists.length}</p>
            <p className="text-xs text-muted">Lists</p>
          </div>
          <div className="rounded-xl2 border border-line bg-paper p-4">
            <p className="font-display text-2xl font-semibold text-ink">{itemCount}</p>
            <p className="text-xs text-muted">Items saved</p>
          </div>
        </section>
        <section className="mt-3 rounded-xl2 bg-sage-soft p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-sage">
            <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
            Surprise mode
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-sage/80">
            Always on. Purchases are recorded for your visitors only — there's no screen anywhere in
            this app that can show them to you.
          </p>
        </section>
        <section className="mt-3 overflow-hidden rounded-xl2 border border-line bg-paper">
          {rows.map(({ Icon, label, hint }, index) => (
            <button
              key={label}
              type="button"
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition active:bg-cream ${
                index > 0 ? 'border-t border-line' : ''
              }`}
            >
              <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-ink">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </section>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-paper py-3.5 text-sm font-semibold text-accent transition active:scale-[0.99]"
        >
          <LogOutIcon className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </main>
      <BottomNav />
    </MobileScreen>
  )
}
