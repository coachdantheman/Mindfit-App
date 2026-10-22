'use client'
import { localDateISO, shiftDate } from '@/lib/nutrition'

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function DateStrip({ date, onChange }: { date: string; onChange: (iso: string) => void }) {
  const today = localDateISO(new Date())
  // Window of 7 days ending today, unless the selected date is earlier.
  const end = date > today ? date : today
  const days = Array.from({ length: 7 }, (_, i) => shiftDate(end, i - 6))
  if (!days.includes(date)) days.splice(0, 7, ...Array.from({ length: 7 }, (_, i) => shiftDate(date, i - 3)))

  const label = date === today ? 'Today' : date === shiftDate(today, -1) ? 'Yesterday' : date

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(shiftDate(date, -1))} className="btn-ghost px-2" aria-label="Previous day">←</button>
      <div className="flex-1 grid grid-cols-7 gap-1">
        {days.map(d => {
          const [, , dd] = d.split('-')
          const dow = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(dd)).getDay()
          const active = d === date
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`flex flex-col items-center py-1.5 rounded-xl text-xs transition-colors ${
                active ? 'bg-cta/20 text-cta border border-cta/30' : 'text-fg-4 hover:text-fg-2 border border-transparent'
              }`}
            >
              <span className="text-[10px]">{DAY[dow]}</span>
              <span className="font-semibold tabular-nums">{Number(dd)}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftDate(date, 1))}
        disabled={date >= today}
        className="btn-ghost px-2"
        aria-label="Next day"
      >→</button>
      <span className="sr-only">{label}</span>
    </div>
  )
}
