'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GiftIcon, PlusIcon, UserIcon } from 'lucide-react'
const links = [
  { href: '/lists', label: 'Lists', Icon: GiftIcon },
  { href: '/create', label: 'New list', Icon: PlusIcon },
  { href: '/profile', label: 'You', Icon: UserIcon },
]
export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 z-40 w-full max-w-md border-t border-line bg-paper/95 backdrop-blur"
    >
      <ul className="flex items-stretch">
        {links.map(({ href, label, Icon }) => {
          const isActive = pathname === href
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition ${
                  isActive ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.4 : 1.8}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
