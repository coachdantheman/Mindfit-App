'use client'
import { useEffect, useState } from 'react'
import { ProgressPhoto, WeighIn } from '@/types'
import { PHOTO_SLOTS, pickCompareDates } from '@/lib/images'

export default function ProgressCompare({ weighIns }: { weighIns: WeighIn[] }) {
  const withPhotos = weighIns.filter(w => (w.photo_slots?.length ?? 0) > 0)
  const defaults = pickCompareDates(weighIns)
  const [aId, setAId] = useState<string | null>(null)
  const [bId, setBId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Record<string, ProgressPhoto[]>>({})

  const a = withPhotos.find(w => w.id === (aId ?? defaults?.[0].id)) ?? null
  const b = withPhotos.find(w => w.id === (bId ?? defaults?.[1].id)) ?? null

  useEffect(() => {
    for (const w of [a, b]) {
      if (!w || photos[w.id]) continue
      fetch(`/api/nutrition/weigh-ins/${w.id}/photos`).then(r => r.json())
        .then(d => setPhotos(prev => ({ ...prev, [w.id]: Array.isArray(d) ? d : [] })))
    }
  }, [a, b]) // eslint-disable-line react-hooks/exhaustive-deps

  if (withPhotos.length === 0) return null

  const Select = ({ value, onChange }: { value: WeighIn | null; onChange: (id: string) => void }) => (
    <select value={value?.id ?? ''} onChange={e => onChange(e.target.value)} className="input-field py-2 text-sm">
      {withPhotos.map(w => <option key={w.id} value={w.id}>{w.entry_date} · {Number(w.weight_lb)} lb</option>)}
    </select>
  )

  const delta = a && b ? Number(b.weight_lb) - Number(a.weight_lb) : 0

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg-1 text-sm">Progress photos</h3>
        {a && b && a.id !== b.id && (
          <span className={`text-xs tabular-nums ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-orange-400' : 'text-fg-4'}`}>
            {delta > 0 ? '+' : ''}{Math.round(delta * 10) / 10} lb
          </span>
        )}
      </div>
      {withPhotos.length < 2 ? (
        <p className="text-xs text-fg-4">Add photos to a second weigh-in to compare side by side.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Select value={a} onChange={setAId} />
            <Select value={b} onChange={setBId} />
          </div>
          {PHOTO_SLOTS.map(slot => {
            const pa = a ? photos[a.id]?.find(p => p.slot === slot) : null
            const pb = b ? photos[b.id]?.find(p => p.slot === slot) : null
            if (!pa && !pb) return null
            return (
              <div key={slot}>
                <p className="text-[11px] uppercase tracking-wider text-fg-4 mb-1">{slot}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[pa, pb].map((p, i) => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-surface-2 overflow-hidden flex items-center justify-center">
                      {p
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.url} alt={`${slot} ${i === 0 ? 'before' : 'after'}`} className="w-full h-full object-cover" />
                        : <span className="text-xs text-fg-4">No {slot} photo</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
      <p className="text-[11px] text-fg-4">Private to you.</p>
    </div>
  )
}
