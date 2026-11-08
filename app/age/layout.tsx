import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'

export default async function AgeLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.consentStatus === 'pending') redirect('/consent/waiting')
  if (user.role === 'member' && user.birthYear != null) redirect('/mindset')

  return (
    <div className="min-h-screen bg-page px-4 py-10 sm:py-16 pt-safe">
      <p className="text-center text-2xl font-bold tracking-widest uppercase text-cta mb-8">MindFit</p>
      {children}
    </div>
  )
}
