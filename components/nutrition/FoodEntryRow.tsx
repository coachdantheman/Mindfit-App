'use client'
import { useState } from 'react'
import { FoodEntry } from '@/types'
import ServingStepper from './ServingStepper'

interface Props {
  entry: FoodEntry
  isFavorite: boolean
  onToggleFavorite: (entry: FoodEntry) => void
  onServings: (id: string, servings: number) => void
  onDelete: (id: string) => void
}

export default function FoodEntryRow({ entry, isFavorite, onToggleFavorite, onServings, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const servings = Number(entry.servings) || 1
  return (
    <div className="rounded-xl bg-surface-2/40">
      <div className="flex items-center gap-1 pr-1">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex-1 flex items-center justify-between gap-3 pl-3 py-2.5 text-left min-w-0">
          <div className="min-w-0">
            <p className="text-sm text-fg-1 truncate">{entry.food_name}</p>
            <p className="text-[11px] text-fg-4">
              {servings !== 1 || entry.serving_size ? `${servings} × ${entry.serving_size ?? 'serving'} · ` : ''}
              {Math.round(Number(entry.protein_g))}P · {Math.round(Number(entry.carbs_g))}C · {Math.round(Number(entry.fat_g))}F
            </p>
          </div>
          <span className="text-sm font-semibold text-fg-2 tabular-nums shrink-0">{entry.calories}</span>
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(entry)}
          className={`w-11 h-11 sm:w-9 sm:h-9 text-lg sm:text-base shrink-0 ${isFavorite ? 'text-cta' : 'text-fg-4 hover:text-fg-2'}`}
          aria-label={isFavorite ? `Remove ${entry.food_name} from favorites` : `Add ${entry.food_name} to favorites`}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>
      {open && (
        <div className="flex items-center justify-between gap-3 px-3 pb-3">
          <ServingStepper size="sm" value={servings} servingSize={entry.serving_size} onChange={v => onServings(entry.id, v)} />
          <button type="button" onClick={() => onDelete(entry.id)} className="text-xs text-red-400 hover:underline py-2 px-1">Remove</button>
        </div>
      )}
    </div>
  )
}
