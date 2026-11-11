import { redirect } from 'next/navigation'

// Athletes sign up through the /start onboarding flow.
export default function SignupPage() {
  redirect('/start')
}
