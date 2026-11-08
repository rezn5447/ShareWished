import type { Metadata } from 'next'
import Link from 'next/link'
import { MobileScreen } from '@/components/MobileScreen'
import { TopBar } from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Terms · Gimme',
  description: 'The ground rules for using Gimme.',
}

// Public on purpose, like /privacy: Google's sign-in screen links here.
const sections = [
  {
    heading: 'Using Gimme',
    body: [
      'Gimme lets you make wishlists, share them by link, and lets friends mark gifts as bought. It is free to use.',
      'By creating an account or opening a shared list, you agree to these terms. If you don\'t agree, please don\'t use the app.',
    ],
  },
  {
    heading: 'Your account and lists',
    body: [
      "You're responsible for what you put on your lists and who you send your links to. Anyone with a link can open that list.",
      "Don't use Gimme for anything illegal, to harass people, or to post content you don't have the right to share.",
      'We may remove content or close accounts that break these rules.',
    ],
  },
  {
    heading: 'Shops and purchases',
    body: [
      "Items link to other shops. We don't sell anything, handle payments, or guarantee an item's price, stock or details. Buying happens on the shop's site, under its terms.",
      'Marking a gift as bought is an honor system between friends. We can\'t confirm anyone actually bought it.',
    ],
  },
  {
    heading: 'No guarantees',
    body: [
      'Gimme is provided as is. We work to keep it running and your lists safe, but we can\'t promise it will always be available or error free, and we aren\'t liable for losses from using it.',
      'We may change or stop the service, or update these terms. If we make a big change, we\'ll update this page.',
    ],
  },
]

export default function Terms() {
  return (
    <MobileScreen padBottom={false}>
      <TopBar title="Terms" backTo="" />
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
        <p className="pt-2 text-center text-xs text-muted">
          See also our{' '}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </main>
    </MobileScreen>
  )
}
