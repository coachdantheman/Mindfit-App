'use client'

interface Props {
  value: number
  onChange: (v: number) => void
  servingSize?: string | null
  size?: 'sm' | 'md'
}

export default function ServingStepper({ value, onChange, servingSize, size = 'md' }: Props) {
  const set = (v: number) => onChange(Math.max(0.25, Math.min(50, Math.round(v * 4) / 4)))
  const btn = size === 'sm' ? 'w-9 h-9 sm:w-7 sm:h-7 text-sm' : 'w-11 h-11 sm:w-9 sm:h-9'
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => set(value - 0.5)} className={`${btn} rounded-lg bg-surface-2 border border-edge text-fg-2 hover:text-fg-1`} aria-label="Fewer servings">−</button>
      <input
        type="number"
        step="0.25"
        min="0.25"
        value={value}
        onChange={e => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) set(n) }}
        className={`${size === 'sm' ? 'w-12 py-1 text-xs' : 'w-16 py-1.5 text-sm'} bg-surface-2 border border-edge rounded-lg text-center text-fg-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-cta/50`}
      />
      <button type="button" onClick={() => set(value + 0.5)} className={`${btn} rounded-lg bg-surface-2 border border-edge text-fg-2 hover:text-fg-1`} aria-label="More servings">+</button>
      {servingSize && <span className={`${size === 'sm' ? 'text-[11px]' : 'text-xs'} text-fg-4 truncate`}>× {servingSize}</span>}
    </div>
  )
}
