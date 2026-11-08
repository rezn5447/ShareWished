import type { Metadata } from 'next'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Privacy · Wishlisted',
  description: 'How surprise mode works, and who can open your lists.',
}

// Public on purpose: friends who got a share link may want to read it too.
// Keep every claim here true to how the app works (see CLAUDE.md, "Surprise mode").
const sections = [
  {
    heading: 'Surprise mode is always on',
    body: [
      "When a friend marks a gift as bought, we save it with the name they type. Other friends see it, so nobody doubles up.",
      "You never do. Your list, and your own share link while you're signed in, always look unclaimed. This is enforced in our database, not just hidden on screen.",
      "One catch: if you open your own link while signed out, in a private window for example, you'll see it the way friends do. Claims included.",
    ],
  },
  {
    heading: 'Who can open your lists',
    body: [
      'Anyone with the share link. Friends don\'t need an account to view it or mark a gift as bought.',
      "Links end in a random code, and lists aren't listed or searchable anywhere, so nobody stumbles onto one. Share the link only with people you'd show the list to.",
      'Visitors see your name, the list, its date and note, and every item with its link, price and note.',
    ],
  },
  {
    heading: 'What we keep',
    body: [
      'Your account (name and email) is handled by Clerk, our sign-in provider. Your lists and items are stored with Supabase.',
      'A friend\'s browser remembers the name they used and a private undo code for each gift they claimed. That stays on their device.',
      'When you paste a shop link, our server opens that page to read the product name, price and picture. Only the link is sent.',
    ],
  },
  {
    heading: 'Deleting',
    body: [
      'Removing an item, or deleting a list, removes it right away, along with any claims on it. A deleted list\'s link stops working.',
    ],
  },
]

export default function Privacy() {
  return (
    <MobileScreen padBottom={false}>
      <TopBar title="Privacy" backTo="/profile" />
      <main className="space-y-3 px-5 pb-10 pt-4">
        {sections.map(({ heading, body }) => (
          <section key={heading} className="rounded-xl2 border border-line bg-paper p-4">
            <h2 className="font-display text-base font-semibold text-ink">{heading}</h2>
            {body.map((paragraph) => (
              <p key={paragraph} className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </MobileScreen>
  )
}
