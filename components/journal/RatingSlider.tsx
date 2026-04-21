'use client'
import { useEffect, useRef, useState } from 'react'
import { UseFormRegisterReturn } from 'react-hook-form'

interface RatingSliderProps {
  label: string
  value: number
  registration: UseFormRegisterReturn
  onChange: (val: number) => void
  /** Tailwind bg color class, e.g. 'bg-blue-500' */
  color: string
}

/**
 * Upgraded rating slider:
 *  - Drag anywhere on the rail (pointer events)
 *  - Click-to-jump on numeric ticks
 *  - Keyboard: ← → ↑ ↓, Home/End, digits 1–9 (0 = 10)
 *  - Chip pulses on value change
 *  - Still a form-registered <input type="range"> so react-hook-form works unchanged
 */
export default function RatingSlider({
  label,
  value,
  registration,
  onChange,
  color,
}: RatingSliderProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    setPulse(true)
    const t = setTimeout(() => setPulse(false), 350)
    return () => clearTimeout(t)
  }, [value])

  const pct = ((value - 1) / 9) * 100

  const fromClientX = (clientX: number): number => {
    const el = railRef.current
    if (!el) return value
    const r = el.getBoundingClientRect()
    const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    return 1 + Math.round(p * 9)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    onChange(fromClientX(e.clientX))
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
    onChange(fromClientX(e.clientX))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); onChange(Math.min(10, value + 1)) }
    else if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, value - 1)) }
    else if (k === 'Home') { e.preventDefault(); onChange(1) }
    else if (k === 'End') { e.preventDefault(); onChange(10) }
    else if (/^[0-9]$/.test(k)) { e.preventDefault(); onChange(k === '0' ? 10 : Number(k)) }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm tabular-nums ${color} transition-transform ${pulse ? 'scale-110' : 'scale-100'}`}
        >
          {value}
        </span>
      </div>

      {/* Draggable rail */}
      <div
        className="relative py-3 cursor-pointer select-none touch-none"
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div ref={railRef} className="relative h-2.5 rounded-full bg-white/5">
          <div
            className={`absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-150 ${color}`}
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-[3px] border-mindfit-bg -translate-x-1/2 -translate-y-1/2 shadow-md transition-transform"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>

      {/* Numeric ticks — click to jump */}
      <div className="flex justify-between px-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`text-[10px] tabular-nums px-1 rounded transition-colors ${
              n === value
                ? 'text-gray-100 font-semibold'
                : 'text-gray-500 hover:text-gray-200'
            }`}
            tabIndex={-1}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Hidden input keeps react-hook-form registration intact */}
      <input
        type="hidden"
        {...registration}
        value={value}
        readOnly
      />
    </div>
  )
}
