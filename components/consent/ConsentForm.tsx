'use client'
import { useState } from 'react'

interface Props {
  token: string
  childName: string
  granted: boolean
  initial: { shareCoaches: boolean; ai: boolean; leaderboard: boolean }
}

type Done = 'first' | 'again' | 'declined' | null

export default function ConsentForm({ token, childName, granted, initial }: Props) {
  const [parentName, setParentName] = useState('')
  const [relationship, setRelationship] = useState<'parent' | 'legal_guardian' | ''>('')
  const [shareCoaches, setShareCoaches] = useState(granted ? initial.shareCoaches : false)
  const [ai, setAi] = useState(granted ? initial.ai : false)
  const [leaderboard, setLeaderboard] = useState(granted ? initial.leaderboard : false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<Done>(null)

  const trimmedName = parentName.trim()
  const nameOk = trimmedName.length >= 2 && trimmedName.length <= 120
  const signed = signature.trim().toLowerCase() === trimmedName.toLowerCase()

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/consent/parent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...body }),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nameOk) return setError('Enter your full name.')
    if (!relationship) return setError('Choose parent or legal guardian.')
    if (!agreed) return setError('Tick the box to confirm you are the parent or guardian and consent.')
    if (!signed) return setError('Type your full name to sign. It must match the name above.')
    setSaving(true)
    const { ok, data } = await post({
      decision: 'grant', parentName: trimmedName, signature: signature.trim(), relationship,
      shareCoaches, ai, leaderboard,
    })
    setSaving(false)
    if (!ok) return setError(data.error ?? 'Something went wrong. Try again.')
    setDone(data.firstTime ? 'first' : 'again')
  }

  const decline = async () => {
    if (!window.confirm(`This permanently deletes ${childName}'s account and everything in it. Continue?`)) return
    setSaving(true); setError('')
    const { ok, data } = await post({ decision: 'decline' })
    setSaving(false)
    if (!ok) return setError(data.error ?? 'Something went wrong. Try again.')
    setDone('declined')
  }

  if (done === 'first') {
    return (
      <div className="card p-6">
        <p className="text-fg-1 leading-relaxed">
          Thank you. {childName} can now use MindFit. We also emailed you an invitation to a free parent account so you can see their progress.
        </p>
      </div>
    )
  }
  if (done === 'again') {
    return <div className="card p-6"><p className="text-fg-1">Your choices are saved.</p></div>
  }
  if (done === 'declined') {
    return <div className="card p-6"><p className="text-fg-1 leading-relaxed">{childName}&rsquo;s account and all of its information have been deleted.</p></div>
  }

  const checkbox = 'mt-1 h-4 w-4 shrink-0'

  return (
    <form onSubmit={submit} className="card p-6 space-y-6" noValidate>
      <div>
        <label htmlFor="parent-name" className="block text-sm font-medium text-fg-2 mb-2">Your full name</label>
        <input id="parent-name" type="text" autoComplete="name" value={parentName} onChange={e => setParentName(e.target.value)} className="input-field w-full" />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-fg-2 mb-2">Your relationship to {childName}</legend>
        <label className="flex items-center gap-2 text-sm text-fg-2">
          <input type="radio" name="relationship" value="parent" checked={relationship === 'parent'} onChange={() => setRelationship('parent')} />
          Parent
        </label>
        <label className="flex items-center gap-2 text-sm text-fg-2">
          <input type="radio" name="relationship" value="legal_guardian" checked={relationship === 'legal_guardian'} onChange={() => setRelationship('legal_guardian')} />
          Legal guardian
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-fg-2 mb-2">Optional choices</legend>
        <label className="flex gap-3 text-sm text-fg-2 leading-relaxed">
          <input type="checkbox" className={checkbox} checked={shareCoaches} onChange={e => setShareCoaches(e.target.checked)} />
          <span>Let my child&rsquo;s coaches see their logs</span>
        </label>
        <label className="flex gap-3 text-sm text-fg-2 leading-relaxed">
          <input type="checkbox" className={checkbox} checked={ai} onChange={e => setAi(e.target.checked)} />
          <span>Allow AI features (typed meal descriptions and training requests are processed by Anthropic)</span>
        </label>
        <label className="flex gap-3 text-sm text-fg-2 leading-relaxed">
          <input type="checkbox" className={checkbox} checked={leaderboard} onChange={e => setLeaderboard(e.target.checked)} />
          <span>Show my child&rsquo;s first name and points on the leaderboard</span>
        </label>
      </fieldset>

      <label className="flex gap-3 text-sm text-fg-1 leading-relaxed">
        <input type="checkbox" className={checkbox} checked={agreed} onChange={e => setAgreed(e.target.checked)} />
        <span>I am {childName}&rsquo;s parent or legal guardian. I have read this notice and I consent to MindFit collecting and using my child&rsquo;s information as described.</span>
      </label>

      <div>
        <label htmlFor="signature" className="block text-sm font-medium text-fg-2 mb-2">Type your full name to sign</label>
        <input id="signature" type="text" autoComplete="off" value={signature} onChange={e => setSignature(e.target.value)} className="input-field w-full" aria-invalid={signature.length > 0 && !signed} aria-describedby={signature.length > 0 && !signed ? 'signature-error' : undefined} />
        {signature.length > 0 && !signed && (
          <p id="signature-error" className="mt-2 text-xs text-red-400">This must match your full name above.</p>
        )}
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      <div className="space-y-4">
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {granted ? 'Save my choices' : 'I consent'}
        </button>
        <button type="button" onClick={decline} disabled={saving} className="w-full text-sm text-fg-3 hover:text-red-400 underline underline-offset-4">
          {granted ? 'Withdraw consent and delete my child’s account' : 'I do not consent. Delete my child’s account'}
        </button>
      </div>
    </form>
  )
}
