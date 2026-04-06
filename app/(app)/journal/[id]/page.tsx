import { createServerSupabaseClient } from '@/lib/supabase-client'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import { JournalEntry } from '@/types'
import TodayEntry from '@/components/journal/TodayEntry'

export default async function EntryPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: entry } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!entry) notFound()

  return (
    <div>
      <div className="mb-6">
        <Link href="/progress" className="text-brand-500 text-sm hover:underline mb-2 inline-block">
          ← Back to Progress
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">
          {format(parseISO((entry as JournalEntry).entry_date), 'EEEE, MMMM d, yyyy')}
        </h1>
      </div>
      <TodayEntry entry={entry as JournalEntry} />
    </div>
  )
}
