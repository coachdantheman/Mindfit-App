import { SleepEntry } from '@/types'

export default function SleepEntriesList({ entries, avgSleep, avgSleepQuality }: {
  entries: SleepEntry[]
  avgSleep: string
  avgSleepQuality: string
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-fg-3">
        <p className="font-medium">No sleep data yet</p>
        <p className="text-sm mt-1">Log your sleep to see trends.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className={`text-2xl font-bold ${avgSleep !== '—' && parseFloat(avgSleep) >= 7 ? 'text-green-400' : 'text-orange-400'}`}>{avgSleep}h</p>
          <p className="text-xs text-fg-4 mt-1">Avg Hours</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{avgSleepQuality}/10</p>
          <p className="text-xs text-fg-4 mt-1">Avg Quality</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-fg-1 mb-3 text-sm">Recent Nights</h3>
        <div className="space-y-2">
          {entries.slice(0, 14).map(entry => (
            <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-2/30">
              <div>
                <p className="text-sm text-fg-2">{entry.entry_date}</p>
                <p className="text-xs text-fg-4">
                  {entry.hours_slept ? `${Number(entry.hours_slept).toFixed(1)}h` : '—'}
                  {entry.sleep_quality ? ` · Quality: ${entry.sleep_quality}/10` : ''}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                Number(entry.hours_slept) >= 7 ? 'bg-green-500' : Number(entry.hours_slept) > 0 ? 'bg-orange-500' : 'bg-surface-3'
              }`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
