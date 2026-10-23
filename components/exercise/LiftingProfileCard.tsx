'use client'
import { useEffect, useState } from 'react'
import type { AthleteProfile, Sex } from '@/types/exercise'

interface Props {
  profile: AthleteProfile | null
  suggestedBodyweight: number | null
  onSaved: (p: AthleteProfile) => void
  notify: (msg: string, kind?: 'success' | 'error') => void
}

export default function LiftingProfileCard({ profile, suggestedBodyweight, onSaved, notify }: Props) {
  const [editing, setEditing] = useState(!profile)
  const [sex, setSex] = useState<Sex | ''>(profile?.sex ?? '')
  const [bw, setBw] = useState(profile ? String(profile.bodyweight_lb) : suggestedBodyweight ? String(suggestedBodyweight) : '')
  const [age, setAge] = useState(profile ? String(profile.age) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile && suggestedBodyweight && !bw) setBw(String(suggestedBodyweight))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedBodyweight])

  const save = async () => {
    setError('')
    const b = parseFloat(bw)
    const a = parseInt(age, 10)
    if (!sex) { setError('Pick male or female — standards differ.'); return }
    if (!(b >= 50 && b <= 500)) { setError('Bodyweight should be 50–500 lb.'); return }
    if (!(a >= 10 && a <= 80)) { setError('Age should be 10–80.'); return }
    setSaving(true)
    const res = await fetch('/api/exercise/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sex, bodyweight_lb: b, age: a }),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error || "Couldn't save your profile.")
      return
    }
    onSaved(await res.json())
    setEditing(false)
    notify('Lifting profile saved')
  }

  if (!editing && profile) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-fg-4">Lifting profile</p>
          <p className="text-sm text-fg-1">
            {profile.sex === 'male' ? 'Male' : 'Female'} · {Number(profile.bodyweight_lb)} lb · {profile.age} yrs
          </p>
          {suggestedBodyweight && Math.abs(suggestedBodyweight - Number(profile.bodyweight_lb)) >= 3 && (
            <p className="text-[11px] text-fg-4">Latest weigh-in: {suggestedBodyweight} lb</p>
          )}
        </div>
        <button type="button" onClick={() => { setBw(String(profile.bodyweight_lb)); setAge(String(profile.age)); setSex(profile.sex); setEditing(true) }} className="btn-ghost">Edit</button>
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-fg-1">Lifting profile</h3>
        <p className="text-xs text-fg-4 mt-0.5">One-time setup. Strength tiers depend on sex, bodyweight and age; nothing here is shared with your coach beyond the tier.</p>
      </div>
      <div>
        <label className="text-xs text-fg-4 block mb-1.5">Sex</label>
        <div className="flex gap-2">
          {(['male', 'female'] as const).map(s => (
            <button key={s} type="button" onClick={() => setSex(s)}
              className={`flex-1 min-h-[44px] rounded-xl text-sm font-medium border transition-colors ${sex === s ? 'bg-cta/20 text-cta border-cta/30' : 'bg-surface-2 text-fg-3 border-edge'}`}>
              {s === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-fg-4 block mb-1.5" htmlFor="lp-bw">Bodyweight (lb)</label>
          <input id="lp-bw" type="number" inputMode="decimal" value={bw} onChange={e => setBw(e.target.value)} placeholder="e.g. 165" className="input-field" />
          {suggestedBodyweight && !profile && <p className="text-[11px] text-fg-4 mt-1">From your latest weigh-in</p>}
        </div>
        <div>
          <label className="text-xs text-fg-4 block mb-1.5" htmlFor="lp-age">Age</label>
          <input id="lp-age" type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 16" className="input-field" />
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        {profile && <button type="button" onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>}
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save profile'}</button>
      </div>
    </div>
  )
}
