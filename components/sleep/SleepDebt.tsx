import { format, parseISO } from 'date-fns'

const TARGET = 8
const MAX = 12

export interface Night { date: string; hours: number | null }

export default function SleepDebt({ nights }: { nights: Night[] }) {
  const debt = nights.reduce((sum, n) => sum + Math.max(0, TARGET - (n.hours ?? TARGET)), 0)
  const short = Math.round(debt * 10) / 10

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-fg-1 mb-1">Sleep debt</h3>
      <p className="text-sm text-fg-4 mb-5">Target: {TARGET} hours</p>

      <div className="relative h-28">
        <div className="absolute inset-x-0 border-t border-dashed border-fg-4/60" style={{ bottom: `${(TARGET / MAX) * 100}%` }} aria-hidden="true" />
        <div className="absolute inset-0 flex items-end gap-1.5">
          {nights.map(n => {
            const logged = n.hours != null
            const hours = n.hours ?? TARGET
            return (
              <div key={n.date} className="flex-1 h-full flex items-end" title={logged ? `${format(parseISO(n.date), 'MMM d')}: ${n.hours}h` : `${format(parseISO(n.date), 'MMM d')}: Not logged — counted as ${TARGET}h`}>
                <div
                  className={`w-2 mx-auto rounded-t-sm ${hours >= TARGET ? 'bg-cta' : 'bg-fg-4/60'} ${logged ? '' : 'opacity-30'}`}
                  style={{ height: `${(Math.min(hours, MAX) / MAX) * 100}%` }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {nights.map(n => (
          <div key={n.date} className="flex-1 text-center text-[10px] text-fg-4 tabular-nums">{format(parseISO(n.date), 'd')}</div>
        ))}
      </div>

      <p className="mt-5 text-sm text-fg-2">
        {short > 0 ? `You're ${short} hours short over the last 2 weeks.` : 'No sleep debt. Keep it up.'}
      </p>
    </div>
  )
}
