import type { Metadata } from 'next'
import { fetchSharedListPreview } from '@/lib/shared-list-preview'
import { SharedListView } from './SharedListView'

type Props = { params: Promise<{ shareId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params
  const preview = await fetchSharedListPreview(shareId)
  // Share ids are unguessable on purpose; keep lists out of search results.
  const robots = { index: false, follow: false }
  if (!preview) return { title: 'Gimme', robots }

  const title = `${preview.ownerFirstName}'s ${preview.title}`
  const items = `${preview.itemCount} ${preview.itemCount === 1 ? 'gift' : 'gifts'}`
  const description =
    preview.itemCount === 0
      ? `${preview.occasion} · Nothing on the list yet. Check back soon.`
      : `${preview.occasion} · ${items} on the list. Claim one — ${preview.ownerFirstName} won't see what you pick.`
  return {
    title: `${title} · Gimme`,
    description,
    robots,
    openGraph: { title, description, siteName: 'Gimme', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function SharedListPage() {
  return <SharedListView />
}
