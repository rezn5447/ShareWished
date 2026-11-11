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
          // Email sign-ups have no name, and friends would see the list as "A's …".
          askOwnerName={Boolean(user) && !user?.fullName?.trim()}
          onSave={async (details, typedName) => {
            if (!user) return
            const ownerName = user.fullName?.trim() || typedName || 'A friend'
            if (typedName) {
              // Remember it for next time and for the greeting. Best effort: Clerk
              // refuses this if names are turned off for the instance.
              const [firstName, ...rest] = typedName.split(/\s+/)
              await user.update({ firstName, lastName: rest.join(' ') || undefined }).catch(() => {})
            }
            const list = await api.createList({ ...details, ownerId: user.id, ownerName })
            router.push(`/list/${list.id}`)
          }}
        />
      </div>
      <BottomNav />
    </MobileScreen>
  )
}
