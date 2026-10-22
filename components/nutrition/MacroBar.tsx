interface Props {
  label: string
  current: number
  goal: number
  unit: string
  colorClass: string
  compact?: boolean
}

export default function MacroBar({ label, current, goal, unit, colorClass, compact }: Props) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const over = goal > 0 && current > goal
  return (
    <div>
      <div className={`flex justify-between ${compact ? 'text-[11px]' : 'text-xs'} mb-1`}>
        <span className="text-fg-3">{label}</span>
        <span className={`font-medium tabular-nums ${over ? 'text-orange-400' : 'text-fg-2'}`}>
          {Math.round(current)} / {Math.round(goal)} {unit}
        </span>
      </div>
      <div className={`bg-surface-3 rounded-full ${compact ? 'h-1.5' : 'h-2.5'} overflow-hidden`}>
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
