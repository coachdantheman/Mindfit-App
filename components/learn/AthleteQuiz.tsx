'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Lesson } from '@/types'
import { LOW_NOTE, MAX_ANSWER, NEED_LABELS, NEEDS, Need, NeedScores, QUESTION_ORDER, QuizAnswers, RESULTS, SCALE, scoreQuiz } from '@/lib/quiz'

type Stage = 'loading' | 'intro' | 'questions' | 'result'

// Two questions per need, each answered 0 to MAX_ANSWER.
const NEED_MAX = 2 * MAX_ANSWER

interface SavedAttempt {
  answers: QuizAnswers
  previous?: { answers: QuizAnswers } | null
}

export default function AthleteQuiz({ lessons }: { lessons: Lesson[] }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [prior, setPrior] = useState<NeedScores | null>(null)
  const shownScores = useRef<NeedScores | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/quiz')
      .then(r => (r.ok ? r.json() : null))
      .then((data: SavedAttempt | null) => {
        if (data?.answers) {
          setAnswers(data.answers)
          shownScores.current = scoreQuiz(data.answers).scores
          setPrior(data.previous?.answers ? scoreQuiz(data.previous.answers).scores : null)
          setStage('result')
        }
        else setStage('intro')
      })
      .catch(() => setStage('intro'))
  }, [])

  const start = () => { setAnswers({}); setStep(0); setSaveError(''); setStage('questions') }

  const question = QUESTION_ORDER[step]
  const last = step === QUESTION_ORDER.length - 1

  const pick = (value: number) => {
    try { navigator.vibrate?.(8) } catch {}
    setAnswers(a => ({ ...a, [question.id]: value }))
    if (!last) setStep(s => s + 1)
  }

  const finish = async () => {
    setSaving(true)
    setSaveError('')
    if (shownScores.current) setPrior(shownScores.current)
    shownScores.current = scoreQuiz(answers).scores
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) setSaveError("Your result couldn't be saved. It's shown below, but won't be here next time.")
    } catch {
      setSaveError("Your result couldn't be saved. It's shown below, but won't be here next time.")
    } finally {
      setSaving(false)
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
    const answered = answers[question.id] !== undefined
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
          <button type="button" onClick={() => step === 0 ? setStage('intro') : setStep(s => s - 1)} className="btn-ghost">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {last ? (
            <button type="button" onClick={finish} disabled={!answered || saving} className="btn-primary">
              {saving ? 'Saving…' : 'See my result'}
            </button>
          ) : (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!answered} className="btn-primary">Next</button>
          )}
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
            <h3 className="font-semibold text-fg-1">Your next 7 days</h3>
            <p className="text-sm text-fg-3 mt-0.5">Do these three every day this week, then retake the quiz.</p>
          </div>
          <div className="space-y-2">
            {result.actions.map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-surface border border-edge hover:border-cta/40 transition-colors group"
              >
                <span className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full border border-edge shrink-0" />
                  <span className="text-sm text-fg-2 group-hover:text-fg-1">{a.label}</span>
                </span>
                <span className="text-cta shrink-0">→</span>
              </Link>
            ))}
          </div>
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
