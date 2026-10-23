'use client'
import { useMemo, useState } from 'react'
import BottomSheet from '@/components/shared/BottomSheet'
import { MUSCLE_GROUP_LABELS, searchExercises } from '@/lib/exercise-library'
import type { ExerciseLibraryRow, MuscleGroup } from '@/types/exercise'

interface Props {
  library: ExerciseLibraryRow[]
  onPick: (row: ExerciseLibraryRow) => void
  onCreate: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
  onClose: () => void
  title?: string
}

const GROUPS = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

export default function ExercisePicker({ library, onPick, onCreate, onClose, title = 'Add exercise' }: Props) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState<MuscleGroup | null>(null)
  const [busy, setBusy] = useState(false)

  const results = useMemo(() => {
    const pool = group ? library.filter(e => e.muscle_group === group) : library
    if (q.trim()) return searchExercises(pool, q, 40)
    return [...pool].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 80)
  }, [library, q, group])

  const exact = q.trim() && library.some(e => e.name.toLowerCase() === q.trim().toLowerCase())

  const create = async () => {
    setBusy(true)
    try {
      const row = await onCreate(q.trim(), group ?? 'full_body')
      if (row) onPick(row)
    } finally { setBusy(false) }
  }

  return (
    <BottomSheet
      title={title}
      onClose={onClose}
      header={(
        <div className="space-y-2">
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search exercises"
            className="input-field"
            aria-label="Search exercises"
          />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5">
            <button type="button" onClick={() => setGroup(null)} className={`shrink-0 ${group === null ? 'tab-btn-active' : 'tab-btn'}`}>All</button>
            {GROUPS.map(g => (
              <button key={g} type="button" onClick={() => setGroup(group === g ? null : g)} className={`shrink-0 ${group === g ? 'tab-btn-active' : 'tab-btn'}`}>
                {MUSCLE_GROUP_LABELS[g]}
              </button>
            ))}
          </div>
        </div>
      )}
    >
      {q.trim() && !exact && (
        <button type="button" disabled={busy} onClick={create}
          className="w-full text-left mb-2 px-3 py-3 rounded-xl border border-dashed border-cta/40 text-sm text-cta disabled:opacity-50">
          {busy ? 'Adding…' : <>+ Add &ldquo;{q.trim()}&rdquo; as a custom exercise</>}
        </button>
      )}
      {results.length === 0 ? (
        <p className="text-sm text-fg-4 text-center py-8">No matches.</p>
      ) : (
        <div className="divide-y divide-edge-muted">
          {results.map(e => (
            <button key={e.id} type="button" onClick={() => onPick(e)} className="w-full flex items-center justify-between py-3 text-left min-h-[44px]">
              <div className="min-w-0">
                <p className="text-sm text-fg-1 truncate">{e.name}</p>
                <p className="text-[11px] text-fg-4">
                  {MUSCLE_GROUP_LABELS[e.muscle_group]} · {e.equipment}{e.source === 'user' ? ' · custom' : ''}
                </p>
              </div>
              <span className="text-cta text-lg ml-3 shrink-0">+</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
