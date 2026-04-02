import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'
import { JournalEntry } from '@/types'
import RatingChart from '@/components/dashboard/RatingChart'
import EntryList from '@/components/dashboard/EntryList'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const adminSupabase = createAdminClient()
  const { data: entries } = await adminSupabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('entry_date', { ascending: false })

  const allEntries = (entries ?? []) as JournalEntry[]

  const avgOf = (key: keyof JournalEntry) => {
    if (allEntries.length === 0) return '—'
    const sum = allEntries.reduce((acc, e) => acc + (e[key] as number), 0)
    return (sum / allEntries.length).toFixed(1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Progress</h1>
        <p className="text-gray-500 text-sm mt-1">{allEntries.length} journal {allEntries.length === 1 ? 'entry' : 'entries'} total</p>
      </div>

      {allEntries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No data yet</p>
          <p className="text-sm mt-1">Submit your first journal entry to start tracking your progress.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Avg Motivation', value: avgOf('rating_motivation'), color: 'text-blue-400 bg-blue-900/30 border border-blue-800/40' },
              { label: 'Avg Focus', value: avgOf('rating_focus'), color: 'text-purple-400 bg-purple-900/30 border border-purple-800/40' },
              { label: 'Avg Confidence', value: avgOf('rating_confidence'), color: 'text-green-400 bg-green-900/30 border border-green-800/40' },
              { label: 'Avg Anxiety', value: avgOf('rating_anxiety'), color: 'text-orange-400 bg-orange-900/30 border border-orange-800/40' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-2xl p-4 text-center ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          <RatingChart entries={allEntries} />
          <EntryList entries={allEntries} />
        </div>
      )}
    </div>
  )
}
