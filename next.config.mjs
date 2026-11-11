/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Profile photos. Clerk re-hosts the Google (or other provider) photo here.
    remotePatterns: [{ protocol: 'https', hostname: 'img.clerk.com', pathname: '/**' }],
  },
}

export default nextConfig
