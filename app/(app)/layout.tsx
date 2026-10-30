import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'
import ServiceWorkerRegistrar from '@/components/shared/ServiceWorkerRegistrar'
import { ToastProvider } from '@/components/shared/Toast'
import TermsBanner from '@/components/shared/TermsBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role === 'member' && !user.onboardedAt) redirect('/onboarding')

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-cta focus:text-fg-inverse focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-semibold">
          Skip to content
        </a>
        <ServiceWorkerRegistrar />
        <Navbar email={user.email} role={user.role} fullName={user.fullName} />
        <TermsBanner />
        <main id="main" tabIndex={-1} className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
