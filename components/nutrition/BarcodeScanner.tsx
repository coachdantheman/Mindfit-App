'use client'
import { useEffect, useRef, useState } from 'react'
import { Food } from '@/types'
import { isValidBarcode } from '@/lib/barcode'
import { scaleFood } from '@/lib/nutrition'
import type { AddItem } from './AddFoodSheet'
import ServingStepper from './ServingStepper'

interface Props {
  onAdd: (item: AddItem) => void
  onFoodCreated: (food: Food) => void
  onNotFound: (name?: string) => void
  busy?: boolean
}

type Status = 'starting' | 'scanning' | 'no-camera' | 'looking-up' | 'found' | 'error'

// Native BarcodeDetector where available (Android Chrome); ZXing otherwise (iPhone).
export default function BarcodeScanner({ onAdd, onFoodCreated, onNotFound, busy }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<() => void>(() => {})
  const lastCode = useRef<string>('')
  const [status, setStatus] = useState<Status>('starting')
  const [manual, setManual] = useState('')
  const [error, setError] = useState('')
  const [food, setFood] = useState<Food | null>(null)
  const [servings, setServings] = useState(1)

  const lookup = async (code: string) => {
    if (code === lastCode.current) return
    lastCode.current = code
    setStatus('looking-up')
    setError('')
    try { navigator.vibrate?.(60) } catch {}
    const res = await fetch(`/api/nutrition/barcode?code=${code}`)
    const data = await res.json()
    if (res.ok) {
      setFood(data)
      setServings(1)
      setStatus('found')
      if (res.status === 201) onFoodCreated(data)
      stopRef.current()
    } else {
      setError(data.error ?? 'Lookup failed.')
      setStatus('scanning')
      setTimeout(() => { lastCode.current = '' }, 3000)
      if (res.status === 404) onNotFound()
    }
  }

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    let zxingStop: (() => void) | null = null

    const stop = () => {
      if (timer) clearInterval(timer)
      zxingStop?.()
      stream?.getTracks().forEach(t => t.stop())
      stream = null
    }
    stopRef.current = stop

    const start = async () => {
      const video = videoRef.current
      if (!video || !navigator.mediaDevices?.getUserMedia) { setStatus('no-camera'); return }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      } catch {
        setStatus('no-camera'); return
      }
      if (cancelled) { stop(); return }
      video.srcObject = stream
      await video.play().catch(() => {})
      setStatus('scanning')

      const Detector = (window as any).BarcodeDetector
      if (Detector) {
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        timer = setInterval(async () => {
          if (video.readyState < 2) return
          try {
            const codes = await detector.detect(video)
            const raw = codes[0]?.rawValue?.replace(/\D/g, '')
            if (raw && isValidBarcode(raw)) lookup(raw)
          } catch {}
        }, 250)
      } else {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoElement(video, result => {
          const raw = result?.getText()?.replace(/\D/g, '')
          if (raw && isValidBarcode(raw)) lookup(raw)
        })
        zxingStop = () => controls.stop()
      }
    }
    start()
    return () => { cancelled = true; stop() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const code = manual.replace(/\D/g, '')
    if (!isValidBarcode(code)) { setError('That doesn’t look like a valid barcode.'); return }
    lookup(code)
  }

  if (status === 'found' && food) {
    const scaled = scaleFood(food, servings)
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => { setFood(null); lastCode.current = ''; setStatus('no-camera') }} className="text-xs text-fg-4 hover:text-fg-2">← Scan another</button>
        <div>
          <p className="text-base font-medium text-fg-1">{food.name}</p>
          <p className="text-xs text-fg-4">{food.brand ? `${food.brand} · ` : ''}per {food.serving_size}</p>
        </div>
        <ServingStepper value={servings} onChange={setServings} servingSize={food.serving_size} />
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['kcal', scaled.calories], ['P', scaled.protein_g], ['C', scaled.carbs_g], ['F', scaled.fat_g]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 py-2">
              <p className="text-lg font-semibold text-fg-1 tabular-nums">{v}</p>
              <p className="text-[10px] uppercase tracking-wider text-fg-4">{l}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdd({ food_name: food.name, food_id: food.id, serving_size: food.serving_size, servings, ...scaled })}
          className="btn-primary w-full"
        >
          Add {scaled.calories} kcal
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {status === 'scanning' && (
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-cta/70 rounded-lg pointer-events-none" />
        )}
        {(status === 'starting' || status === 'looking-up') && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-fg-2 bg-black/40">
            {status === 'starting' ? 'Starting camera…' : 'Looking it up…'}
          </div>
        )}
        {status === 'no-camera' && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-fg-3 px-6">
            Camera not available here. Type the number under the barcode instead.
          </div>
        )}
      </div>
      {status === 'scanning' && <p className="text-xs text-fg-4 text-center">Point at the barcode on the package.</p>}
      <form onSubmit={submitManual} className="flex gap-2">
        <input
          inputMode="numeric"
          className="input-field flex-1"
          placeholder="Or type the barcode number"
          value={manual}
          onChange={e => setManual(e.target.value)}
        />
        <button type="submit" className="btn-secondary" disabled={status === 'looking-up'}>Look up</button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
