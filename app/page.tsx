import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { format } from 'date-fns'
import JournalForm from '@/components/journal/JournalForm'
import TodayEntry from '@/components/journal/TodayEntry'
import PublicNav from '@/components/layout/PublicNav'
import { JournalEntry } from '@/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  let todayEntry = null
  let isAdmin = false

  if (session) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('entry_date', today)
      .single()
    todayEntry = data

    const adminSupabase = createAdminClient()
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="min-h-screen flex flex-col bg-mindfit-bg">
      <PublicNav
        email={session?.user.email ?? null}
        isAdmin={isAdmin}
      />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100">Today&apos;s Journal</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {session ? (
          todayEntry ? (
            <TodayEntry entry={todayEntry as JournalEntry} />
          ) : (
            <JournalForm />
          )
        ) : (
          <JournalFormGuest />
        )}
      </main>
    </div>
  )
}

function JournalFormGuest() {
  return (
    <div className="space-y-4">
      <div className="bg-brand-600/10 border border-brand-600/30 rounded-2xl p-5 text-center">
        <p className="text-cta font-medium">Sign in to save your journal and track your progress</p>
        <a
          href="/login"
          className="inline-block mt-3 bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
        >
          Sign in to get started
        </a>
      </div>
      <JournalForm previewMode />
    </div>
  )
}
