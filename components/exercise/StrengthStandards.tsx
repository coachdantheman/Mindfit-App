'use client'
import { useMemo, useState } from 'react'
import LiftingProfileCard from './LiftingProfileCard'
import TierResult, { TIER_LABEL } from './TierResult'
import LiftProgress from './LiftProgress'
import { evaluateLift, isBodyweightKey, thresholdsFor } from '@/lib/strength'
import { STANDARD_LABELS, STANDARD_UNITS, TIER_NAMES } from '@/lib/data/strength-standards'
import type { AthleteProfile, ExerciseLibraryRow, StandardKey } from '@/types/exercise'

interface Props {
  profile: AthleteProfile | null
  suggestedBodyweight: number | null
  library: ExerciseLibraryRow[]
  onProfileSaved: (p: AthleteProfile) => void
  notify: (msg: string, kind?: 'success' | 'error') => void
}

const LIFT_ORDER: StandardKey[] = [
  'bench', 'squat', 'deadlift', 'ohp', 'power_clean', 'front_squat', 'hip_thrust', 'row',
  'pullup', 'pushup', 'vertical_jump', 'broad_jump',
]

export default function StrengthStandards({ profile, suggestedBodyweight, library, onProfileSaved, notify }: Props) {
  const [key, setKey] = useState<StandardKey>('bench')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('1')
  const [value, setValue] = useState('')
  const [table, setTable] = useState(false)
  const [progress, setProgress] = useState(false)

  const bodyweightTest = isBodyweightKey(key)
  const unit = STANDARD_UNITS[key]

  const result = useMemo(() => {
    if (!profile) return null
    const base = { key, sex: profile.sex, bodyweight_lb: Number(profile.bodyweight_lb), age: profile.age }
    if (bodyweightTest) {
      const v = parseFloat(value)
      if (!(v >= 0) || value === '') return null
      return evaluateLift({ ...base, value: v })
    }
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (!(w > 0) || !(r >= 1)) return null
    return evaluateLift({ ...base, weight: w, reps: r })
  }, [profile, key, weight, reps, value, bodyweightTest])

  const thresholds = profile ? thresholdsFor(key, profile.sex, Number(profile.bodyweight_lb), profile.age) : null
  const libRow = library.find(e => e.standard_key === key) ?? null

  return (
    <div className="space-y-4">
      <LiftingProfileCard profile={profile} suggestedBodyweight={suggestedBodyweight} onSaved={onProfileSaved} notify={notify} />

      {profile && (
        <>
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-fg-1">Check a lift</h3>
              <p className="text-xs text-fg-4 mt-0.5">Enter your best recent set. Tiers and percentiles are approximations for your sex and bodyweight.</p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
              {LIFT_ORDER.map(k => (
                <button key={k} type="button" onClick={() => setKey(k)} className={`shrink-0 ${key === k ? 'tab-btn-active' : 'tab-btn'}`}>
                  {STANDARD_LABELS[k]}
                </button>
              ))}
            </div>
            {bodyweightTest ? (
              <div>
                <label className="text-xs text-fg-4 block mb-1.5" htmlFor="lift-value">
                  {unit === 'reps' ? 'Max reps in one set' : 'Best jump (inches)'}
                </label>
                <input id="lift-value" type="number" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} placeholder={unit === 'reps' ? 'e.g. 12' : 'e.g. 24'} className="input-field" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-fg-4 block mb-1.5" htmlFor="lift-weight">Weight (lb)</label>
                  <input id="lift-weight" type="number" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 185" className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-fg-4 block mb-1.5" htmlFor="lift-reps">Reps</label>
                  <input id="lift-reps" type="number" inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} placeholder="1" className="input-field" />
                </div>
              </div>
            )}
          </div>

          {result && (
            <TierResult result={result} label={STANDARD_LABELS[key]} onViewProgress={libRow ? () => setProgress(true) : undefined} />
          )}

          {thresholds && (
            <div className="card overflow-hidden">
              <button type="button" onClick={() => setTable(t => !t)} className="w-full p-4 text-left flex items-center justify-between min-h-[44px]">
                <span className="text-sm font-medium text-fg-2">Standards for you · {STANDARD_LABELS[key]}</span>
                <span className="text-fg-4 text-xs">{table ? '▲' : '▼'}</span>
              </button>
              {table && (
                <div className="px-4 pb-4 border-t border-edge-muted">
                  <table className="w-full text-sm mt-3">
                    <tbody>
                      {TIER_NAMES.map((t, i) => (
                        <tr key={t} className="border-b border-edge-muted last:border-0">
                          <td className="py-2 text-fg-3">{TIER_LABEL[t]}</td>
                          <td className="py-2 text-right text-fg-1 tabular-nums font-medium">
                            {unit === 'in' ? Math.round(thresholds[i] * 10) / 10 : Math.round(thresholds[i])} {unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[11px] text-fg-4 mt-2">
                    Approximate, modeled on published strength standards for {profile.sex === 'male' ? 'men' : 'women'} at {Number(profile.bodyweight_lb)} lb{profile.age < 18 ? `, scaled for age ${profile.age}` : ''}. Not a medical or coaching assessment.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {progress && libRow && <LiftProgress exerciseId={libRow.id} name={libRow.name} onClose={() => setProgress(false)} />}
    </div>
  )
}
