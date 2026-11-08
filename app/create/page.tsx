'use client'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'
import { BottomNav } from '@/components/BottomNav'
import { ListForm } from '@/components/ListForm'
import { useWishlistApi } from '@/lib/wishlist-api'

export default function CreateList() {
  const api = useWishlistApi()
  const { user } = useUser()
  const router = useRouter()
  return (
    <MobileScreen>
      <TopBar title="New list" backTo="/lists" />
      <div className="px-5 pt-5">
        <ListForm
          submitLabel="Create list"
          savingLabel="Creating…"
          errorMessage="Couldn't create the list. Try again in a moment."
          // Disabled until Clerk has loaded the user; a click before that used to do nothing.
          disabled={!user}
          onSave={async (details) => {
            if (!user) return
            const list = await api.createList({
              ...details,
              ownerId: user.id,
              ownerName: user.fullName ?? 'A friend',
            })
            router.push(`/list/${list.id}`)
          }}
        />
      </div>
      <BottomNav />
    </MobileScreen>
  )
}
