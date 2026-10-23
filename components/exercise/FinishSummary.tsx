'use client'
import type { DetectedPr } from '@/lib/strength'

export interface FinishResult {
  name: string
  doneSets: number
  volume: number
  durationMin: number | null
  exercises: number
  prs: DetectedPr[]
}

export default function FinishSummary({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  return (
    <div className="card p-5 space-y-4 border-cta/40">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-cta font-semibold">Workout saved</p>
        <h3 className="font-bold text-fg-1 text-lg mt-0.5">{result.name}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sets" value={String(result.doneSets)} />
        <Stat label="Volume" value={result.volume > 0 ? `${result.volume.toLocaleString()} lb` : '—'} />
        <Stat label="Time" value={result.durationMin ? `${result.durationMin} min` : '—'} />
      </div>
      {result.prs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-fg-2 mb-1.5">New personal records</p>
          <div className="flex flex-wrap gap-1.5">
            {result.prs.map(pr => (
              <span key={pr.exercise_id ?? pr.exercise_name} className="inline-flex items-center gap-1 bg-cta/15 text-cta border border-cta/30 rounded-full px-2.5 py-1 text-xs font-semibold">
                🏆 {pr.exercise_name} · {pr.e1rm} lb
                {pr.previous ? <span className="text-fg-4 font-normal">(was {pr.previous})</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={onClose} className="btn-primary w-full">Done</button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2/60 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-fg-1 tabular-nums">{value}</p>
      <p className="text-[11px] text-fg-4">{label}</p>
    </div>
  )
}
