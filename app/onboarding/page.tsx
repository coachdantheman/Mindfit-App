'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WeeklyAssessment from '@/components/mindset/WeeklyAssessment'
import { mpiVerdict } from '@/lib/mpi'

const SPORTS = [
  'Basketball', 'Football', 'Soccer', 'Baseball', 'Softball', 'Volleyball',
  'Track & Field', 'Cross Country', 'Swimming', 'Tennis', 'Golf', 'Wrestling',
  'Lacrosse', 'Hockey', 'Gymnastics', 'Cheer', 'Other',
]

type Step = 'welcome' | 'assessment' | 'result'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [saving, setSaving] = useState(false)
  const [mpi, setMpi] = useState<number | null>(null)

  const startAssessment = async () => {
    setSaving(true)
    if (sport) {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_sport: sport }),
      }).catch(() => {})
    }
    setSaving(false)
    setStep('assessment')
  }

  const handleAssessmentDone = async (score: number) => {
    setMpi(score)
    setStep('result')
    await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.trim() || undefined }),
    }).catch(() => {})
  }

  const finish = () => {
    router.push('/mindset')
    router.refresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      {step === 'welcome' && (
        <div className="bg-surface rounded-2xl border border-edge p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-cta mb-3">Welcome to MindFit</p>
          <h1 className="text-2xl font-bold text-fg-1 mb-3">
            Peak performance is an identity achievement.
          </h1>
          <p className="text-fg-3 text-sm leading-relaxed mb-8">
            Before you start training your mind, we&rsquo;ll take a 2-minute baseline of your
            mental game — your Mental Performance Index (MPI). Every week of training gets
            measured against today.
          </p>

          <label className="block text-sm font-medium text-fg-2 mb-2">What&rsquo;s your name?</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={120}
            className="w-full border border-edge rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface-2 text-fg-1 placeholder:text-fg-4 mb-6"
            placeholder="First and last name"
          />

          <label className="block text-sm font-medium text-fg-2 mb-2">What&rsquo;s your primary sport?</label>
          <div className="flex flex-wrap gap-2 mb-8">
            {SPORTS.map(s => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  sport === s
                    ? 'bg-cta text-fg-inverse border-cta font-semibold'
                    : 'border-edge text-fg-3 hover:border-fg-4/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={startAssessment}
            disabled={saving}
            className="w-full bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'One moment…' : 'Start My Baseline →'}
          </button>
        </div>
      )}

      {step === 'assessment' && (
        <WeeklyAssessment mode="baseline" onComplete={handleAssessmentDone} />
      )}

      {step === 'result' && mpi !== null && (
        <div className="bg-surface rounded-2xl border border-edge p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-4 mb-6">
            Your Mental Performance Index
          </p>
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-muted)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="var(--flow-flow)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(mpi / 100) * 276.5} 276.5`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-cta">{mpi}</span>
              <span className="text-xs text-fg-4">/ 100</span>
            </div>
          </div>
          <p className="text-fg-2 font-medium mb-2">{mpiVerdict(mpi)}</p>
          <p className="text-sm text-fg-4 mb-8">
            This is your starting point. The journal, flow training, and weekly
            assessments in here are how you move it.
          </p>
          <button
            onClick={finish}
            className="w-full bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-3 rounded-xl transition-colors"
          >
            Start Training →
          </button>
        </div>
      )}
    </div>
  )
}
