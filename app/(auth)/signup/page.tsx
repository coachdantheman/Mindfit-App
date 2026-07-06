import { redirect } from 'next/navigation'

// Signup is merged into the login page: whitelisted emails are
// auto-provisioned on their first magic-link sign-in.
export default function SignupPage() {
  redirect('/login')
}
