'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FIVE_A_STEPS } from '@/components/mindset/flow/flow-constants'
import { playChime } from '@/lib/flow-audio'
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
  const [cueWords, setCueWords] = useState<FlowCueWord[]>([])
  const [newCue, setNewCue] = useState('')
  const [saving, setSaving] = useState(false)
  const advancingRef = useRef(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/mindset/flow-state/cue-words').then(r => r.ok ? r.json() : []),
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
    ]).then(([cw, prof]) => {
      setCueWords(Array.isArray(cw) ? cw : [])
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
    const res = await fetch('/api/mindset/flow-state/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        skipped_steps: skipped,
        completed_at: new Date().toISOString(),
      }),
    })
    const saved = res.ok ? await res.json() : null
    router.push(saved?.id ? `/mindset/flow-state/log?session=${saved.id}` : '/mindset/flow-state/log')
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

  async function addCueWord() {
    if (!newCue.trim()) return
    const res = await fetch('/api/mindset/flow-state/cue-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cue_word: newCue.trim() }),
    })
    if (res.ok) {
      const created = await res.json()
      setCueWords(cw => [created, ...cw])
      setPayload(p => ({ ...p, cue_word: created.cue_word }))
      setNewCue('')
    }
  }

  const step = FIVE_A_STEPS[stepIdx]
  const progress = useMemo(() => {
    return Math.round(((step.durationSec - remaining) / step.durationSec) * 100)
  }, [step, remaining])
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/mindset')}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            ← Exit ritual
          </button>
          <div className="flex gap-1">
            {FIVE_A_STEPS.map((s, i) => (
              <span
                key={s.code}
                className={`h-1.5 w-6 rounded-full ${
                  i < stepIdx ? 'bg-cta' : i === stepIdx ? 'bg-cta/60' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-cta/30 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-cta mb-1">{step.label}</p>
          <h2 className="text-3xl font-bold text-gray-100 mb-2">{step.title}</h2>
          <p className="text-base text-gray-200 mt-4">{step.prompt}</p>
          {step.subPrompt && <p className="text-sm text-gray-500 mt-1">{step.subPrompt}</p>}

          <div className="my-8 flex items-center justify-center">
            {step.code === 'A3' ? <BoxBreathing /> : <BreathPulse />}
          </div>

          <div className="text-5xl font-mono font-semibold text-cta mb-2">
            {mm}:{ss}
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-cta transition-all duration-1000 linear" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6">
            <StepBody
              step={step.code}
              payload={payload}
              setPayload={setPayload}
              cueWords={cueWords.filter(c => c.is_active)}
              newCue={newCue}
              setNewCue={setNewCue}
              onAddCue={addCueWord}
            />
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            {paused ? (
              <button onClick={start} className="btn-primary">Begin</button>
            ) : (
              <button
                onClick={skipCurrent}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border border-white/10 text-gray-400 hover:text-gray-200"
              >
                Skip step →
              </button>
            )}
          </div>
        </div>

        {saving && <p className="text-center text-xs text-gray-500 mt-4">Saving session…</p>}
      </div>
    </div>
  )
}

function StepBody({
  step, payload, setPayload, cueWords, newCue, setNewCue, onAddCue,
}: {
  step: FiveAStep
  payload: SessionPayload
  setPayload: React.Dispatch<React.SetStateAction<SessionPayload>>
  cueWords: FlowCueWord[]
  newCue: string
  setNewCue: (v: string) => void
  onAddCue: () => void
}) {
  if (step === 'A1') {
    return (
      <input
        type="text"
        value={payload.identity_statement}
        onChange={e => setPayload(p => ({ ...p, identity_statement: e.target.value }))}
        placeholder="I am ..."
        className="input-field text-center"
      />
    )
  }
  if (step === 'A2') {
    return (
      <input
        type="text"
        value={payload.aim}
        onChange={e => setPayload(p => ({ ...p, aim: e.target.value }))}
        placeholder="One specific goal for this session"
        className="input-field text-center"
      />
    )
  }
  if (step === 'A4') {
    return (
      <div className="space-y-3 text-left">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Cue word</p>
          <div className="flex flex-wrap gap-2">
            {cueWords.map(c => (
              <button
                key={c.id}
                onClick={() => setPayload(p => ({ ...p, cue_word: c.cue_word }))}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  payload.cue_word === c.cue_word
                    ? 'bg-cta/20 border-cta text-cta'
                    : 'border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                {c.cue_word}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newCue}
              onChange={e => setNewCue(e.target.value)}
              placeholder="+ Add new"
              className="input-field text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAddCue() } }}
            />
            <button
              onClick={onAddCue}
              className="px-3 py-2 text-sm rounded-lg border border-cta/30 text-cta hover:bg-cta/10"
            >
              Add
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">External target</p>
          <input
            type="text"
            value={payload.external_target}
            onChange={e => setPayload(p => ({ ...p, external_target: e.target.value }))}
            placeholder="What do your eyes lock to?"
            className="input-field"
          />
        </div>
      </div>
    )
  }
  return null
}

function BreathPulse() {
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-cta/10 animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute inset-4 rounded-full bg-cta/20 animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="relative w-16 h-16 rounded-full bg-cta/40 animate-[pulse_4s_ease-in-out_infinite]" />
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
