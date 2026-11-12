'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Lesson } from '@/types'
import { LOW_NOTE, MAX_ANSWER, NEED_LABELS, NEEDS, Need, NeedScores, QUESTION_ORDER, QuizAnswers, RESULTS, SCALE, scoreQuiz } from '@/lib/quiz'
import { STARTER_PLANS } from '@/lib/data/starter-plans'
import { localDateISO } from '@/lib/dates'

type Stage = 'loading' | 'intro' | 'questions' | 'result'

// Two questions per need, each answered 0 to MAX_ANSWER.
const NEED_MAX = 2 * MAX_ANSWER

interface SavedAttempt {
  answers: QuizAnswers
  created_at?: string
  previous?: { answers: QuizAnswers } | null
}

// Day 1 is the result's own day. Clamped to the 7-day plan.
function planDay(resultAt: string): number {
  const [sy, sm, sd] = localDateISO(new Date(resultAt)).split('-').map(Number)
  const [ty, tm, td] = localDateISO().split('-').map(Number)
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd)) / 86_400_000)
  return Math.min(7, Math.max(1, diff + 1))
}

export default function AthleteQuiz({ lessons }: { lessons: Lesson[] }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [prior, setPrior] = useState<NeedScores | null>(null)
  const [resultAt, setResultAt] = useState(() => new Date().toISOString())
  const shownScores = useRef<NeedScores | null>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/quiz')
      .then(r => (r.ok ? r.json() : null))
      .then((data: SavedAttempt | null) => {
        if (data?.answers) {
          setAnswers(data.answers)
          if (data.created_at) setResultAt(data.created_at)
          shownScores.current = scoreQuiz(data.answers).scores
          setPrior(data.previous?.answers ? scoreQuiz(data.previous.answers).scores : null)
          setStage('result')
        }
        else setStage('intro')
      })
      .catch(() => setStage('intro'))
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current) }
  }, [])

  const cancelAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    advanceTimer.current = null
  }

  const start = () => { cancelAdvance(); setAnswers({}); setStep(0); setSaveError(''); setStage('questions') }

  const question = QUESTION_ORDER[step]
  const last = step === QUESTION_ORDER.length - 1

  // Picking an answer moves on after a short beat; the last one shows the result.
  const pick = (value: number) => {
    if (saving) return
    try { navigator.vibrate?.(8) } catch {}
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    cancelAdvance()
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null
      if (last) finish(next)
      else setStep(s => s + 1)
    }, 250)
  }

  const finish = async (final: QuizAnswers) => {
    setSaving(true)
    setSaveError('')
    if (shownScores.current) setPrior(shownScores.current)
    shownScores.current = scoreQuiz(final).scores
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: final }),
      })
      if (!res.ok) setSaveError("Your result couldn't be saved. It's shown below, but won't be here next time.")
    } catch {
      setSaveError("Your result couldn't be saved. It's shown below, but won't be here next time.")
    } finally {
      setSaving(false)
      setResultAt(new Date().toISOString())
      setStage('result')
    }
  }

  if (stage === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-cta/30 border-t-cta rounded-full animate-spin" />
      </div>
    )
  }

  if (stage === 'intro') {
    return (
      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Athlete Quiz</p>
          <h2 className="text-lg font-semibold text-fg-1 mt-0.5">What do you need most?</h2>
        </div>
        <p className="text-sm text-fg-3">
          Ten questions, about two minutes. Answer for how you actually compete, not how you want to compete. At the end you&apos;ll see the one area to train first.
        </p>
        <button type="button" onClick={start} className="btn-primary">Start the quiz</button>
      </div>
    )
  }

  if (stage === 'questions') {
    return (
      <div className="card p-5 space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Question {step + 1} of {QUESTION_ORDER.length}</p>
          <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-cta rounded-full transition-[width] duration-500"
              style={{ width: `${((step + 1) / QUESTION_ORDER.length) * 100}%` }}
            />
          </div>
        </div>

        <div key={step} className="mf-rise space-y-5">
          <h3 className="font-semibold text-fg-1">{question.text}</h3>
          <div className="space-y-2">
            {SCALE.map((label, value) => {
              const active = answers[question.id] === value
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pick(value)}
                  aria-pressed={active}
                  className={`w-full flex items-center justify-between gap-3 text-left rounded-xl border p-4 transition-colors ${active ? 'border-cta/50 bg-cta/10' : 'border-edge hover:border-fg-4/40'}`}
                >
                  <span className={`text-sm font-semibold ${active ? 'text-cta' : 'text-fg-1'}`}>{label}</span>
                  <span className={`w-4 h-4 rounded-full border shrink-0 ${active ? 'border-cta bg-cta' : 'border-edge'}`} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { cancelAdvance(); if (step === 0) setStage('intro'); else setStep(s => s - 1) }}
            className="btn-ghost"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {saving && <span className="text-xs text-fg-4">Saving…</span>}
        </div>
      </div>
    )
  }

  const { scores, top_need, low } = scoreQuiz(answers)
  const result = RESULTS[top_need]
  const sections = result.actions.map(a => a.section)
  const matched = lessons.filter(l => sections.includes(l.app_section))
  // Higher need score = more need. So a drop from prior is an improvement.
  const ranked = [...NEEDS].sort((a, b) => scores[b] - scores[a])
  const changes = prior ? NEEDS.filter(n => scores[n] !== prior[n]).map(n => ({ n, before: prior[n], now: scores[n] })) : []

  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">What you need most</p>
          <h2 className="text-2xl font-bold text-cta mt-1">{NEED_LABELS[top_need]}</h2>
        </div>
        {low && <p className="text-sm text-fg-2 font-semibold">{LOW_NOTE}</p>}
        <p className="text-sm text-fg-2 leading-relaxed">{result.paragraph}</p>
        {saveError && <p className="text-xs text-fg-4">{saveError}</p>}

        <div className="grid sm:grid-cols-[200px_1fr] gap-5 items-center">
          <NeedRadar scores={scores} prior={prior} max={NEED_MAX} />
          <div className="rounded-xl border border-cta/30 bg-cta/[0.06] p-4">
            <p className="text-xs uppercase tracking-wider text-cta font-mono">Your strength</p>
            <p className="font-semibold text-fg-1 mt-1">{NEED_LABELS[ranked[ranked.length - 1]]}</p>
            <p className="text-sm text-fg-3 mt-1">This is the area you already handle best. Lean on it while you train {NEED_LABELS[top_need].toLowerCase()}.</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">All five needs</p>
          {ranked.map(n => (
            <NeedBar key={n} label={NEED_LABELS[n]} value={scores[n]} max={NEED_MAX} top={n === top_need} />
          ))}
        </div>

        {changes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Since last time</p>
            {changes.map(c => {
              const improved = c.now < c.before
              return (
                <p key={c.n} className="text-sm text-fg-2">
                  {NEED_LABELS[c.n]} {c.before} → {c.now}{' '}
                  <span className={improved ? 'text-green-400' : 'text-yellow-400'}>{improved ? 'improved' : 'needs more work'}</span>
                </p>
              )
            })}
          </div>
        )}

        <div className="rounded-2xl border border-edge p-4 space-y-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Your 7-day starter plan</p>
            <p className="text-sm text-fg-2 font-semibold mt-1">{STARTER_PLANS[top_need].headline}</p>
          </div>
          <ol className="space-y-2">
            {STARTER_PLANS[top_need].days.map(d => {
              const isToday = d.day === planDay(resultAt)
              return (
                <li
                  key={d.day}
                  aria-current={isToday ? 'date' : undefined}
                  className={`rounded-xl border p-3.5 ${isToday ? 'border-cta/50 bg-cta/10' : 'border-edge bg-surface'}`}
                >
                  <p className={`text-xs font-mono uppercase tracking-wider ${isToday ? 'text-cta' : 'text-fg-4'}`}>
                    Day {d.day}{isToday ? ' · Today' : ''}
                  </p>
                  <p className="text-sm font-semibold text-fg-1 mt-1">{d.title}</p>
                  <p className="text-sm text-fg-3 mt-0.5">{d.task}</p>
                  <Link
                    href={d.href}
                    className="inline-flex mt-2.5 text-xs font-semibold text-cta border border-cta/40 rounded-lg px-3 py-1.5 hover:bg-cta/10 transition-colors"
                  >
                    {d.cta}
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>

        {matched.length > 0 && (
          <div className="web-only">
            <p className="text-xs uppercase tracking-wider text-fg-4 font-mono mb-2">Lessons for this</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {matched.map(lesson => (
                <a
                  key={lesson.id}
                  href={lesson.skool_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-surface border border-edge hover:border-cta/40 transition-colors group"
                >
                  <span className="text-sm text-fg-2 group-hover:text-fg-1 truncate">{lesson.title}</span>
                  <span className="text-cta shrink-0">→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="native-only">
        <button type="button" onClick={start} className="btn-ghost">Retake quiz</button>
      </div>
      <div className="web-only card p-6">
        <p className="text-sm text-fg-2 mb-1 font-semibold">Want a coach on this?</p>
        <p className="text-sm text-fg-3 mb-4">The full MindFit course and weekly group coaching live in the Locker Room on Skool.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://www.skool.com/mindfit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-cta text-fg-inverse font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Join the Locker Room →
          </a>
          <button type="button" onClick={start} className="btn-ghost">Retake quiz</button>
        </div>
      </div>
    </div>
  )
}

function NeedBar({ label, value, max, top }: { label: string; value: number; max: number; top: boolean }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={top ? 'font-semibold text-fg-1' : 'text-fg-3'}>{label}</span>
        <span className="text-xs text-fg-4 tabular-nums">{value} / {max}</span>
      </div>
      <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${top ? 'bg-cta' : 'bg-fg-4/50'}`}
          style={{ width: `${ready ? (value / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

// Pentagon profile: the further out a point, the bigger that need. The faint
// outline is the last attempt, so change is visible at a glance.
function NeedRadar({ scores, prior, max }: { scores: NeedScores; prior: NeedScores | null; max: number }) {
  const cx = 100, cy = 100, R = 72
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / NEEDS.length
    const r = R * (0.12 + 0.88 * (v / max))
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }
  const ring = (f: number) => NEEDS.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / NEEDS.length
    return `${cx + R * f * Math.cos(a)},${cy + R * f * Math.sin(a)}`
  }).join(' ')
  const short: Record<Need, string> = { confidence: 'Confidence', focus: 'Focus', pressure: 'Pressure', motivation: 'Motivation', recovery: 'Recovery' }
  return (
    <svg viewBox="0 0 200 200" className="w-[200px] h-[200px] mx-auto" role="img" aria-label="Your five needs as a profile chart">
      {[0.33, 0.66, 1].map(f => <polygon key={f} points={ring(f)} fill="none" stroke="var(--border-muted)" strokeWidth="1" />)}
      {prior && <polygon points={NEEDS.map((n, i) => pt(i, prior[n])).join(' ')} fill="none" stroke="rgb(var(--cta-rgb) / 0.35)" strokeDasharray="3 3" strokeWidth="1.2" />}
      <polygon points={NEEDS.map((n, i) => pt(i, scores[n])).join(' ')} fill="rgb(var(--cta-rgb) / 0.18)" stroke="rgb(var(--cta-rgb))" strokeWidth="1.6" strokeLinejoin="round" />
      {NEEDS.map((n, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / NEEDS.length
        return (
          <text key={n} x={cx + (R + 16) * Math.cos(a)} y={cy + (R + 16) * Math.sin(a) + 3} textAnchor="middle" fontSize="9" fill="currentColor" className="text-fg-4">
            {short[n]}
          </text>
        )
      })}
    </svg>
  )
}
