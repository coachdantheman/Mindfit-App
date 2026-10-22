'use client'
import { useState } from 'react'
import type { EstimateItem } from '@/lib/ai-json'
import type { AddItem } from './AddFoodSheet'
import ServingStepper from './ServingStepper'
import { scaleFood } from '@/lib/nutrition'

interface Props {
  query: string
  onAdd: (item: AddItem, saveToFoods: boolean) => void
  busy?: boolean
}

export default function AiEstimateCard({ query, onAdd, busy }: Props) {
  const [est, setEst] = useState<EstimateItem | null>(null)
  const [servings, setServings] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const estimate = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/nutrition/ai/estimate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_name: query }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Estimate failed.')
    else setEst(data)
    setLoading(false)
  }

  if (!est) {
    return (
      <div className="rounded-xl border border-dashed border-edge p-4 text-center">
        <p className="text-sm text-fg-2">No match for “{query}”</p>
        <p className="text-xs text-fg-4 mt-1">Get an estimate, or enter it yourself below.</p>
        <button type="button" onClick={estimate} disabled={loading} className="btn-secondary mt-3">
          {loading ? 'Estimating…' : 'Estimate nutrition'}
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    )
  }

  const set = (k: keyof EstimateItem, v: string) => setEst({ ...est, [k]: parseFloat(v) || 0 })
  const scaled = scaleFood(est, servings)

  return (
    <div className="rounded-xl border border-cta/30 bg-cta/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-fg-1">{est.name}</p>
          <p className="text-[11px] text-fg-4">per {est.serving_size} · estimate, {est.confidence} confidence</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-cta border border-cta/30 rounded-full px-2 py-0.5">AI</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {([['calories', 'Cal'], ['protein_g', 'P g'], ['carbs_g', 'C g'], ['fat_g', 'F g']] as const).map(([k, label]) => (
          <div key={k}>
            <label className="block text-[10px] uppercase tracking-wider text-fg-4 mb-1">{label}</label>
            <input type="number" inputMode="decimal" min="0" className="input-field px-2 text-center" value={est[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      <ServingStepper value={servings} onChange={setServings} servingSize={est.serving_size} />
      <p className="text-[11px] text-fg-4">Estimates are approximate — adjust if you know the label.</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => onAdd({ food_name: est.name, serving_size: est.serving_size, servings, ...scaled, perServing: est, source: 'ai' }, true)}
        className="btn-primary w-full"
      >
        Add {scaled.calories} kcal
      </button>
    </div>
  )
}
