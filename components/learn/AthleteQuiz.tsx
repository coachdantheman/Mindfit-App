'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lesson } from '@/types'
import { LOW_NOTE, NEED_LABELS, QUESTION_ORDER, QuizAnswers, RESULTS, SCALE, scoreQuiz } from '@/lib/quiz'

type Stage = 'loading' | 'intro' | 'questions' | 'result'

export default function AthleteQuiz({ lessons }: { lessons: Lesson[] }) {
  const [stage, setStage] = useState<Stage>('loading')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/quiz')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.answers) { setAnswers(data.answers); setStage('result') }
        else setStage('intro')
      })
      .catch(() => setStage('intro'))
  }, [])

  const start = () => { setAnswers({}); setStep(0); setSaveError(''); setStage('questions') }

  const question = QUESTION_ORDER[step]
  const last = step === QUESTION_ORDER.length - 1

  const pick = (value: number) => {
    setAnswers(a => ({ ...a, [question.id]: value }))
    if (!last) setStep(s => s + 1)
  }

  const finish = async () => {
    setSaving(true)
    setSaveError('')
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">Question {step + 1} of {QUESTION_ORDER.length}</p>
            <h3 className="font-semibold text-fg-1 mt-0.5">{question.text}</h3>
          </div>
          <div className="flex gap-1 shrink-0">
            {QUESTION_ORDER.map((q, i) => <span key={q.id} className={`w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-cta' : 'bg-surface-3'}`} />)}
          </div>
        </div>

        <div className="space-y-2">
          {SCALE.map((label, value) => {
            const active = answers[question.id] === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => pick(value)}
                className={`w-full text-left rounded-xl border p-4 transition-colors ${active ? 'border-cta/50 bg-cta/10' : 'border-edge hover:border-fg-4/40'}`}
              >
                <p className={`text-sm font-semibold ${active ? 'text-cta' : 'text-fg-1'}`}>{label}</p>
              </button>
            )
          })}
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

  const { top_need, low } = scoreQuiz(answers)
  const result = RESULTS[top_need]
  const sections = result.actions.map(a => a.section)
  const matched = lessons.filter(l => sections.includes(l.app_section))

  return (
    <div className="space-y-4">
      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono">What you need most</p>
          <h2 className="text-2xl font-bold text-cta mt-1">{NEED_LABELS[top_need]}</h2>
        </div>
        {low && <p className="text-sm text-fg-2 font-semibold">{LOW_NOTE}</p>}
        <p className="text-sm text-fg-2 leading-relaxed">{result.paragraph}</p>
        {saveError && <p className="text-xs text-fg-4">{saveError}</p>}

        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono mb-2">Start here in the app</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {result.actions.map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-surface border border-edge hover:border-cta/40 transition-colors group"
              >
                <span className="text-sm text-fg-2 group-hover:text-fg-1">{a.label}</span>
                <span className="text-cta shrink-0">→</span>
              </Link>
            ))}
          </div>
        </div>

        {matched.length > 0 && (
          <div>
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

      <div className="card p-6">
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
