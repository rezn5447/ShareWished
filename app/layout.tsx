import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'

export const metadata: Metadata = {
  // Unset falls back to the Vercel deployment URL, which is fine for previews.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: 'Wishlisted',
  description: 'Ask for what you actually want.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
