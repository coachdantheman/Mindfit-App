export default function OverviewCards({ journalCount, workoutCount, avgSleep, goalCount }: {
  journalCount: number
  workoutCount: number
  avgSleep: string
  goalCount: { total: number; completed: number }
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
        <p className="text-2xl font-bold text-cta">{journalCount}</p>
        <p className="text-xs text-gray-500 mt-1">Journal Entries</p>
      </div>
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
        <p className="text-2xl font-bold text-purple-400">{workoutCount}</p>
        <p className="text-xs text-gray-500 mt-1">Workouts Logged</p>
      </div>
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
        <p className={`text-2xl font-bold ${avgSleep !== '—' && parseFloat(avgSleep) >= 7 ? 'text-green-400' : 'text-orange-400'}`}>{avgSleep}h</p>
        <p className="text-xs text-gray-500 mt-1">Avg Sleep</p>
      </div>
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-4 text-center">
        <p className="text-2xl font-bold text-blue-400">{goalCount.completed}/{goalCount.total}</p>
        <p className="text-xs text-gray-500 mt-1">Goals Complete</p>
      </div>
    </div>
  )
}
