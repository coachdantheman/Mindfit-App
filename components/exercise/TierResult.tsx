'use client'
import { useState } from 'react'
import type { LiftEvaluation } from '@/lib/strength'
import type { StrengthTier } from '@/types/exercise'
import { TIER_NAMES } from '@/lib/data/strength-standards'

export const TIER_LABEL: Record<StrengthTier, string> = {
  untrained: 'Untrained',
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
}

const TIER_STYLE: Record<StrengthTier, string> = {
  untrained: 'bg-surface-3 text-fg-3 border-edge',
  beginner: 'bg-cta/10 text-cta border-cta/20',
  novice: 'bg-cta/20 text-cta border-cta/30',
  intermediate: 'bg-cta/35 text-fg-1 border-cta/40',
  advanced: 'bg-cta/60 text-fg-inverse border-cta/60',
  elite: 'bg-cta text-fg-inverse border-cta',
}

export function TierBadge({ tier, size = 'md' }: { tier: StrengthTier; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm'} ${TIER_STYLE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  )
}

export function TierBar({ tier }: { tier: StrengthTier }) {
  const idx = TIER_NAMES.indexOf(tier as typeof TIER_NAMES[number])
  return (
    <div className="flex gap-1" aria-hidden>
      {TIER_NAMES.map((t, i) => (
        <div key={t} className={`h-2 flex-1 rounded-full ${i <= idx ? 'bg-cta' : 'bg-surface-3'}`} />
      ))}
    </div>
  )
}

interface Props {
  result: LiftEvaluation
  label: string
  onViewProgress?: () => void
}

export default function TierResult({ result, label, onViewProgress }: Props) {
  const [why, setWhy] = useState(false)
  const unit = result.unit === 'lb' ? 'lb' : result.unit === 'in' ? 'in' : 'reps'
  const valueLabel = result.unit === 'lb' ? 'Est. 1RM' : result.unit === 'in' ? 'Jump' : 'Reps'

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-fg-4">{label}</p>
          <p className="text-2xl font-bold text-fg-1 tabular-nums">
            {result.e1rm} <span className="text-sm font-medium text-fg-4">{unit}</span>
          </p>
          <p className="text-[11px] text-fg-4">{valueLabel}{result.ratio ? ` · ${result.ratio}× bodyweight` : ''}</p>
        </div>
        <TierBadge tier={result.tier} />
      </div>

      <TierBar tier={result.tier} />
      <div className="flex justify-between text-[10px] text-fg-4 uppercase tracking-wider">
        <span>Beginner</span><span>Elite</span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-fg-1">
          Stronger than <span className="font-bold text-cta">{result.liftersPct}%</span> of lifters at your bodyweight
          <span className="text-fg-4"> (approx.)</span>
        </p>
        <p className="text-xs text-fg-4">
          ≈ {result.generalPct}% of the general population <span className="italic">(est.)</span>
          <button type="button" onClick={() => setWhy(w => !w)} aria-label="How this is estimated" className="ml-1 inline-flex w-5 h-5 items-center justify-center rounded-full border border-edge text-[10px] text-fg-3">i</button>
        </p>
        {why && (
          <ul className="text-[11px] text-fg-4 list-disc pl-4 space-y-0.5 pt-1">
            {result.assumptions.map(a => <li key={a}>{a}</li>)}
          </ul>
        )}
        {!result.reliable && (
          <p className="text-xs text-amber-400">High-rep sets make the 1RM estimate rough — test a set of 1–5 reps for a better read.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {result.nextTier ? (
          <p className="text-xs text-fg-3">
            Next: <span className="font-semibold text-fg-1">{TIER_LABEL[result.nextTier.tier]}</span> at {result.nextTier.value} {unit}
          </p>
        ) : <p className="text-xs text-fg-3">Top tier — keep building.</p>}
        {onViewProgress && (
          <button type="button" onClick={onViewProgress} className="text-xs text-cta font-medium min-h-[44px]">View progress →</button>
        )}
      </div>
    </div>
  )
}
