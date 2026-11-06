'use client'
import type { DetectedPr, SessionTier } from '@/lib/strength'
import { TrophyIcon } from '@/components/shared/icons'
import { TierBadge, TierBar, TIER_LABEL } from './TierResult'

export interface FinishResult {
  name: string
  doneSets: number
  volume: number
  durationMin: number | null
  exercises: number
  prs: DetectedPr[]
  tiers: SessionTier[]
  needsProfile: boolean
}

export default function FinishSummary({ result, onClose, onAddBodyweight }: { result: FinishResult; onClose: () => void; onAddBodyweight: () => void }) {
  return (
    <div className="card p-5 space-y-4 border-cta/40">
      <div>
        <p className="text-xs uppercase tracking-wider text-cta font-semibold">Workout saved</p>
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
                <TrophyIcon className="w-3.5 h-3.5" /> {pr.exercise_name} · {pr.e1rm} lb
                {pr.previous ? <span className="text-fg-4 font-normal">(was {pr.previous})</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
      {result.tiers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg-2">Strength rank</p>
          {result.tiers.map(t => {
            const unit = t.evaluation.unit === 'lb' ? 'lb' : t.evaluation.unit === 'in' ? 'in' : 'reps'
            return (
              <div key={t.exercise_id ?? t.exercise_name} className={`rounded-xl p-3 space-y-2 ${t.tierUp ? 'bg-cta/15 border border-cta/40' : 'bg-surface-2/60'}`}>
                {t.tierUp && (
                  <p className="text-xs uppercase tracking-wider text-cta font-bold">
                    Tier up! {TIER_LABEL[t.previousTier!]} → {TIER_LABEL[t.evaluation.tier]}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg-1 truncate">{t.exercise_name}</p>
                    <p className="text-xs text-fg-4 tabular-nums">
                      {t.evaluation.e1rm} {unit}{t.evaluation.unit === 'lb' ? ' est. 1RM' : ''}
                      {t.evaluation.nextTier ? ` · ${TIER_LABEL[t.evaluation.nextTier.tier]} at ${t.evaluation.nextTier.value}` : ''}
                    </p>
                  </div>
                  <TierBadge tier={t.evaluation.tier} size="sm" />
                </div>
                <TierBar tier={t.evaluation.tier} />
              </div>
            )
          })}
        </div>
      )}
      {result.needsProfile && (
        <button type="button" onClick={onAddBodyweight} className="w-full text-left text-sm text-cta font-medium min-h-[44px]">
          Add bodyweight to see your rank →
        </button>
      )}
      <button type="button" onClick={onClose} className="btn-primary w-full">Done</button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2/60 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-fg-1 tabular-nums">{value}</p>
      <p className="text-xs text-fg-4">{label}</p>
    </div>
  )
}
