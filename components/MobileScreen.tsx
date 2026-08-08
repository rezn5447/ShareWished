import React from 'react'
interface MobileScreenProps {
  children: React.ReactNode
  /** Adds bottom padding so content clears the fixed nav / action bar. */
  padBottom?: boolean
}
export function MobileScreen({ children, padBottom = true }: MobileScreenProps) {
  return (
    <div className="flex min-h-full w-full justify-center bg-[#F1E9DE]">
      <div className="relative w-full max-w-md bg-cream shadow-[0_0_60px_-24px_rgba(27,23,20,0.35)]">
        <div className={padBottom ? 'pb-28' : ''}>{children}</div>
      </div>
    </div>
  )
}
