'use client'
import BottomSheet from '@/components/shared/BottomSheet'
import Celebrate from '@/components/shared/Celebrate'

interface Props {
  rank: number | null
  size: number
  lastName: string
  name: string
  moved: 'up' | 'down' | 'same'
  onClose: () => void
}

export default function WeekResultSheet({ rank, size, lastName, name, moved, onClose }: Props) {
  const headline = moved === 'up'
    ? `Promoted to ${name}.`
    : moved === 'down'
      ? `Back to ${name}. Win it back this week.`
      : `You held your place in ${lastName}.`

  return (
    <BottomSheet title="League result" onClose={onClose}>
      <Celebrate fire={moved === 'up' ? 1 : null}>
        <div className="text-center space-y-3 py-2">
          <p className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4">Last week</p>
          <p className="text-4xl font-bold text-fg-1 tabular-nums">{rank === null ? 'Unranked' : `${rank} of ${size}`}</p>
          <p className="text-sm text-fg-3">{lastName}</p>
          <p className="text-base font-semibold text-cta">{headline}</p>
        </div>
      </Celebrate>
      <button type="button" onClick={onClose} className="btn-primary w-full mt-5">Start this week</button>
    </BottomSheet>
  )
}
