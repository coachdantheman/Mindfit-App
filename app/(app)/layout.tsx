import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase-server'
import { GUIDE_DAY_COOKIE } from '@/lib/guide'
import { getAuthUserCached } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import ServiceWorkerRegistrar from '@/components/shared/ServiceWorkerRegistrar'
import { ToastProvider } from '@/components/shared/Toast'
import TermsBanner from '@/components/shared/TermsBanner'
import CoachRequestsBanner from '@/components/shared/CoachRequestsBanner'
import ParentRequestsBanner from '@/components/shared/ParentRequestsBanner'
import PendingTeamJoin from '@/components/shared/PendingTeamJoin'
import TimezoneSync from '@/components/shared/TimezoneSync'
import BackToGameDay from '@/components/shared/BackToGameDay'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role === 'member' && user.birthYear == null) redirect('/age')
  if (user.role === 'member' && user.consentStatus === 'pending') redirect('/consent/waiting')
  if (user.role === 'member' && !user.onboardedAt) redirect('/onboarding')
  // First open of the day goes to the Daily Guide unless the athlete turned it off.
  if (user.role === 'member' && !(await cookies()).get(GUIDE_DAY_COOKIE)) {
    const { data, error } = await createAdminClient().from('profiles').select('daily_guidance').eq('id', user.userId).maybeSingle()
    if (!error && data && data.daily_guidance !== false) redirect('/guide')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-cta focus:text-fg-inverse focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold">
          Skip to content
        </a>
        <ServiceWorkerRegistrar />
        <PendingTeamJoin />
        <Navbar email={user.email} role={user.role} fullName={user.fullName} />
        <TermsBanner />
        <CoachRequestsBanner />
        <ParentRequestsBanner />
        <TimezoneSync />
        <main id="main" tabIndex={-1} className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
          <BackToGameDay />
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
