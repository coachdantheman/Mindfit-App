'use client'
import { useCallback } from 'react'

interface Props {
  totalCalories: number
  proteinPct: number
  carbsPct: number
  fatPct: number
  onCaloriesChange: (cal: number) => void
  onChange: (pcts: { proteinPct: number; carbsPct: number; fatPct: number }) => void
}

const CAL_PER_G = { protein: 4, carbs: 4, fat: 9 }

export default function MacroPercentageSlider({
  totalCalories, proteinPct, carbsPct, fatPct, onCaloriesChange, onChange,
}: Props) {
  const gramsFromPct = (pct: number, calPerGram: number) =>
    Math.round((totalCalories * pct / 100) / calPerGram)

  const rebalance = useCallback((changed: 'protein' | 'carbs' | 'fat', newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal))
    const remaining = 100 - clamped

    const others = { protein: proteinPct, carbs: carbsPct, fat: fatPct }
    delete (others as Record<string, number>)[changed]
    const otherKeys = Object.keys(others) as ('protein' | 'carbs' | 'fat')[]
    const otherTotal = otherKeys.reduce((s, k) => s + others[k], 0)

    const result = { proteinPct, carbsPct, fatPct }
    if (changed === 'protein') result.proteinPct = clamped
    if (changed === 'carbs') result.carbsPct = clamped
    if (changed === 'fat') result.fatPct = clamped

    if (otherTotal === 0) {
      const split = Math.round(remaining / 2)
      const key0 = `${otherKeys[0]}Pct` as keyof typeof result
      const key1 = `${otherKeys[1]}Pct` as keyof typeof result
      result[key0] = split
      result[key1] = remaining - split
    } else {
      otherKeys.forEach(k => {
        const key = `${k}Pct` as keyof typeof result
        result[key] = Math.round((others[k] / otherTotal) * remaining)
      })
      // Fix rounding to ensure sum is 100
      const sum = result.proteinPct + result.carbsPct + result.fatPct
      if (sum !== 100) {
        const adjustKey = `${otherKeys[0]}Pct` as keyof typeof result
        result[adjustKey] += 100 - sum
      }
    }

    onChange(result)
  }, [proteinPct, carbsPct, fatPct, onChange])

  const sliders: { key: 'protein' | 'carbs' | 'fat'; label: string; pct: number; color: string; trackColor: string }[] = [
    { key: 'protein', label: 'Protein', pct: proteinPct, color: 'accent-blue-500', trackColor: 'bg-blue-500' },
    { key: 'carbs', label: 'Carbs', pct: carbsPct, color: 'accent-green-500', trackColor: 'bg-green-500' },
    { key: 'fat', label: 'Fat', pct: fatPct, color: 'accent-orange-500', trackColor: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Total Calories</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1200}
            max={5000}
            step={50}
            value={totalCalories}
            onChange={e => onCaloriesChange(parseInt(e.target.value))}
            className="flex-1 h-2 rounded-full appearance-none bg-gray-700 accent-cta"
          />
          <input
            type="number"
            value={totalCalories}
            onChange={e => onCaloriesChange(parseInt(e.target.value) || 1200)}
            className="w-20 bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-gray-100 text-center focus:outline-none focus:ring-2 focus:ring-cta/50"
          />
        </div>
      </div>

      {/* Stacked bar preview */}
      <div className="h-3 rounded-full overflow-hidden flex">
        <div className="bg-blue-500 transition-all" style={{ width: `${proteinPct}%` }} />
        <div className="bg-green-500 transition-all" style={{ width: `${carbsPct}%` }} />
        <div className="bg-orange-500 transition-all" style={{ width: `${fatPct}%` }} />
      </div>

      {sliders.map(s => (
        <div key={s.key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">{s.label}: {s.pct}%</span>
            <span className="text-gray-300 font-medium">
              {gramsFromPct(s.pct, CAL_PER_G[s.key])}g
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            value={s.pct}
            onChange={e => rebalance(s.key, parseInt(e.target.value))}
            className={`w-full h-2 rounded-full appearance-none bg-gray-700 ${s.color}`}
          />
        </div>
      ))}

      <p className="text-xs text-gray-500 text-center">
        {gramsFromPct(proteinPct, 4)}g P / {gramsFromPct(carbsPct, 4)}g C / {gramsFromPct(fatPct, 9)}g F
      </p>
    </div>
  )
}
