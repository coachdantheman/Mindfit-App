'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function LeaderboardCard() {
  const [visible, setVisible] = useState<boolean | null>(null)
  const [alias, setAlias] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    fetch('/api/leaderboard/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setVisible(!!d.leaderboard_visible); setAlias(d.leaderboard_alias ?? '') } })
  }, [])

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true)
    setStatus(null)
    const res = await fetch('/api/leaderboard/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setStatus({ ok: false, msg: data.error || 'Could not save.' }); return false }
    setVisible(!!data.leaderboard_visible)
    setAlias(data.leaderboard_alias ?? '')
    return true
  }

  const toggle = async () => {
    if (visible === null) return
    const next = !visible
    if (await patch({ leaderboard_visible: next })) setStatus({ ok: true, msg: next ? 'You’re on the board.' : 'Hidden. Only you can see your rank.' })
  }

  const saveAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await patch({ leaderboard_alias: alias })) setStatus({ ok: true, msg: alias.trim() ? 'Alias saved.' : 'Alias cleared.' })
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-fg-1 mb-1 text-sm">Leaderboard</h3>
      <p className="text-sm text-fg-4 mb-4">
        <Link href="/leaderboard" className="text-cta">The Board</Link> shows your name, sport, title, level and monthly points. Nothing you log is ever shown.
      </p>

      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm text-fg-2">Show me on the board</span>
        <button
          type="button"
          role="switch"
          aria-checked={!!visible}
          disabled={visible === null || saving}
          onClick={toggle}
          className={`relative w-12 h-7 rounded-full transition-colors ${visible ? 'bg-cta' : 'bg-surface-3'} disabled:opacity-50`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-page shadow transition-transform ${visible ? 'left-1 translate-x-5' : 'left-1'}`} />
        </button>
      </div>

      <form onSubmit={saveAlias} className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="leaderboard-alias" className="sr-only">Display alias</label>
          <input
            id="leaderboard-alias"
            type="text"
            maxLength={20}
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder="Alias (optional, replaces your name)"
            className="input-field"
          />
        </div>
        <button type="submit" disabled={saving || visible === null} className="btn-primary shrink-0">{saving ? 'Saving…' : 'Save'}</button>
      </form>
      {status && <p role="status" className={`text-sm mt-2 ${status.ok ? 'text-green-400' : 'text-red-400'}`}>{status.msg}</p>}
    </div>
  )
}
