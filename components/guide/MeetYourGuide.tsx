'use client'
import { useEffect, useRef, useState } from 'react'
import { clearApiCache } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { guideChanged, saveGuideChoice, saveNextObjective, todayQuery } from '@/lib/guide'
import { STARTERS, guideFor, recommendedGuide, type GuideKey } from '@/lib/guide-characters'
import { guideLine } from '@/lib/data/guide-lines'
import Character from './art/Character'
import GuideSpeaker from './GuideSpeaker'
import { PillarRings } from './Rings'

type Step = 'pick' | 'tour' | 'identity' | 'objective' | 'daily'

const TOUR_LINES = ['tour.rings', 'tour.morning', 'tour.steps'] as const

// Onboarding's last stop: the athlete picks a guide, takes a three-tap tour,
// writes an identity statement and one objective, then chooses daily guidance.
// `existing` is the short version for athletes who joined before guides: pick
// and tour only, since they already have the rest.
export default function MeetYourGuide({ onDone, existing = false }: {
  onDone: (daily: boolean, guide: GuideKey) => void
  existing?: boolean
}) {
  const [step, setStep] = useState<Step>('pick')
  const [chosen, setChosen] = useState<GuideKey>('sparrow')
  const [recommended, setRecommended] = useState<GuideKey | null>(null)
  const [tour, setTour] = useState(0)
  const [identity, setIdentity] = useState('')
  const [objective, setObjective] = useState('')
  const [busy, setBusy] = useState(false)
  const [pressed, setPressed] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const touched = useRef(false)

  const guide = guideFor(chosen)
  const voice = guide.voice

  useEffect(() => {
    fetch(todayQuery(localDateISO()))
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        const rec = recommendedGuide(json?.focus?.need)
        if (!rec) return
        setRecommended(rec)
        if (!touched.current) setChosen(rec)
      })
      .catch(() => {})
  }, [])

  const go = (s: Step) => { setError(''); setStep(s) }

  const pick = (key: GuideKey) => {
    touched.current = true
    setChosen(key)
  }

  const savePick = async () => {
    setBusy(true)
    setError('')
    const ok = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guide_character: chosen }),
    }).then(r => r.ok).catch(() => false)
    setBusy(false)
    if (!ok) return setError("Couldn't save that. Try again.")
    clearApiCache('/api/profile')
    guideChanged()
    go('tour')
  }

  const saveIdentity = async () => {
    setBusy(true)
    setError('')
    const ok = await fetch('/api/mindset/affirmations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: identity.trim() }),
    }).then(r => r.ok).catch(() => false)
    setBusy(false)
    if (!ok) return setError("Couldn't save that. Try again.")
    go('objective')
  }

  const saveObjective = () => {
    saveNextObjective(objective)
    go('daily')
  }

  const finishDaily = async (on: boolean) => {
    setBusy(true)
    setPressed(on)
    setError('')
    const ok = await saveGuideChoice(on)
    setBusy(false)
    setPressed(null)
    if (!ok) return setError("Couldn't save that. Try again.")
    clearApiCache('/api/profile')
    onDone(on, chosen)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col justify-center py-6">
        <div key={step + tour} className="mf-rise">
          {step === 'pick' && (
            <>
              <p className="text-xs uppercase tracking-[0.24em] text-cta text-center">{existing ? 'New · Your guide' : 'Your guide'}</p>
              <h1 className="mt-3 font-display text-[1.9rem] leading-tight text-fg-1 text-center text-balance">Choose who walks you through each day</h1>
              <div role="group" aria-label="Choose your guide" className="mt-8 grid grid-cols-3 gap-2">
                {STARTERS.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={chosen === g.key}
                    onClick={() => pick(g.key)}
                    className={`relative rounded-2xl border p-3 pt-5 flex flex-col items-center gap-1.5 transition-colors ${chosen === g.key ? 'border-cta bg-cta/[0.06]' : 'border-edge hover:border-cta/40'}`}
                  >
                    {recommended === g.key && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cta text-fg-inverse text-[10px] font-semibold px-2 py-0.5">Fits your score</span>
                    )}
                    <Character species={g.key} size={72} />
                    <span className="text-sm font-medium text-fg-1">{g.name}</span>
                  </button>
                ))}
              </div>
              <p aria-live="polite" className="mt-5 text-sm text-fg-2 bg-surface-2 rounded-2xl px-4 py-3 text-center">{guideLine(voice, 'pick.intro')}</p>
              <p className="mt-3 text-xs text-fg-4 text-center">You can switch anytime in Settings.</p>
            </>
          )}

          {step === 'tour' && (
            <>
              <GuideSpeaker layout="hero" character={chosen} line={guideLine(voice, TOUR_LINES[tour])} />
              {tour === 0 && (
                <div aria-hidden className="mt-8">
                  <PillarRings pillars={{ mind: true, body: false, fuel: false, rest: true }} />
                </div>
              )}
              {tour === 2 && (
                <div aria-hidden className="mt-8 rounded-2xl border border-edge p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Next · Fuel</p>
                  <p className="mt-2 font-display text-lg text-fg-1">Log breakfast</p>
                  <p className="mt-1 text-xs text-fg-3">One meal closes your Fuel ring.</p>
                </div>
              )}
              <p className="mt-6 text-xs text-fg-4 text-center">{tour + 1} of 3</p>
            </>
          )}

          {step === 'identity' && (
            <>
              <GuideSpeaker character={chosen} line={guideLine(voice, 'tour.identity')} />
              <label htmlFor="guide-identity" className="sr-only">Your identity statement</label>
              <input
                id="guide-identity"
                type="text"
                maxLength={280}
                value={identity}
                onChange={e => setIdentity(e.target.value)}
                placeholder="I am the athlete who..."
                className="input-field py-3 mt-5"
              />
              <p className="mt-2 text-xs text-fg-4">You can add more or change it later in Mindset.</p>
            </>
          )}

          {step === 'objective' && (
            <>
              <GuideSpeaker character={chosen} line={guideLine(voice, 'tour.objective')} />
              <label htmlFor="guide-objective" className="sr-only">Today&apos;s objective</label>
              <input
                id="guide-objective"
                type="text"
                maxLength={200}
                value={objective}
                onChange={e => setObjective(e.target.value)}
                placeholder="One thing I will do today"
                className="input-field py-3 mt-5"
              />
            </>
          )}

          {step === 'daily' && (
            <>
              <GuideSpeaker layout="hero" character={chosen} line={guideLine(voice, 'tour.daily')} />
              <p className="mt-4 text-sm text-fg-3 text-center">The first time you open MindFit each day: sleep, a short routine, then one next step at a time. Change it anytime in Settings.</p>
            </>
          )}
        </div>
      </div>

      {error && <p role="alert" className="error-box mb-3">{error}</p>}
      <div className="pb-6 pt-2 space-y-2">
        {step === 'pick' && (
          <button type="button" onClick={savePick} disabled={busy}
            className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
            {busy ? 'Saving…' : `Choose ${guide.name}`}
          </button>
        )}

        {step === 'tour' && (
          <button type="button" onClick={() => (tour < 2 ? setTour(tour + 1) : existing ? onDone(true, chosen) : go('identity'))}
            className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
            Next
          </button>
        )}

        {step === 'identity' && (
          <>
            <button type="button" onClick={saveIdentity} disabled={busy || !identity.trim()}
              className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
              Save and continue
            </button>
            <button type="button" onClick={() => go('objective')} disabled={busy}
              className="w-full h-12 rounded-full text-fg-3 hover:text-fg-1 font-medium disabled:opacity-50">
              Skip for now
            </button>
          </>
        )}

        {step === 'objective' && (
          <>
            <button type="button" onClick={saveObjective} disabled={!objective.trim()}
              className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
              Set my objective
            </button>
            <button type="button" onClick={() => go('daily')}
              className="w-full h-12 rounded-full text-fg-3 hover:text-fg-1 font-medium disabled:opacity-50">
              Skip for now
            </button>
          </>
        )}

        {step === 'daily' && (
          <>
            <button type="button" onClick={() => finishDaily(true)} disabled={busy}
              className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-50">
              {pressed === true ? 'Saving…' : 'Yes, meet me every day'}
            </button>
            <button type="button" onClick={() => finishDaily(false)} disabled={busy}
              className="w-full h-12 rounded-full text-fg-3 hover:text-fg-1 font-medium disabled:opacity-50">
              {pressed === false ? 'Saving…' : "I'll find my way"}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
