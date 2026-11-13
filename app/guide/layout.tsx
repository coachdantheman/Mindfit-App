import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'
import { ToastProvider } from '@/components/shared/Toast'

export default async function GuideLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role !== 'member') redirect('/mindset')
  if (user.birthYear == null) redirect('/age')
  if (user.consentStatus === 'pending') redirect('/consent/waiting')
  if (!user.onboardedAt) redirect('/onboarding')

  return <ToastProvider>{children}</ToastProvider>
}
