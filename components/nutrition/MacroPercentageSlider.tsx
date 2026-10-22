'use client'
import { CAL_PER_G, MacroSplit, macrosFromCalories, rebalanceSplit } from '@/lib/nutrition'

interface Props {
  totalCalories: number
  split: MacroSplit
  onChange: (split: MacroSplit) => void
}

export default function MacroPercentageSlider({ totalCalories, split, onChange }: Props) {
  const grams = macrosFromCalories(totalCalories, split)
  const sliders: { key: keyof MacroSplit; label: string; g: number; accent: string; bar: string }[] = [
    { key: 'protein_pct', label: 'Protein', g: grams.protein_g, accent: 'accent-[var(--chart-2)]', bar: 'bg-chart-2' },
    { key: 'carbs_pct', label: 'Carbs', g: grams.carbs_g, accent: 'accent-[var(--chart-4)]', bar: 'bg-chart-4' },
    { key: 'fat_pct', label: 'Fat', g: grams.fat_g, accent: 'accent-[var(--chart-5)]', bar: 'bg-chart-5' },
  ]

  return (
    <div className="space-y-4">
      <div className="h-3 rounded-full overflow-hidden flex">
        <div className="bg-chart-2 transition-all" style={{ width: `${split.protein_pct}%` }} />
        <div className="bg-chart-4 transition-all" style={{ width: `${split.carbs_pct}%` }} />
        <div className="bg-chart-5 transition-all" style={{ width: `${split.fat_pct}%` }} />
      </div>
      {sliders.map(s => (
        <div key={s.key}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-fg-3">{s.label}: {split[s.key]}%</span>
            <span className="text-fg-2 font-medium tabular-nums">{s.g}g · {s.g * CAL_PER_G[s.key === 'protein_pct' ? 'protein' : s.key === 'carbs_pct' ? 'carbs' : 'fat']} kcal</span>
          </div>
          <input
            type="range" min={5} max={70} value={split[s.key]}
            onChange={e => onChange(rebalanceSplit(split, s.key, parseInt(e.target.value)))}
            className={`w-full h-2 rounded-full appearance-none bg-surface-3 ${s.accent}`}
          />
        </div>
      ))}
    </div>
  )
}
