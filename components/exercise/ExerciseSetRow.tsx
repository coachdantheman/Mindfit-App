'use client'

interface SetData {
  set_number: number
  reps: string
  weight: string
  rpe: string
  notes: string
}

interface Props {
  data: SetData
  onChange: (data: SetData) => void
  onRemove: () => void
}

export default function ExerciseSetRow({ data, onChange, onRemove }: Props) {
  const update = (field: keyof SetData, value: string) =>
    onChange({ ...data, [field]: value })

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-6 text-center shrink-0">
        {data.set_number}
      </span>
      <input
        type="number"
        value={data.reps}
        onChange={e => update('reps', e.target.value)}
        placeholder="Reps"
        className="w-16 bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
      />
      <input
        type="number"
        value={data.weight}
        onChange={e => update('weight', e.target.value)}
        placeholder="lbs"
        className="w-16 bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
      />
      <select
        value={data.rpe}
        onChange={e => update('rpe', e.target.value)}
        className="w-16 bg-gray-800 border border-white/10 rounded-lg px-1 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
      >
        <option value="">RPE</option>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <input
        value={data.notes}
        onChange={e => update('notes', e.target.value)}
        placeholder="Notes"
        className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50"
      />
      <button
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 text-xs shrink-0 px-1"
      >
        x
      </button>
    </div>
  )
}
