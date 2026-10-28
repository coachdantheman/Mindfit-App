'use client'
import { useState } from 'react'
import { FoodEntry } from '@/types'
import BottomSheet from '@/components/shared/BottomSheet'

interface Props {
  meal: string
  entries: FoodEntry[]
  defaultName: string
  onSave: (name: string) => Promise<void>
  onClose: () => void
}

export default function SaveMealSheet({ meal, entries, defaultName, onSave, onClose }: Props) {
  const [name, setName] = useState(defaultName)
  const [busy, setBusy] = useState(false)
  const kcal = entries.reduce((s, e) => s + Number(e.calories), 0)

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    try { await onSave(name.trim()) } finally { setBusy(false) }
  }

  return (
    <BottomSheet
      title={`Save ${meal.toLowerCase()} as a meal`}
      onClose={onClose}
      footer={
        <button type="button" onClick={save} disabled={busy || !name.trim()} className="btn-primary w-full">
          {busy ? 'Saving…' : 'Save to Favorites'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide text-fg-4 mb-1">Meal name</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={80} autoFocus className="input-field" placeholder="e.g. Pre-practice lunch" />
        </div>
        <div>
          <p className="text-xs text-fg-4 mb-1">{entries.length} item{entries.length === 1 ? '' : 's'} · {kcal} kcal</p>
          <ul className="divide-y divide-edge-muted">
            {entries.map(e => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-fg-1 truncate">{e.food_name} <span className="text-fg-4 text-xs">× {Number(e.servings)}</span></span>
                <span className="text-fg-2 tabular-nums ml-3 shrink-0">{e.calories}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BottomSheet>
  )
}
