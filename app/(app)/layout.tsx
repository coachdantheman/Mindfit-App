import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import PublicNav from '@/components/layout/PublicNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav email={session.user.email ?? ''} isAdmin={isAdmin} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
