'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import WeeklyAssessment from '@/components/mindset/WeeklyAssessment'
import { mpiVerdict } from '@/lib/mpi'
import { ACTIONS } from '@/lib/leaderboard-config'
import { clearPendingTeamCode, joinTeam, readPendingTeamCode } from '@/lib/team-code'

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
  const [teamCode, setTeamCode] = useState('')
  const [teamError, setTeamError] = useState('')
  const [teamNames, setTeamNames] = useState<string[]>([])
  const [joining, setJoining] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')

  useEffect(() => { setTeamCode(readPendingTeamCode() ?? '') }, [])

  // Athletes on more than one team add each code; the field clears after a join.
  const addTeam = async (): Promise<boolean> => {
    if (!teamCode) return true
    setTeamError('')
    setJoining(true)
    const r = await joinTeam(teamCode)
    setJoining(false)
    if (!r.ok) { setTeamError(r.error); return false }
    clearPendingTeamCode()
    setTeamNames(n => n.includes(r.teamName) ? n : [...n, r.teamName])
    setTeamCode('')
    return true
  }

  const startAssessment = async () => {
    setSaving(true)
    if (!(await addTeam())) { setSaving(false); return }
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

  const completeOnboarding = async () => {
    setCompleting(true)
    setCompleteError('')
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: name.trim() || undefined }),
    }).catch(() => null)
    setCompleting(false)
    if (res?.ok) setCompleted(true)
    else setCompleteError("Couldn't finish setup. Check your connection and try again.")
  }

  const handleAssessmentDone = async (score: number) => {
    setMpi(score)
    setStep('result')
    await completeOnboarding()
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
            mental game: your Mental Performance Index (MPI). Every week of training gets
            measured against today.
          </p>

          <label htmlFor="onboarding-name" className="block text-sm font-medium text-fg-2 mb-2">What&rsquo;s your name?</label>
          <input
            id="onboarding-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={120}
            className="w-full border border-edge rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500 bg-surface-2 text-fg-1 placeholder:text-fg-4 mb-6"
            placeholder="First and last name"
          />

          <p id="onboarding-sport-label" className="block text-sm font-medium text-fg-2 mb-2">What&rsquo;s your primary sport?</p>
          <div className="flex flex-wrap gap-2 mb-8" role="group" aria-labelledby="onboarding-sport-label">
            {SPORTS.map(s => (
              <button
                key={s}
                type="button"
                aria-pressed={sport === s}
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

          <label htmlFor="onboarding-team" className="block text-sm font-medium text-fg-2 mb-2">
            Team code <span className="text-fg-4 font-normal">(optional, from your coach)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="onboarding-team"
              value={teamCode}
              onChange={e => { setTeamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setTeamError('') }}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC123"
              className="flex-1 border border-edge rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:ring-2 focus:ring-brand-500 bg-surface-2 text-fg-1 placeholder:text-fg-4"
            />
            <button type="button" onClick={addTeam} disabled={joining || teamCode.length !== 6} className="btn-secondary px-4 shrink-0">
              {joining ? 'Joining…' : 'Join'}
            </button>
          </div>
          {teamError && <p role="alert" className="text-sm text-red-400 mb-2">{teamError}</p>}
          {teamNames.length > 0 && (
            <p role="status" className="text-sm text-green-400 mb-2">
              You joined {teamNames.join(', ')}. On another team too? Enter that code.
            </p>
          )}
          <div className="mb-6" />

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
          <div className="rounded-xl border border-cta/30 bg-cta/5 p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-fg-1">
              You&rsquo;re on The Board: +{ACTIONS.find(a => a.key === 'baseline')?.points ?? 0} pts
            </p>
            <p className="text-xs text-fg-3 mt-0.5">
              Your first MPI just put you on the monthly leaderboard{teamNames.length ? ` with ${teamNames.join(' and ')}` : ''}. Show up every day to climb it.
            </p>
          </div>
          {completeError && (
            <div className="mb-4">
              <p role="alert" className="text-sm text-red-400 mb-2">{completeError}</p>
              <button type="button" onClick={completeOnboarding} disabled={completing} className="btn-secondary w-full">
                {completing ? 'Trying again…' : 'Try again'}
              </button>
            </div>
          )}
          <button
            onClick={finish}
            disabled={!completed}
            className="w-full bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-3 rounded-xl transition-colors disabled:opacity-60"
          >
            {completing && !completeError ? 'Finishing setup…' : 'Start Training →'}
          </button>
          <button
            type="button"
            onClick={() => { router.push('/leaderboard'); router.refresh() }}
            disabled={!completed}
            className="w-full mt-2 text-sm text-cta py-2 disabled:opacity-50"
          >
            See The Board
          </button>
        </div>
      )}
    </div>
  )
}
