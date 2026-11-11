import type { Metadata } from 'next'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Privacy · Gimme',
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
      "We don't sell your information, show ads, or share it with anyone beyond those services and the friends you send a link to.",
      'A friend\'s browser remembers the name they used and a private undo code for each gift they claimed. That stays on their device.',
      'When you paste a shop link, our server opens that page to read the product name, price and picture. Only the link is sent.',
    ],
  },
  {
    heading: 'Signing in with Google',
    body: [
      'If you continue with Google, Google shares your name, email address and profile picture with us. We use them only to create your account, sign you in and show your name on lists you share.',
      "We don't ask for access to your contacts, Gmail, Drive or anything else in your Google account, and we don't use Google data for ads.",
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
      {/* Back goes wherever the reader came from: Profile, the home page, or Google's sign-in screen. */}
      <TopBar title="Privacy" backTo="" />
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
