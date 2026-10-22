'use client'
import { FoodEntry } from '@/types'
import { MealName } from '@/lib/nutrition'
import FoodEntryRow from './FoodEntryRow'

interface Props {
  meal: MealName
  entries: FoodEntry[]
  canCopyYesterday: boolean
  onAdd: () => void
  onCopyYesterday: () => void
  onServings: (id: string, servings: number) => void
  onDelete: (id: string) => void
}

export default function MealSection({ meal, entries, canCopyYesterday, onAdd, onCopyYesterday, onServings, onDelete }: Props) {
  const kcal = entries.reduce((s, e) => s + Number(e.calories), 0)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-fg-1 text-sm">{meal}</h3>
        <span className="text-xs text-fg-4 tabular-nums">{kcal > 0 ? `${kcal} kcal` : ''}</span>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {entries.map(e => <FoodEntryRow key={e.id} entry={e} onServings={onServings} onDelete={onDelete} />)}
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="button" onClick={onAdd} className="text-sm font-medium text-cta hover:underline">+ Add food</button>
        {entries.length === 0 && canCopyYesterday && (
          <button type="button" onClick={onCopyYesterday} className="text-xs text-fg-4 hover:text-fg-2">Copy yesterday</button>
        )}
      </div>
    </div>
  )
}
