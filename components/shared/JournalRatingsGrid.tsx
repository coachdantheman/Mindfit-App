import { JournalEntry } from '@/types'
import { avgOfJournal } from '@/lib/stats'

export default function JournalRatingsGrid({ entries }: { entries: JournalEntry[] }) {
  const stats = [
    { label: 'Avg Motivation', value: avgOfJournal(entries, 'rating_motivation'), color: 'text-blue-400 bg-blue-500/10 border border-blue-500/20' },
    { label: 'Avg Focus', value: avgOfJournal(entries, 'rating_focus'), color: 'text-purple-400 bg-purple-500/10 border border-purple-500/20' },
    { label: 'Avg Confidence', value: avgOfJournal(entries, 'rating_confidence'), color: 'text-green-400 bg-green-500/10 border border-green-500/20' },
    { label: 'Avg Anxiety', value: avgOfJournal(entries, 'rating_anxiety'), color: 'text-orange-400 bg-orange-500/10 border border-orange-500/20' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(stat => (
        <div key={stat.label} className={`rounded-2xl p-4 text-center ${stat.color}`}>
          <p className="text-2xl font-bold">{stat.value}</p>
          <p className="text-xs mt-1 font-medium">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
