'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FIVE_A_STEPS } from '@/components/mindset/flow/flow-constants'
import { BREATH_PATTERN, CUE_WORD_EXAMPLES, IDENTITY_EXAMPLES, PHYSICAL_TRIGGER_EXAMPLES } from '@/components/mindset/flow/flow-examples'
import { playChime } from '@/lib/flow-audio'
import { useToast } from '@/components/shared/Toast'
import { FiveAStep, FlowCueWord } from '@/types'

interface SessionPayload {
  identity_statement: string
  aim: string
  cue_word: string
  external_target: string
  sport: string
  skipped_steps: FiveAStep[]
  started_at: string
}

export default function FiveAStackSession() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = useState(0)
  const [remaining, setRemaining] = useState(FIVE_A_STEPS[0].durationSec)
  const [paused, setPaused] = useState(true)
  const [payload, setPayload] = useState<SessionPayload>({
    identity_statement: '',
    aim: '',
    cue_word: '',
    external_target: '',
    sport: '',
    skipped_steps: [],
    started_at: new Date().toISOString(),
  })
  const [favorites, setFavorites] = useState<FlowCueWord[]>([])
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState<{ id: string } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const notify = useToast()
  const advancingRef = useRef(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/mindset/flow-state/cue-words').then(r => r.ok ? r.json() : []),
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
    ]).then(([cw, prof]) => {
      setFavorites(Array.isArray(cw) ? cw : [])
      if (prof?.primary_sport) setPayload(p => ({ ...p, sport: prof.primary_sport }))
    })
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setRemaining(r => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [paused])

  useEffect(() => {
    if (remaining === 0 && !advancingRef.current) {
      advancingRef.current = true
      advance()
    }
  }, [remaining])

  useEffect(() => {
    setRemaining(FIVE_A_STEPS[stepIdx]?.durationSec ?? 0)
    advancingRef.current = false
  }, [stepIdx])

  async function finishSession(skipped: FiveAStep[]) {
    setSaving(true)
    setSaveFailed(false)
    const res = await fetch('/api/mindset/flow-state/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        skipped_steps: skipped,
        completed_at: new Date().toISOString(),
      }),
    }).catch(() => null)
    const saved = res?.ok ? await res.json().catch(() => null) : null
    setSaving(false)
    if (saved?.id) setFinished({ id: saved.id })
    else setSaveFailed(true)
  }

  function advance() {
    playChime()
    if (stepIdx >= FIVE_A_STEPS.length - 1) {
      finishSession(payload.skipped_steps)
      return
    }
    setStepIdx(i => i + 1)
  }

  function skipCurrent() {
    const code = FIVE_A_STEPS[stepIdx].code
    setPayload(p => ({ ...p, skipped_steps: [...p.skipped_steps, code] }))
    setRemaining(0)
  }

  function start() {
    setPaused(false)
  }

  // Only words the athlete stars are saved; everything else is used for this run only.
  async function toggleFavorite(kind: 'cue' | 'trigger', word: string) {
    const w = word.trim()
    if (!w) return
    const existing = favorites.find(f => (f.kind ?? 'cue') === kind && f.cue_word.toLowerCase() === w.toLowerCase())
    if (existing) {
      setFavorites(fs => fs.filter(f => f.id !== existing.id))
      const res = await fetch('/api/mindset/flow-state/cue-words', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: existing.id }),
      }).catch(() => null)
      if (!res?.ok) { setFavorites(fs => [existing, ...fs]); notify("Couldn't update favorites. Try again.", 'error') }
      return
    }
    const res = await fetch('/api/mindset/flow-state/cue-words', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cue_word: w, kind }),
    }).catch(() => null)
    if (res?.ok) {
      const created: FlowCueWord = await res.json()
      setFavorites(fs => [created, ...fs.filter(f => f.id !== created.id)])
    } else {
      const err = res ? await res.json().catch(() => ({})) : {}
      notify(err.error || "Couldn't save that favorite. Try again.", 'error')
    }
  }

  const step = FIVE_A_STEPS[stepIdx]
  const progress = useMemo(() => {
    return Math.round(((step.durationSec - remaining) / step.durationSec) * 100)
  }, [step, remaining])
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  if (finished) {
    const logHref = `/exercise?tab=gameday&session=${finished.id}`
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-xl bg-surface rounded-2xl border border-cta/30 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-cta mb-2">Stack complete</p>
          <h2 className="text-3xl font-bold text-fg-1 mb-4">Go compete.</h2>
          <p className="text-base text-fg-2">You&apos;ve set your identity, your aim and your cue. Now trust it and play.</p>
          <div className="mt-6 rounded-xl border border-edge bg-surface-2/60 p-4 text-left">
            <p className="text-sm font-semibold text-fg-1">After the game: log your flow</p>
            <p className="text-sm text-fg-3 mt-1">
              When competition is over, open Exercise → Game Day and log the game. Your flow score links to this stack so you can see what the routine does for you.
            </p>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => router.push('/mindset?tab=Flow%20State')} className="btn-primary">Done, see you after the game</button>
            <button onClick={() => router.push(logHref)} className="btn-secondary">Game&apos;s over, log it now</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-xl">
        {paused && stepIdx === 0 && (
          <p className="mb-4 rounded-xl border border-cta/40 bg-cta/10 px-4 py-3 text-sm text-fg-2 text-center">
            The 5-A Flow Stack is your <span className="font-semibold text-cta">pre-competition</span> routine. Run it before a game or meet, not before practice.
          </p>
        )}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/mindset')}
            className="text-xs text-fg-4 hover:text-fg-2"
          >
            ← Exit ritual
          </button>
          <div className="flex gap-1">
            {FIVE_A_STEPS.map((s, i) => (
              <span
                key={s.code}
                className={`h-1.5 w-6 rounded-full ${
                  i < stepIdx ? 'bg-cta' : i === stepIdx ? 'bg-cta/60' : 'bg-surface-3/60'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-cta/30 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-cta mb-1">{step.label}</p>
          <h2 className="text-3xl font-bold text-fg-1 mb-2">{step.title}</h2>
          <p className="text-base text-fg-2 mt-4">{step.prompt}</p>
          {step.subPrompt && <p className="text-sm text-fg-4 mt-1">{step.subPrompt}</p>}

          <div className="my-8 flex items-center justify-center">
            {step.code === 'A3' ? <BoxBreathing /> : <BreathRing pattern={BREATH_PATTERN[step.code] ?? { inSec: 4, outSec: 6 }} running={!paused} key={step.code} />}
          </div>

          <div className="text-5xl font-mono font-semibold text-cta mb-2">
            {mm}:{ss}
          </div>
          <div className="w-full h-1 bg-surface-3/60 rounded-full overflow-hidden">
            <div className="h-full bg-cta transition-[width] duration-1000 linear" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6">
            <StepBody
              step={step.code}
              payload={payload}
              setPayload={setPayload}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            {paused ? (
              <button onClick={start} className="btn-primary">Begin</button>
            ) : (
              <button
                onClick={skipCurrent}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border border-edge text-fg-3 hover:text-fg-2"
              >
                Skip step →
              </button>
            )}
          </div>
        </div>

        {saving && <p className="text-center text-xs text-fg-4 mt-4">Saving session…</p>}
        {saveFailed && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-400">Your stack didn&apos;t save. Check your connection and try again.</p>
            <button onClick={() => finishSession(payload.skipped_steps)} className="btn-primary mt-3">Retry save</button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepBody({
  step, payload, setPayload, favorites, onToggleFavorite,
}: {
  step: FiveAStep
  payload: SessionPayload
  setPayload: React.Dispatch<React.SetStateAction<SessionPayload>>
  favorites: FlowCueWord[]
  onToggleFavorite: (kind: 'cue' | 'trigger', word: string) => void
}) {
  if (step === 'A1') {
    return (
      <div className="space-y-3">
        <input
          type="text"
          value={payload.identity_statement}
          onChange={e => setPayload(p => ({ ...p, identity_statement: e.target.value }))}
          placeholder="I am ..."
          maxLength={140}
          className="input-field text-center"
        />
        <div className="text-left">
          <p className="text-xs uppercase tracking-wide text-fg-4 mb-2">Need a start? Tap one, then make it yours.</p>
          <div className="flex flex-wrap gap-2">
            {IDENTITY_EXAMPLES.map(ex => (
              <Chip key={ex} active={payload.identity_statement === ex} onClick={() => setPayload(p => ({ ...p, identity_statement: ex }))}>{ex}</Chip>
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (step === 'A2') {
    return (
      <input
        type="text"
        value={payload.aim}
        onChange={e => setPayload(p => ({ ...p, aim: e.target.value }))}
        placeholder="One specific goal for this session"
        maxLength={140}
        className="input-field text-center"
      />
    )
  }
  if (step === 'A4') {
    return (
      <div className="space-y-6 text-left">
        <FavoritePicker
          title="Cue word"
          hint="One or two words you say to yourself to lock in."
          placeholder="Type your own cue word"
          kind="cue"
          examples={CUE_WORD_EXAMPLES}
          favorites={favorites}
          value={payload.cue_word}
          onChange={v => setPayload(p => ({ ...p, cue_word: v }))}
          onToggleFavorite={onToggleFavorite}
        />
        <FavoritePicker
          title="Physical trigger"
          hint="A move you do every time, so your body knows it is go time."
          placeholder="Type your own trigger"
          kind="trigger"
          examples={PHYSICAL_TRIGGER_EXAMPLES}
          favorites={favorites}
          value={payload.external_target}
          onChange={v => setPayload(p => ({ ...p, external_target: v }))}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    )
  }
  if (step === 'A5') {
    return (
      <div className="rounded-xl border border-cta/30 bg-cta/[0.06] p-4 text-left space-y-2">
        <p className="text-sm text-fg-2">Release the tension in your shoulders, hands and jaw. As you let go, say it out loud or in a whisper:</p>
        <p className="font-display text-2xl text-cta text-center tracking-wide py-1">&ldquo;Let it come.&rdquo;</p>
        <p className="text-sm text-fg-3">You have practiced this over and over. Stop thinking and trust the reps. Now is the time for the hard work to pay off. Let it come.</p>
      </div>
    )
  }
  return null
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-[13px] leading-snug border transition-colors text-left ${
        active ? 'bg-cta/20 border-cta text-cta' : 'border-edge text-fg-3 hover:text-fg-2'
      }`}>
      {children}
    </button>
  )
}

function FavoritePicker({
  title, hint, placeholder, kind, examples, favorites, value, onChange, onToggleFavorite,
}: {
  title: string
  hint: string
  placeholder: string
  kind: 'cue' | 'trigger'
  examples: string[]
  favorites: FlowCueWord[]
  value: string
  onChange: (v: string) => void
  onToggleFavorite: (kind: 'cue' | 'trigger', word: string) => void
}) {
  const favs = [...new Map(favorites.filter(f => (f.kind ?? 'cue') === kind).map(f => [f.cue_word.trim().toLowerCase(), f.cue_word.trim()])).values()]
  const isFav = (w: string) => favs.some(f => f.toLowerCase() === w.trim().toLowerCase())
  const rest = examples.filter(e => !isFav(e))
  const current = value.trim()
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-fg-4">{title}</p>
      <p className="text-xs text-fg-4 mb-2">{hint}</p>
      {favs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2" aria-label={`Favorite ${title.toLowerCase()}s`}>
          {favs.map(w => (
            <Chip key={`fav-${w}`} active={current.toLowerCase() === w.toLowerCase()} onClick={() => onChange(w)}>
              <span className="text-cta mr-1" aria-hidden>★</span>{w}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {rest.map(w => (
          <Chip key={w} active={current.toLowerCase() === w.toLowerCase()} onClick={() => onChange(w)}>{w}</Chip>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
          className="input-field text-sm"
        />
        <button
          type="button"
          onClick={() => onToggleFavorite(kind, current)}
          disabled={!current}
          aria-pressed={!!current && isFav(current)}
          aria-label={current && isFav(current) ? `Remove ${current} from favorites` : 'Save as favorite'}
          className={`shrink-0 px-3 min-h-[44px] text-sm rounded-lg border transition-colors disabled:opacity-40 ${
            current && isFav(current) ? 'border-cta bg-cta/15 text-cta' : 'border-cta/30 text-cta hover:bg-cta/10'
          }`}
        >
          {current && isFav(current) ? '★ Saved' : '☆ Favorite'}
        </button>
      </div>
    </div>
  )
}

// Gold ring that grows on the inhale and settles on the exhale, at the
// step's own pace, with the count shown inside.
function BreathRing({ pattern, running }: { pattern: { inSec: number; outSec: number }; running: boolean }) {
  const cycle = pattern.inSec + pattern.outSec
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!running) { setT(0); return }
    const start = performance.now()
    let raf = 0
    const tick = () => { setT(((performance.now() - start) / 1000) % cycle); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, cycle])

  const inhaling = t < pattern.inSec
  const phaseT = inhaling ? t / pattern.inSec : (t - pattern.inSec) / pattern.outSec
  const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2
  const fill = running ? (inhaling ? ease(phaseT) : 1 - ease(phaseT)) : 0.35
  const scale = 0.62 + 0.38 * fill
  const count = running ? Math.max(1, Math.ceil(inhaling ? pattern.inSec - t : cycle - t)) : null
  const r = 70
  const c = 2 * Math.PI * r

  return (
    <div className="relative w-44 h-44 flex items-center justify-center" aria-live="off">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 176 176" aria-hidden="true">
        <circle cx="88" cy="88" r={r} fill="none" stroke="rgb(var(--cta-rgb) / 0.15)" strokeWidth="1.5" />
        <circle cx="88" cy="88" r={r} fill="none" stroke="rgb(var(--cta-rgb))" strokeWidth="2" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - (running ? phaseT : 0))} />
      </svg>
      <div
        className="absolute rounded-full border border-cta/60"
        style={{
          width: 128, height: 128,
          transform: `scale(${scale})`,
          background: 'radial-gradient(circle, rgb(var(--cta-rgb) / 0.28) 0%, rgb(var(--cta-rgb) / 0.08) 65%, transparent 100%)',
          boxShadow: `0 0 ${18 + 26 * fill}px rgb(var(--cta-rgb) / ${0.12 + 0.2 * fill})`,
        }}
        aria-hidden="true"
      />
      <div className="relative text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-cta">{running ? (inhaling ? 'Breathe in' : 'Breathe out') : 'Ready'}</p>
        <p className="text-3xl font-light text-fg-1 tabular-nums mt-1">{count ?? `${pattern.inSec}·${pattern.outSec}`}</p>
        <p className="text-[11px] text-fg-4 mt-0.5">{pattern.inSec} in · {pattern.outSec} out</p>
      </div>
    </div>
  )
}

function BoxBreathing() {
  return (
    <div className="relative w-40 h-40">
      <div className="absolute inset-0 border-2 border-cta/40 rounded-lg" />
      <div
        className="absolute w-4 h-4 bg-cta rounded-full"
        style={{
          animation: 'flow-box-trace 16s linear infinite',
          top: '-8px',
          left: '-8px',
        }}
      />
      <style jsx>{`
        @keyframes flow-box-trace {
          0%   { top: -8px; left: -8px; }
          25%  { top: -8px; left: calc(100% - 8px); }
          50%  { top: calc(100% - 8px); left: calc(100% - 8px); }
          75%  { top: calc(100% - 8px); left: -8px; }
          100% { top: -8px; left: -8px; }
        }
      `}</style>
    </div>
  )
}
