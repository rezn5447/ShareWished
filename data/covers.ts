import { CoverKey } from '@/types/wishlist'
export interface Cover {
  key: CoverKey
  label: string
  emoji: string
  /** Tailwind background class for the list cover block. */
  bg: string
}
export const covers: Cover[] = [
  { key: 'birthday', label: 'Birthday', emoji: '🎂', bg: 'bg-accent-soft' },
  { key: 'wedding', label: 'Wedding', emoji: '💍', bg: 'bg-[#EFE7F3]' },
  { key: 'home', label: 'Housewarming', emoji: '🏡', bg: 'bg-sage-soft' },
  { key: 'baby', label: 'Baby shower', emoji: '🍼', bg: 'bg-[#E4EDF5]' },
  { key: 'holiday', label: 'Holidays', emoji: '🎄', bg: 'bg-[#F6E9D2]' },
  { key: 'just-because', label: 'Just because', emoji: '✨', bg: 'bg-[#F0EBE4]' },
]
export function getCover(key: CoverKey): Cover {
  return covers.find((cover) => cover.key === key) ?? covers[covers.length - 1]
}
