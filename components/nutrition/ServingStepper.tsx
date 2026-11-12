'use client'
import { useState } from 'react'
import { servingsFromAmount } from '@/lib/usda'

type Unit = 'servings' | 'g' | 'oz'
const UNITS: { key: Unit; label: string }[] = [
  { key: 'servings', label: 'servings' },
  { key: 'g', label: 'g' },
  { key: 'oz', label: 'oz' },
]
const UNIT_STEP: Record<Unit, number> = { servings: 0.25, g: 5, oz: 0.5 }
const OZ_PER_G = 28.3495

interface Props {
  value: number
  onChange: (v: number) => void
  servingSize?: string | null
  servingGrams?: number | null
  size?: 'sm' | 'md'
}

export default function ServingStepper({ value, onChange, servingSize, servingGrams, size = 'md' }: Props) {
  const [unit, setUnit] = useState<Unit>('servings')
  const [draft, setDraft] = useState<string | null>(null)
  const grams = servingGrams != null && servingGrams > 0 ? servingGrams : null
  const activeUnit: Unit = grams && size === 'md' ? unit : 'servings'

  const set = (v: number) => onChange(Math.max(0.25, Math.min(50, Math.round(v * 4) / 4)))
  const amount = activeUnit === 'g' ? Math.round(value * (grams ?? 0))
    : activeUnit === 'oz' ? Math.round((value * (grams ?? 0) / OZ_PER_G) * 10) / 10
    : value

  const nudge = (dir: 1 | -1) => {
    setDraft(null)
    if (activeUnit === 'servings' || !grams) return set(value + dir * UNIT_STEP.servings)
    const next = Math.max(0, Math.round((amount + dir * UNIT_STEP[activeUnit]) * 10) / 10)
    const servings = servingsFromAmount(next, activeUnit === 'oz' ? 'oz' : 'g', grams)
    if (servings != null) onChange(servings)
  }

  const typed = (raw: string) => {
    const n = parseFloat(raw)
    if (activeUnit === 'servings') { if (Number.isFinite(n)) set(n); return }
    setDraft(raw)
    if (!Number.isFinite(n) || n <= 0 || !grams) return
    const typedGrams = activeUnit === 'oz' ? n * OZ_PER_G : n
    // Outside what one entry can hold (0.01 to 50 servings): log the nearest allowed amount.
    onChange(Math.max(0.01, Math.min(50, Math.round((typedGrams / grams) * 100) / 100)))
  }

  const btn = size === 'sm' ? 'w-9 h-9 sm:w-7 sm:h-7 text-sm' : 'w-11 h-11 sm:w-9 sm:h-9'
  return (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button type="button" onClick={() => nudge(-1)} className={`${btn} shrink-0 rounded-lg bg-surface-2 border border-edge text-fg-2 hover:text-fg-1`} aria-label="Fewer servings">−</button>
        <input
          type="number"
          step={UNIT_STEP[activeUnit]}
          min={activeUnit === 'servings' ? 0.25 : 0}
          value={draft ?? amount}
          onBlur={() => setDraft(null)}
          onChange={e => typed(e.target.value)}
          aria-label={activeUnit === 'servings' ? 'Servings' : `Amount in ${activeUnit}`}
          className={`${size === 'sm' ? 'w-12 py-1 text-xs' : 'w-16 py-1.5 text-sm'} shrink-0 bg-surface-2 border border-edge rounded-lg text-center text-fg-1 tabular-nums focus:ring-2 focus:ring-cta/50`}
        />
        <button type="button" onClick={() => nudge(1)} className={`${btn} shrink-0 rounded-lg bg-surface-2 border border-edge text-fg-2 hover:text-fg-1`} aria-label="More servings">+</button>
        {grams && size === 'md' && (
          <div className="flex shrink-0 rounded-lg border border-edge overflow-hidden text-xs" role="group" aria-label="Measure by">
            {UNITS.map(u => (
              <button key={u.key} type="button" aria-pressed={activeUnit === u.key} onClick={() => { setUnit(u.key); setDraft(null) }}
                className={`px-2 py-1.5 ${activeUnit === u.key ? 'bg-cta/15 text-cta' : 'bg-surface-2 text-fg-3 hover:text-fg-1'}`}>{u.label}</button>
            ))}
          </div>
        )}
        {servingSize && <span className="text-xs text-fg-4 truncate min-w-0">× {servingSize}</span>}
      </div>
      {activeUnit !== 'servings' && grams && (
        <p className="text-xs text-fg-4 tabular-nums">{Math.round(value * grams)} g = {value} {value === 1 ? 'serving' : 'servings'}</p>
      )}
    </>
  )
}
