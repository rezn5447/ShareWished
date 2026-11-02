import { SignUp } from '@clerk/nextjs'
import { MobileScreen } from '@/components/MobileScreen'

// See app/sign-in — same reason for hosting in-app.
export default function SignUpPage() {
  return (
    <MobileScreen padBottom={false}>
      <div className="flex min-h-screen items-start justify-center px-4 pt-14">
        <SignUp />
      </div>
    </MobileScreen>
  )
}
