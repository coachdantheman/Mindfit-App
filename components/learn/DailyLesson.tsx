'use client'
import { useEffect, useMemo, useState } from 'react'
import { DAILY_LESSONS, type DailyLesson as Lesson, type LessonCard } from '@/lib/data/daily-lessons'
import { localDateISO } from '@/lib/dates'
import { haptic } from '@/lib/haptics'

const DAY_MS = 86_400_000

// Same lesson for everyone on a given day, cycling through the library.
export function lessonFor(date: string): Lesson {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
  return DAILY_LESSONS[((day % DAILY_LESSONS.length) + DAILY_LESSONS.length) % DAILY_LESSONS.length]
}

type Done = { lesson_id: string; completed_on: string; score: number }

function streakOf(done: Done[], today: string): number {
  const days = new Set(done.map(d => d.completed_on))
  let n = 0
  const d = new Date(`${today}T00:00:00Z`)
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1)
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1) }
  return n
}

export default function DailyLesson() {
  const today = useMemo(() => localDateISO(), [])
  const lesson = useMemo(() => lessonFor(today), [today])
  const [done, setDone] = useState<Done[]>([])
  const [step, setStep] = useState(-1) // -1 intro, 0..cards-1, cards = quiz, cards+1 = result
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null])
  const [qIdx, setQIdx] = useState(0)

  useEffect(() => {
    fetch('/api/learn/daily').then(r => (r.ok ? r.json() : [])).then(d => { if (Array.isArray(d)) setDone(d) }).catch(() => {})
  }, [])

  const todayDone = done.find(d => d.lesson_id === lesson.id && d.completed_on === today)
  const streak = streakOf(done, today)
  const quizStep = lesson.cards.length
  const score = answers.filter((a, i) => a === lesson.quiz[i].answer).length

  const finish = () => {
    haptic.success()
    setStep(quizStep + 1)
    const row = { lesson_id: lesson.id, completed_on: today, score }
    setDone(prev => [row, ...prev.filter(d => !(d.lesson_id === row.lesson_id && d.completed_on === row.completed_on))])
    fetch('/api/learn/daily', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lesson.id, date: today, score }),
    }).catch(() => {})
  }

  const restart = () => { setStep(0); setAnswers([null, null, null]); setQIdx(0) }

  return (
    <div className="card p-5 sm:p-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-[11px] uppercase tracking-[0.2em] text-cta">Today&apos;s lesson · {lesson.topic}</span>
        <span className="text-xs text-fg-4 tabular-nums">{streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : `${lesson.minutes} min`}</span>
      </div>

      {step === -1 && (
        <div>
          <h2 className="text-2xl font-semibold text-fg-1 leading-tight">{lesson.title}</h2>
          <p className="text-sm text-fg-3 mt-2">{lesson.cards.length} quick cards, then a 3-question quiz. About {lesson.minutes} minutes.</p>
          {todayDone ? (
            <div className="mt-5 rounded-xl border border-cta/40 bg-cta/10 p-4">
              <p className="text-sm font-semibold text-cta">Done today · {todayDone.score}/3 on the quiz</p>
              <p className="text-sm text-fg-2 mt-1">{lesson.takeaway}</p>
              <button type="button" onClick={restart} className="btn-ghost mt-2 !px-0">Take it again</button>
            </div>
          ) : (
            <button type="button" onClick={() => setStep(0)} className="btn-primary mt-5">Start lesson</button>
          )}
          <p className="text-xs text-fg-4 mt-4">A new lesson every day: sport psychology, psychology, fitness and sports history.</p>
        </div>
      )}

      {step >= 0 && step < quizStep && (
        <div>
          <Progress total={quizStep + 1} at={step} />
          <Card card={lesson.cards[step]} key={`${lesson.id}-${step}`} />
          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(s => s - 1)} className="btn-ghost">Back</button>
            <button type="button" onClick={() => { haptic.tap(); setStep(s => s + 1) }} className="btn-primary">
              {step === quizStep - 1 ? 'Quiz time' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === quizStep && (
        <div>
          <Progress total={quizStep + 1} at={step} />
          <p className="text-xs uppercase tracking-[0.18em] text-fg-4">Question {qIdx + 1} of 3</p>
          <p className="text-lg font-semibold text-fg-1 mt-1">{lesson.quiz[qIdx].q}</p>
          <div className="mt-4 space-y-2">
            {lesson.quiz[qIdx].options.map((o, i) => {
              const picked = answers[qIdx]
              const isRight = i === lesson.quiz[qIdx].answer
              const tone = picked == null ? 'border-edge hover:border-cta/50' : isRight ? 'border-green-500/60 bg-green-500/10' : picked === i ? 'border-red-400/60 bg-red-400/10' : 'border-edge opacity-60'
              return (
                <button key={i} type="button" disabled={picked != null}
                  onClick={() => { haptic.tap(); setAnswers(a => a.map((v, j) => (j === qIdx ? i : v))) }}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm text-fg-2 transition-colors ${tone}`}>
                  {o}
                </button>
              )
            })}
          </div>
          {answers[qIdx] != null && (
            <>
              <p className={`text-sm mt-3 ${answers[qIdx] === lesson.quiz[qIdx].answer ? 'text-green-400' : 'text-fg-3'}`}>
                {answers[qIdx] === lesson.quiz[qIdx].answer ? 'Correct. ' : 'Not quite. '}{lesson.quiz[qIdx].explain}
              </p>
              <div className="flex justify-end mt-4">
                {qIdx < 2
                  ? <button type="button" onClick={() => setQIdx(q => q + 1)} className="btn-primary">Next question</button>
                  : <button type="button" onClick={finish} className="btn-primary">See my result</button>}
              </div>
            </>
          )}
        </div>
      )}

      {step === quizStep + 1 && (
        <div className="text-center py-2">
          <p className="text-5xl font-light text-cta tabular-nums">{score}/3</p>
          <p className="font-semibold text-fg-1 mt-2">{score === 3 ? 'Perfect. You own this one.' : score === 2 ? 'Strong work.' : 'Good rep. Come back to it.'}</p>
          <div className="mt-4 rounded-xl border border-cta/30 bg-cta/[0.06] p-4 text-left">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cta">Use it today</p>
            <p className="text-sm text-fg-2 mt-1">{lesson.takeaway}</p>
          </div>
          <p className="text-xs text-fg-4 mt-4">New lesson tomorrow. {streak > 0 ? `Lesson streak: ${streak} day${streak === 1 ? '' : 's'}.` : ''}</p>
          <button type="button" onClick={() => setStep(-1)} className="btn-ghost mt-2">Done</button>
        </div>
      )}
    </div>
  )
}

function Progress({ total, at }: { total: number; at: number }) {
  return (
    <div className="flex gap-1 mb-5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full ${i < at ? 'bg-cta' : i === at ? 'bg-cta/60' : 'bg-surface-3/60'}`} />
      ))}
    </div>
  )
}

function Card({ card }: { card: LessonCard }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  if (card.kind === 'text') {
    return (
      <div className="animate-[mf-fade-in_0.3s_ease-out]">
        <h3 className="text-xl font-semibold text-fg-1">{card.heading}</h3>
        <p className="text-[15px] text-fg-2 leading-relaxed mt-2">{card.body}</p>
      </div>
    )
  }
  if (card.kind === 'reveal') {
    return (
      <div className="animate-[mf-fade-in_0.3s_ease-out]">
        <p className="text-lg font-semibold text-fg-1">{card.prompt}</p>
        {open ? (
          <p className="mt-3 rounded-xl border border-cta/40 bg-cta/10 p-4 text-[15px] text-fg-2 leading-relaxed">{card.answer}</p>
        ) : (
          <button type="button" onClick={() => { haptic.tap(); setOpen(true) }} className="btn-secondary mt-4 w-full">Tap to reveal</button>
        )}
      </div>
    )
  }
  return (
    <div className="animate-[mf-fade-in_0.3s_ease-out]">
      <p className="text-lg font-semibold text-fg-1">{card.prompt}</p>
      <div className="mt-3 space-y-2">
        {card.options.map((o, i) => (
          <button key={i} type="button" disabled={pick != null} onClick={() => { haptic.tap(); setPick(i) }}
            className={`w-full text-left rounded-xl border px-4 py-3 text-sm text-fg-2 ${
              pick == null ? 'border-edge hover:border-cta/50' : i === card.answer ? 'border-green-500/60 bg-green-500/10' : pick === i ? 'border-red-400/60 bg-red-400/10' : 'border-edge opacity-60'
            }`}>
            {o}
          </button>
        ))}
      </div>
      {pick != null && <p className="text-sm text-fg-3 mt-3">{card.explain}</p>}
    </div>
  )
}
