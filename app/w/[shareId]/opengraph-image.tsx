import { ImageResponse } from 'next/og'
import { fetchSharedListPreview } from '@/lib/shared-list-preview'
import { getCover } from '@/data/covers'
import { formatEventDate } from '@/utils/format'

export const alt = 'A wishlist on Gimme'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#1B1714'
const CREAM = '#FBF6EF'

export default async function Image({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params
  const preview = await fetchSharedListPreview(shareId)
  const cover = getCover(preview?.cover ?? 'just-because')
  const date = preview ? formatEventDate(preview.eventDate ?? undefined) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: cover.tint,
          color: INK,
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 6, opacity: 0.5 }}>
          GIMME
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 96 }}>{cover.emoji}</div>
          <div style={{ marginTop: 16, fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            {preview ? `${preview.ownerFirstName}'s ${preview.title}` : 'A wishlist'}
          </div>
          {preview && (
            <div style={{ marginTop: 16, fontSize: 32, opacity: 0.65 }}>
              {[preview.occasion, date].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 30, opacity: 0.7 }}>Claim a gift. It stays a surprise.</div>
          {preview && preview.itemCount > 0 && (
            <div
              style={{
                display: 'flex',
                padding: '14px 28px',
                borderRadius: 999,
                background: INK,
                color: CREAM,
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              {preview.itemCount} {preview.itemCount === 1 ? 'gift' : 'gifts'}
            </div>
          )}
        </div>
      </div>
    ),
    size,
  )
}
