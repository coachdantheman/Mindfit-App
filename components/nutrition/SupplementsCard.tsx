'use client'
import { FormEvent, useEffect, useRef, useState } from 'react'

interface Supplement {
  id: string
  name: string
  dose: string | null
}

const RECOMMENDED: { name: string; dose: string }[] = [
  { name: 'Creatine', dose: '5 g' },
  { name: 'Fish oil', dose: '1–2 g' },
  { name: 'Vitamin D3', dose: '1,000–2,000 IU' },
  { name: 'Magnesium', dose: '200–400 mg' },
  { name: 'Daily multivitamin', dose: '1 serving' },
]

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export default function SupplementsCard({ date }: { date: string }) {
  const [stack, setStack] = useState<Supplement[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [suggest, setSuggest] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(new Set<string>())

  useEffect(() => {
    let live = true
    setLoading(true)
    fetch(`/api/nutrition/supplements?date=${date}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (!live) return
        setStack(data.supplements)
        setChecked(new Set(data.checked))
        setSuggest(!!data.suggest)
      })
      .catch(() => {
        if (live) setError('Could not load supplements.')
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => { live = false }
  }, [date, reloadKey])

  const addSupplement = async (item: { name: string; dose: string | null }) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/nutrition/supplements', {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(item),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not add supplement.'); return false }
      setStack(prev => [...prev, data])
      return true
    } catch {
      setError('Could not add supplement.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitCustom = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await addSupplement({ name: name.trim(), dose: dose.trim() || null })
    if (ok) { setName(''); setDose('') }
  }

  const toggle = async (s: Supplement) => {
    if (pending.current.has(s.id)) return
    const next = !checked.has(s.id)
    const setOne = (on: boolean) => setChecked(prev => {
      const n = new Set(prev)
      if (on) n.add(s.id); else n.delete(s.id)
      return n
    })
    pending.current.add(s.id)
    setOne(next)
    try {
      const res = await fetch('/api/nutrition/supplements/check', {
        method: 'POST', headers: JSON_HEADERS,
        body: JSON.stringify({ supplement_id: s.id, date, checked: next }),
      })
      if (!res.ok) throw new Error('check failed')
    } catch {
      setOne(!next)
      setError('Could not save check.')
    } finally {
      pending.current.delete(s.id)
    }
  }

  const remove = async (s: Supplement) => {
    setStack(prev => prev.filter(x => x.id !== s.id))
    try {
      const res = await fetch(`/api/nutrition/supplements?id=${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('remove failed')
    } catch {
      setError('Could not remove supplement.')
      setReloadKey(k => k + 1)
    }
  }

  const inStack = (n: string) => stack.some(s => s.name.toLowerCase() === n.toLowerCase())
  const available = suggest ? RECOMMENDED.filter(r => !inStack(r.name)) : []
  const doneCount = stack.filter(s => checked.has(s.id)).length

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-fg-1 text-sm">Supplements</h3>
        {stack.length > 0 && <span className="text-xs text-fg-4 tabular-nums">{doneCount} of {stack.length} taken</span>}
      </div>

      {loading ? (
        <div className="skeleton h-12" />
      ) : (
        <>
          {stack.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {stack.map(s => {
                const done = checked.has(s.id)
                return (
                  <div key={s.id} className="flex items-center gap-1 pr-1 rounded-xl bg-surface-2/40">
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      aria-pressed={done}
                      className="flex-1 flex items-center gap-3 pl-3 py-2.5 min-h-[44px] text-left min-w-0"
                    >
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 ${done ? 'bg-cta/20 border-cta text-cta' : 'border-fg-4 text-transparent'}`}>✓</span>
                      <span className="min-w-0">
                        <span className={`block text-sm truncate ${done ? 'text-fg-3 line-through' : 'text-fg-1'}`}>{s.name}</span>
                        {s.dose && <span className="block text-xs text-fg-4 truncate">{s.dose}</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      aria-label={`Remove ${s.name}`}
                      className="shrink-0 text-xs text-red-400 hover:underline min-h-[44px] px-2"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t border-border-muted pt-3 space-y-3">
            <p className="text-xs text-fg-3">{suggest ? 'Build your stack' : 'Track what you already take'}</p>
            {available.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {available.map(r => (
                  <button
                    key={r.name}
                    type="button"
                    disabled={busy}
                    onClick={() => addSupplement({ name: r.name, dose: r.dose })}
                    className="text-xs text-fg-2 rounded-full border border-border px-3 min-h-[36px] hover:border-cta/40 hover:text-cta disabled:opacity-50"
                  >
                    + {r.name} · {r.dose}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-fg-4">MindFit does not give medical advice. Check with a parent and a doctor before starting any supplement.</p>
            <form onSubmit={submitCustom} className="grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-2">
              <input
                type="text"
                required
                maxLength={60}
                placeholder="Supplement name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field min-w-0"
              />
              <input
                type="text"
                maxLength={40}
                placeholder="Dose (optional)"
                value={dose}
                onChange={e => setDose(e.target.value)}
                className="input-field min-w-0"
              />
              <button type="submit" disabled={busy} className="btn-primary col-span-full">Add to stack</button>
            </form>
          </div>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </>
      )}
    </div>
  )
}
