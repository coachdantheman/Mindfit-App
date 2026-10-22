'use client'
import { useState } from 'react'
import type { EstimateItem } from '@/lib/ai-json'
import type { AddItem } from './AddFoodSheet'
import ServingStepper from './ServingStepper'
import { scaleFood } from '@/lib/nutrition'

interface Props {
  meal: string
  onAddMany: (items: AddItem[]) => void
  busy?: boolean
}

export default function DescribeMeal({ meal, onAddMany, busy }: Props) {
  const [text, setText] = useState('')
  const [items, setItems] = useState<(EstimateItem & { checked: boolean })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const parse = async () => {
    setLoading(true); setError('')
    const res = await fetch('/api/nutrition/ai/parse-meal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, meal_name: meal }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Could not parse that.')
    else setItems(data.items.map((i: EstimateItem) => ({ ...i, checked: true })))
    setLoading(false)
  }

  const update = (i: number, patch: Partial<EstimateItem & { checked: boolean }>) =>
    setItems(list => list.map((it, idx) => idx === i ? { ...it, ...patch } : it))

  const chosen = items.filter(i => i.checked)
  const total = chosen.reduce((s, i) => s + scaleFood(i, i.servings).calories, 0)

  return (
    <div className="space-y-3">
      <textarea
        className="textarea-field"
        rows={3}
        placeholder='e.g. "2 scrambled eggs, 2 slices of toast with peanut butter, 16 oz chocolate milk"'
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={600}
      />
      <button type="button" onClick={parse} disabled={loading || text.trim().length < 3} className="btn-secondary w-full">
        {loading ? 'Breaking it down…' : 'Break it down'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className={`rounded-xl border p-3 ${it.checked ? 'border-edge bg-surface-2/40' : 'border-edge-muted opacity-50'}`}>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={it.checked} onChange={e => update(i, { checked: e.target.checked })} className="accent-cta mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg-1">{it.name}</p>
                  <p className="text-[11px] text-fg-4">
                    {scaleFood(it, it.servings).calories} kcal · {Math.round(it.protein_g * it.servings)}P · {Math.round(it.carbs_g * it.servings)}C · {Math.round(it.fat_g * it.servings)}F
                  </p>
                </div>
              </label>
              {it.checked && (
                <div className="mt-2">
                  <ServingStepper size="sm" value={it.servings} servingSize={it.serving_size} onChange={v => update(i, { servings: v })} />
                </div>
              )}
            </div>
          ))}
          <p className="text-[11px] text-fg-4">AI estimates — edit servings or uncheck anything that's off.</p>
          <button
            type="button"
            disabled={busy || chosen.length === 0}
            onClick={() => onAddMany(chosen.map(i => ({
              food_name: i.name, serving_size: i.serving_size, servings: i.servings,
              ...scaleFood(i, i.servings), perServing: i, source: 'ai' as const,
            })))}
            className="btn-primary w-full"
          >
            Add {chosen.length} item{chosen.length === 1 ? '' : 's'} · {total} kcal
          </button>
        </div>
      )}
    </div>
  )
}
