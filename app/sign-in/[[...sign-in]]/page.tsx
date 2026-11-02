import { SignIn } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'

// Hosted in-app because Clerk's Account Portal (accounts.<host>) can't be
// served on a *.vercel.app domain; this page runs through the /__clerk proxy.
export default function SignInPage() {
  return (
    <MobileScreen padBottom={false}>
      <div className="flex min-h-screen items-start justify-center px-4 pt-14">
        <SignIn />
      </div>
    </MobileScreen>
  )
}
