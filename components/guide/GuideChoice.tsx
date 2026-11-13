'use client'
import { useState } from 'react'
import { clearApiCache } from '@/lib/api-cache'
import { saveGuideChoice } from '@/lib/guide'
import { PillarRings } from './Rings'

// "Start every day here?" with a small preview of the guide. Saves the
// athlete's choice, then hands it back so the caller decides where to go.
export default function GuideChoice({ onChosen }: { onChosen: (on: boolean) => void }) {
  const [busy, setBusy] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  const choose = async (on: boolean) => {
    setBusy(on)
    setError('')
    const ok = await saveGuideChoice(on)
    clearApiCache('/api/profile')
    setBusy(null)
    if (!ok) return setError("Couldn't save that. Try again.")
    onChosen(on)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col justify-center py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-cta text-center">Daily Guidance</p>
        <h1 className="mt-3 font-display text-[1.9rem] leading-tight text-fg-1 text-center text-balance">Start every day here?</h1>
        <p className="mt-3 text-sm text-fg-3 text-center">
          The first time you open MindFit each day: a quick check-in, your readiness, then one next step at a time until all four rings are closed.
        </p>

        <div aria-hidden className="mt-8 rounded-3xl border border-cta/30 bg-surface/80 p-5 space-y-5">
          <PillarRings pillars={{ mind: true, body: false, fuel: false, rest: true }} />
          <div className="rounded-2xl border border-edge p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Next · Fuel</p>
            <p className="mt-2 font-display text-lg text-fg-1">Log breakfast</p>
            <p className="mt-1 text-xs text-fg-3">One meal closes your Fuel ring.</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-fg-4 text-center">Change it anytime in Settings.</p>
      </div>

      {error && <p role="alert" className="error-box mb-3">{error}</p>}
      <div className="pb-6 pt-2 space-y-2">
        <button type="button" onClick={() => choose(true)} disabled={busy !== null}
          className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
          {busy === true ? 'Saving…' : 'Guide me every day'}
        </button>
        <button type="button" onClick={() => choose(false)} disabled={busy !== null}
          className="w-full h-12 rounded-full text-fg-3 hover:text-fg-1 font-medium disabled:opacity-50">
          {busy === false ? 'Saving…' : "I'll find my way"}
        </button>
      </div>
    </div>
  )
}
