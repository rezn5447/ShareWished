'use client'
import React, { useState } from 'react'
import { covers } from '@/data/covers'
import { ListDetailsInput } from '@/lib/wishlist-api'
import { CoverKey } from '@/types/wishlist'

interface ListFormProps {
  /** Saved values when editing. */
  initial?: Partial<ListDetailsInput>
  submitLabel: string
  savingLabel: string
  /** Shown when onSave rejects. */
  errorMessage: string
  /** Resolves once saved. A rejection keeps the form open with errorMessage. */
  onSave: (details: ListDetailsInput) => Promise<unknown>
  disabled?: boolean
  /** Fields sit on the cream page or on a paper sheet; flip the fill so they stand out. */
  surface?: 'page' | 'sheet'
}

/** List name, occasion, date and note. Shared by the create page and the edit sheet. */
export function ListForm({
  initial,
  submitLabel,
  savingLabel,
  errorMessage,
  onSave,
  disabled = false,
  surface = 'page',
}: ListFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [cover, setCover] = useState<CoverKey>(initial?.cover ?? 'birthday')
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Spelled out in full so Tailwind can find the class names.
  const fill = surface === 'page' ? 'bg-paper' : 'bg-cream'
  const fillFaded = surface === 'page' ? 'bg-paper/50' : 'bg-cream/50'
  const fieldClass = `w-full rounded-2xl border border-line ${fill} px-4 py-3.5 text-sm text-ink focus:border-ink focus:outline-none`

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || disabled || saving) return
    setSaving(true)
    setError('')
    try {
      const selected = covers.find((option) => option.key === cover)
      await onSave({
        title: title.trim(),
        occasion: selected?.label ?? 'Just because',
        eventDate: eventDate || undefined,
        note: note.trim() || undefined,
        cover,
      })
    } catch {
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="list-title" className="mb-1.5 block text-xs font-semibold text-ink">
          List name
        </label>
        <input
          id="list-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="The Big 30"
          className={fieldClass}
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
                cover === option.key ? `border-ink ${fill} text-ink` : `border-line ${fillFaded} text-muted`
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
          className={fieldClass}
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
          className={`${fieldClass} resize-none`}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving || disabled}
        className="w-full rounded-full bg-accent py-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
      >
        {saving ? savingLabel : submitLabel}
      </button>
    </form>
  )
}
