import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/')

  const adminSupabase = createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar email={session.user.email ?? ''} isAdmin={isAdmin} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
