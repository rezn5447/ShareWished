'use client'
import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { EyeOffIcon, GiftIcon, LinkIcon } from 'lucide-react'
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'
const points = [
  { Icon: LinkIcon, text: 'Save anything with a link — Amazon, Etsy, anywhere.' },
  { Icon: GiftIcon, text: 'Friends claim gifts so nobody buys the same thing twice.' },
  { Icon: EyeOffIcon, text: "You'll never see what's been bought. Surprises stay surprises." },
]
export default function SignIn() {
  return (
    <MobileScreen padBottom={false}>
      <div className="flex min-h-screen flex-col px-6 pb-10 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Wishlisted
          </span>
          <h1 className="mt-5 font-display text-[34px] font-semibold leading-[1.1] text-ink">
            Ask for what you
            <br />
            actually want.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Make a wishlist, share the link, and let everyone else quietly sort out who's buying
            what.
          </p>
        </motion.div>
        <ul className="mt-8 space-y-3">
          {points.map(({ Icon, text }, index) => (
            <motion.li
              key={text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
              className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3.5 shadow-card"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-[13px] leading-relaxed text-ink">{text}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-8 space-y-3">
          <Show when="signed-out">
            <SignUpButton mode="modal" forceRedirectUrl="/lists">
              <button
                type="button"
                className="w-full rounded-full bg-accent py-4 text-sm font-semibold text-white transition active:scale-[0.99]"
              >
                Create your wishlist
              </button>
            </SignUpButton>
            <SignInButton mode="modal" forceRedirectUrl="/lists">
              <button
                type="button"
                className="w-full rounded-full border border-line bg-paper py-4 text-sm font-semibold text-ink transition active:scale-[0.99]"
              >
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/lists"
              className="flex w-full items-center justify-center rounded-full bg-accent py-4 text-sm font-semibold text-white transition active:scale-[0.99]"
            >
              Go to your lists
            </Link>
          </Show>
        </div>
        <p className="mt-auto pt-8 text-center text-xs text-muted">
          Got a link from a friend?{' '}
          <Link href="/w/maya-30" className="font-semibold text-ink underline underline-offset-4">
            Open their list
          </Link>
        </p>
      </div>
    </MobileScreen>
  )
}
