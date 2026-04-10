import { WorkoutLog } from '@/types'

export default function WorkoutLogList({ logs }: { logs: WorkoutLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="font-medium">No workouts logged yet</p>
        <p className="text-sm mt-1">Complete a workout to see your history.</p>
      </div>
    )
  }

  const categoryCounts = logs.reduce((acc, log) => {
    acc[log.category_name] = (acc[log.category_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {Object.entries(categoryCounts).map(([cat, count]) => (
          <div key={cat} className="bg-gray-900 rounded-xl border border-white/10 p-3 text-center">
            <p className="text-lg font-bold text-purple-400">{count}</p>
            <p className="text-xs text-gray-500">{cat}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
        <h3 className="font-semibold text-gray-100 mb-3 text-sm">Recent Workouts</h3>
        <div className="space-y-2">
          {logs.slice(0, 20).map(log => (
            <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30">
              <div>
                <p className="text-sm text-gray-200">{log.workout_name}</p>
                <p className="text-xs text-gray-500">{log.category_name}{log.duration_min ? ` · ${log.duration_min} min` : ''}</p>
              </div>
              <span className="text-xs text-gray-500">{log.log_date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
