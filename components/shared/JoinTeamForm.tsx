'use client'
import { useState } from 'react'
import { joinTeam } from '@/lib/team-code'

export default function JoinTeamForm({ initialCode = '', onJoined }: { initialCode?: string; onJoined: (teamName: string) => void }) {
  const [code, setCode] = useState(initialCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await joinTeam(code)
    setBusy(false)
    if (!r.ok) { setError(r.error); return }
    setCode('')
    onJoined(r.teamName)
  }

  return (
    <form onSubmit={submit}>
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="join-team-code" className="sr-only">Team code</label>
          <input
            id="join-team-code"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="Team code"
            autoCapitalize="characters"
            autoComplete="off"
            className="input-field font-mono tracking-widest"
          />
        </div>
        <button type="submit" disabled={busy || code.length !== 6} className="btn-primary shrink-0">{busy ? 'Joining…' : 'Join'}</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400 mt-2">{error}</p>}
    </form>
  )
}
