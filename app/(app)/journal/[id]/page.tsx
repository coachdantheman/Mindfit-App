import { getVerifiedUser } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { JournalEntry } from '@/types'
import TodayEntry from '@/components/journal/TodayEntry'

export default async function EntryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await getVerifiedUser()
  if (!user) redirect('/login')

  // Service role with an explicit owner filter, same as the API routes.
  const { data: entry } = await createAdminClient()
    .from('journal_entries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!entry) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/progress" className="text-brand-500 text-sm hover:underline mb-2 inline-block">
          ← Back to Progress
        </Link>
        <h1 className="page-title">
          {format(parseISO((entry as JournalEntry).entry_date), 'EEEE, MMMM d, yyyy')}
        </h1>
      </div>
      <TodayEntry entry={entry as JournalEntry} />
    </div>
  )
}
