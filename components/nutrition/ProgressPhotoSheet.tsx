'use client'
import { useEffect, useRef, useState } from 'react'
import { ProgressPhoto, WeighIn } from '@/types'
import { PHOTO_SLOTS, PhotoSlot, downscaleImage } from '@/lib/images'
import { useToast } from '@/components/shared/Toast'

interface Props {
  weighIn: WeighIn
  onChange: () => void
  onClose: () => void
}

const LABEL: Record<PhotoSlot, string> = { front: 'Front', side: 'Side', back: 'Back' }

export default function ProgressPhotoSheet({ weighIn, onChange, onClose }: Props) {
  const notify = useToast()
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [busy, setBusy] = useState<PhotoSlot | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const load = () =>
    fetch(`/api/nutrition/weigh-ins/${weighIn.id}/photos`).then(r => r.json()).then(d => setPhotos(Array.isArray(d) ? d : []))

  useEffect(() => { load() }, [weighIn.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const upload = async (slot: PhotoSlot, file: File) => {
    setBusy(slot)
    try {
      const blob = await downscaleImage(file)
      const form = new FormData()
      form.append('slot', slot)
      form.append('file', blob, `${slot}.jpg`)
      const res = await fetch(`/api/nutrition/weigh-ins/${weighIn.id}/photos`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhotos(prev => [...prev.filter(p => p.slot !== slot), data])
      onChange()
    } catch (e: any) {
      notify(e?.message || 'Upload failed. Try again.', 'error')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (slot: PhotoSlot) => {
    setBusy(slot)
    await fetch(`/api/nutrition/weigh-ins/${weighIn.id}/photos?slot=${slot}`, { method: 'DELETE' })
    setPhotos(prev => prev.filter(p => p.slot !== slot))
    setBusy(null)
    onChange()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] bg-surface border border-edge rounded-t-3xl sm:rounded-3xl flex flex-col pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h3 className="font-semibold text-fg-1">Progress photos</h3>
            <p className="text-xs text-fg-4">{weighIn.entry_date} · {Number(weighIn.weight_lb)} lb</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-2" aria-label="Close">✕</button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {PHOTO_SLOTS.map(slot => {
              const photo = photos.find(p => p.slot === slot)
              return (
                <div key={slot} className="space-y-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => inputs.current[slot]?.click()}
                    className="relative w-full aspect-[3/4] rounded-xl border border-dashed border-edge bg-surface-2 overflow-hidden flex items-center justify-center"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt={`${LABEL[slot]} view`} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-fg-4">{busy === slot ? 'Uploading…' : '+ Add'}</span>
                    )}
                  </button>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-3">{LABEL[slot]}</span>
                    {photo && (
                      <button type="button" onClick={() => remove(slot)} className="text-fg-4 hover:text-red-400">Remove</button>
                    )}
                  </div>
                  <input
                    ref={el => { inputs.current[slot] = el }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) upload(slot, f); e.target.value = '' }}
                  />
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-fg-4">Only you can see these. Coaches can’t. Same spot, same lighting, same time of day gives the truest comparison.</p>
        </div>
      </div>
    </div>
  )
}
