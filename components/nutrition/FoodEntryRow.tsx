'use client'
import { useState } from 'react'
import { FoodEntry } from '@/types'
import ServingStepper from './ServingStepper'

interface Props {
  entry: FoodEntry
  onServings: (id: string, servings: number) => void
  onDelete: (id: string) => void
}

export default function FoodEntryRow({ entry, onServings, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const servings = Number(entry.servings) || 1
  return (
    <div className="rounded-xl bg-surface-2/40">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left">
        <div className="min-w-0">
          <p className="text-sm text-fg-1 truncate">{entry.food_name}</p>
          <p className="text-[11px] text-fg-4">
            {servings !== 1 || entry.serving_size ? `${servings} × ${entry.serving_size ?? 'serving'} · ` : ''}
            {Math.round(Number(entry.protein_g))}P · {Math.round(Number(entry.carbs_g))}C · {Math.round(Number(entry.fat_g))}F
          </p>
        </div>
        <span className="text-sm font-semibold text-fg-2 tabular-nums shrink-0">{entry.calories}</span>
      </button>
      {open && (
        <div className="flex items-center justify-between gap-3 px-3 pb-3">
          <ServingStepper size="sm" value={servings} servingSize={entry.serving_size} onChange={v => onServings(entry.id, v)} />
          <button type="button" onClick={() => onDelete(entry.id)} className="text-xs text-red-400 hover:underline py-2 px-1">Remove</button>
        </div>
      )}
    </div>
  )
}
