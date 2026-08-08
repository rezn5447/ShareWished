/**
 * Superseded by Clerk's `clerkMiddleware()` in proxy.ts, which now protects
 * /lists, /create, /list, and /profile at the routing layer before a
 * signed-out request ever reaches a page component. Left unused rather than
 * deleted — see proxy.ts for the current route-protection logic.
 */
export {}
