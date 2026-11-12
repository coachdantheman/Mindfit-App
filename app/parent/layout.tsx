import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import { ToastProvider } from '@/components/shared/Toast'

// Parents, admins, and any account an athlete has shared progress with.
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role !== 'parent' && user.role !== 'admin') {
    const admin = createAdminClient()
    const [{ count }, { count: invites }] = await Promise.all([
      admin.from('parent_athletes').select('id', { count: 'exact', head: true }).eq('parent_id', user.userId),
      admin.from('parent_link_requests').select('id', { count: 'exact', head: true }).eq('parent_id', user.userId),
    ])
    if (!count && !invites) redirect('/')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar email={user.email} role={user.role} fullName={user.fullName} />
        <main id="main" tabIndex={-1} className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
