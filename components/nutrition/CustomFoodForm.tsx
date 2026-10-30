'use client'
import { useState } from 'react'
import { caloriesFromMacros } from '@/lib/nutrition'
import type { AddItem } from './AddFoodSheet'

interface Props {
  initialName?: string
  onAdd: (item: AddItem, saveToFoods: boolean) => void
  busy?: boolean
}

export default function CustomFoodForm({ initialName = '', onAdd, busy }: Props) {
  const [name, setName] = useState(initialName)
  const [serving, setServing] = useState('1 serving')
  const [cal, setCal] = useState('')
  const [p, setP] = useState('')
  const [c, setC] = useState('')
  const [f, setF] = useState('')
  const [save, setSave] = useState(true)

  const grams = { protein_g: parseFloat(p) || 0, carbs_g: parseFloat(c) || 0, fat_g: parseFloat(f) || 0 }
  const calc = caloriesFromMacros(grams)
  const calories = cal ? parseInt(cal) : calc
  const mismatch = cal && calc > 0 && Math.abs(calories - calc) / calc > 0.1

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const serving_size = serving.trim() || '1 serving'
    onAdd({ food_name: name.trim(), serving_size, servings: 1, calories, ...grams, perServing: { serving_size, calories, ...grams }, source: 'user' }, save)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="input-field" aria-label="Food name" placeholder="Food name" value={name} onChange={e => setName(e.target.value)} required />
      <input className="input-field" aria-label="Serving size" placeholder="Serving (e.g. 1 cup, 4 oz)" value={serving} onChange={e => setServing(e.target.value)} />
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Cal', v: cal, set: setCal, ph: calc ? String(calc) : '0' },
          { label: 'P g', v: p, set: setP, ph: '0' },
          { label: 'C g', v: c, set: setC, ph: '0' },
          { label: 'F g', v: f, set: setF, ph: '0' },
        ].map(x => (
          <div key={x.label}>
            <label htmlFor={`custom-food-${x.label}`} className="block text-[10px] uppercase tracking-wider text-fg-4 mb-1">{x.label}</label>
            <input id={`custom-food-${x.label}`} type="number" inputMode="decimal" min="0" className="input-field px-2 text-center" placeholder={x.ph} value={x.v} onChange={e => x.set(e.target.value)} />
          </div>
        ))}
      </div>
      {!cal && calc > 0 && <p className="text-[11px] text-fg-4">Calories auto-filled from macros ({calc}).</p>}
      {mismatch && <p className="text-[11px] text-amber-400">Macros add up to {calc} kcal, not {calories}.</p>}
      <label className="flex items-center gap-2 text-xs text-fg-3">
        <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} className="accent-cta" />
        Save to my foods so I can log it again fast
      </label>
      <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full">Add</button>
    </form>
  )
}
