/** Supabase Storage bucket for photos owners upload (see the item_images migration). */
export const ITEM_IMAGE_BUCKET = 'item-images'

/** Items show their photo at 80px at most; 500px covers that on 3x screens with room to spare. */
export const ITEM_IMAGE_MAX_EDGE = 500

/**
 * Largest photo we'll try to read. Phone photos run 3-12MB; what gets stored
 * is the shrunk copy, which the bucket caps at 1MB.
 */
export const ITEM_IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024

const PUBLIC_PREFIX = `/storage/v1/object/public/${ITEM_IMAGE_BUCKET}/`

/**
 * The storage path of an uploaded item photo, or null for anything else
 * (a shop's photo, the placeholder). Only paths under `ownerId`'s folder count
 * when it's given, so we never try to delete someone else's file.
 */
export function uploadedImagePath(imageUrl: string, ownerId?: string): string | null {
  let url: URL
  try {
    url = new URL(imageUrl)
  } catch {
    return null
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (base && url.origin !== new URL(base).origin) return null
  if (!url.pathname.startsWith(PUBLIC_PREFIX)) return null
  const path = decodeURIComponent(url.pathname.slice(PUBLIC_PREFIX.length))
  if (ownerId && !path.startsWith(`${ownerId}/`)) return null
  return path
}

export class ItemImageError extends Error {}

/**
 * Shrinks a picked photo to fit ITEM_IMAGE_MAX_EDGE and re-encodes it as JPEG.
 * Always re-encodes, even small files: the bucket is public, and originals
 * carry metadata such as where the photo was taken.
 */
export async function shrinkItemImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new ItemImageError("That file isn't a photo.")
  if (file.size > ITEM_IMAGE_MAX_INPUT_BYTES) {
    throw new ItemImageError('That photo is too big. Pick one under 20MB.')
  }
  let bitmap: ImageBitmap
  try {
    // Turn the photo upright using its camera orientation before measuring it.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ItemImageError("Couldn't read that photo. Try a JPEG or PNG.")
  }
  const scale = Math.min(1, ITEM_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new ItemImageError("Couldn't read that photo. Try a JPEG or PNG.")
  // JPEG has no transparency; paint white so transparent PNGs don't turn black.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new ItemImageError("Couldn't read that photo. Try a JPEG or PNG.")
  return blob
}
