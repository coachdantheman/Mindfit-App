'use client'
import { UseFormRegisterReturn } from 'react-hook-form'

interface RatingSliderProps {
  label: string
  value: number
  registration: UseFormRegisterReturn
  onChange: (val: number) => void
  color: string   // tailwind bg color class, e.g. 'bg-blue-500'
}

export default function RatingSlider({ label, value, registration, onChange, color }: RatingSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${color}`}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        {...registration}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-current"
        style={{ accentColor: undefined }}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}
