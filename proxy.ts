import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/lists(.*)',
  '/create(.*)',
  '/list(.*)',
  '/profile(.*)',
  // Fetches arbitrary URLs server-side, so keep it to signed-in owners.
  '/api/link-preview(.*)',
])

export default clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect()
    }
  },
  // In-app pages, not the Account Portal — accounts.<host> doesn't work on *.vercel.app.
  { signInUrl: '/sign-in', signUpUrl: '/sign-up' },
)

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
