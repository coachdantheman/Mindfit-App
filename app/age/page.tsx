'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function AgePage() {
  const router = useRouter()
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 101 }, (_, i) => thisYear - i)
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/me/age', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: Number(year), month: Number(month) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error ?? 'Could not save. Try again.'); setSaving(false); return }
    router.push(data.status === 'pending' ? '/consent/waiting' : '/mindset')
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-surface rounded-2xl border border-edge p-8">
        <h1 className="text-2xl font-bold text-fg-1 mb-3">When were you born?</h1>
        <p className="text-fg-3 text-sm leading-relaxed mb-8">We ask everyone. It helps us set up your account the right way.</p>

        <form onSubmit={submit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="birth-month" className="block text-sm font-medium text-fg-2 mb-2">Birth month</label>
              <select id="birth-month" required value={month} onChange={e => setMonth(e.target.value)} className="input-field w-full">
                <option value="">Choose a month</option>
                {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="birth-year" className="block text-sm font-medium text-fg-2 mb-2">Birth year</label>
              <select id="birth-year" required value={year} onChange={e => setYear(e.target.value)} className="input-field w-full">
                <option value="">Choose a year</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

          <button type="submit" disabled={!month || !year || saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
