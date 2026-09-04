import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { JournalEntry } from '@/types'

export default function EntryList({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-fg-1 mb-4">Past Entries</h3>
      <div className="space-y-2">
        {entries.map(e => (
          <Link
            key={e.id}
            href={`/journal/${e.id}`}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-2 transition-colors group"
          >
            <div>
              <p className="text-sm font-medium text-fg-2 group-hover:text-cta transition-colors">
                {format(parseISO(e.entry_date), 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-xs text-fg-4 mt-0.5 truncate max-w-xs">{e.objective}</p>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-full">M:{e.rating_motivation}</span>
              <span className="text-xs text-purple-400 font-medium bg-purple-500/10 px-2 py-1 rounded-full">F:{e.rating_focus}</span>
              <span className="text-xs text-green-400 font-medium bg-green-500/10 px-2 py-1 rounded-full">C:{e.rating_confidence}</span>
              <span className="text-xs text-orange-400 font-medium bg-orange-500/10 px-2 py-1 rounded-full">A:{e.rating_anxiety}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
