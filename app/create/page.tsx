'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'
import { covers } from '@/data/covers'
import { useWishlistApi } from '@/lib/wishlist-api'
import { CoverKey } from '@/types/wishlist'

export default function CreateList() {
  const api = useWishlistApi()
  const { user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [cover, setCover] = useState<CoverKey>('birthday')
  const [eventDate, setEventDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !user || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const selected = covers.find((option) => option.key === cover)
      const list = await api.createList({
        title: title.trim(),
        occasion: selected?.label ?? 'Just because',
        eventDate: eventDate || undefined,
        note: note.trim() || undefined,
        cover,
        ownerId: user.id,
        ownerName: user.fullName ?? 'A friend',
      })
      router.push(`/list/${list.id}`)
    } catch {
      setError("Couldn't create the list. Try again in a moment.")
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <MobileScreen>
      <TopBar title="New list" backTo="/lists" />
      <form onSubmit={handleSubmit} className="space-y-5 px-5 pt-5">
        <div>
          <label htmlFor="list-title" className="mb-1.5 block text-xs font-semibold text-ink">
            List name
          </label>
          <input
            id="list-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="The Big 30"
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm text-ink focus:border-ink focus:outline-none"
            required
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-ink">Occasion</legend>
          <div className="grid grid-cols-3 gap-2">
            {covers.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setCover(option.key)}
                aria-pressed={cover === option.key}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[11px] font-semibold transition ${
                  cover === option.key
                    ? 'border-ink bg-paper text-ink'
                    : 'border-line bg-paper/50 text-muted'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${option.bg}`}>
                  {option.emoji}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="list-date" className="mb-1.5 block text-xs font-semibold text-ink">
            Date <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="list-date"
            type="date"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="list-note" className="mb-1.5 block text-xs font-semibold text-ink">
            A note for visitors <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="list-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="No pressure at all — just ideas!"
            className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3.5 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-xs font-medium text-accent">
            {error}
          </p>
        )}
        {/* Disabled until Clerk has loaded the user; a click before that used to do nothing. */}
        <button
          type="submit"
          disabled={submitting || !user}
          className="w-full rounded-full bg-accent py-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
        >
          {submitting ? 'Creating…' : 'Create list'}
        </button>
      </form>
      <BottomNav />
    </MobileScreen>
  )
}
