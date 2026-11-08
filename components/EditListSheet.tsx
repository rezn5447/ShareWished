'use client'
import { useState } from 'react'
import { Trash2Icon } from 'lucide-react'
import { Sheet } from './Sheet'
import { ListForm } from './ListForm'
import { ListDetailsInput } from '@/lib/wishlist-api'
import { Wishlist } from '@/types/wishlist'

interface EditListSheetProps {
  open: boolean
  onClose: () => void
  list: Wishlist
  onSave: (details: ListDetailsInput) => Promise<unknown>
  onDelete: () => Promise<unknown>
}

export function EditListSheet({ open, onClose, list, onSave, onDelete }: EditListSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit list">
      {/* Mounted per open, so the form and the delete confirmation start fresh. */}
      <ListForm
        surface="sheet"
        initial={list}
        submitLabel="Save changes"
        savingLabel="Saving…"
        errorMessage="Couldn't save that. Try again in a moment."
        onSave={async (details) => {
          await onSave(details)
          onClose()
        }}
      />
      <DeleteList list={list} onDelete={onDelete} />
    </Sheet>
  )
}

function DeleteList({ list, onDelete }: Pick<EditListSheetProps, 'list' | 'onDelete'>) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      await onDelete()
    } catch {
      setError("Couldn't delete the list. Try again in a moment.")
      setDeleting(false)
    }
  }
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-muted transition active:scale-[0.99]"
      >
        <Trash2Icon className="h-4 w-4" aria-hidden="true" />
        Delete list
      </button>
    )
  }
  return (
    <div className="mt-4 rounded-2xl border border-accent/30 bg-accent-soft/50 p-4">
      <p className="text-sm font-semibold text-ink">Delete &ldquo;{list.title}&rdquo;?</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Its items go with it, and the share link stops working. This can&apos;t be undone.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-accent">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="flex-1 rounded-full border border-line bg-paper py-2.5 text-xs font-semibold text-ink"
        >
          Keep it
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-1 rounded-full bg-accent py-2.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
      </div>
    </div>
  )
}
