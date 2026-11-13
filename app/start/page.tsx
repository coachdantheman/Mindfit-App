'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { isUnder13, validBirth } from '@/lib/age'
import { MPI_DIMENSIONS, calcMPI, mpiVerdict, type MpiKey } from '@/lib/mpi'
import { localDateISO } from '@/lib/dates'
import { EMPTY_DRAFT, clearDraft, draftComplete, edgeAndGap, readDraft, saveDraft, type OnboardingDraft } from '@/lib/onboarding-draft'
import { clearPendingTeamCode, joinTeam, readPendingTeamCode } from '@/lib/team-code'
import Typewriter from '@/components/onboarding/Typewriter'
import CodeInput from '@/components/onboarding/CodeInput'
import GuideChoice from '@/components/guide/GuideChoice'

const SPORTS = [
  'Basketball', 'Football', 'Soccer', 'Baseball', 'Softball', 'Volleyball',
  'Track & Field', 'Cross Country', 'Swimming', 'Tennis', 'Golf', 'Wrestling',
  'Lacrosse', 'Hockey', 'Gymnastics', 'Cheer', 'Other',
]
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Drafted from the abstracts; Daniel approves the wording before release.
const PROOF = [
  { head: 'Mental skills training improves performance.', body: 'Across controlled trials, athletes who trained their mental game performed better than those who didn’t.', cite: 'Brown & Fletcher, 2017 · Sports Medicine' },
  { head: 'Picturing a skill helps you perform it.', body: 'Imagery training improved performance and motivation, and works best alongside physical practice.', cite: 'Simonsmeier et al., 2021 · Int. Review of Sport & Exercise Psychology' },
  { head: 'Confident athletes tend to perform better.', body: 'Belief in your own skills is consistently linked with how well you perform.', cite: 'Moritz et al., 2000 · Research Quarterly for Exercise & Sport' },
]

// Onboarding asks 1–5; each answer is saved doubled (2–10) so the baseline
// sits on the same 1–10 scale as weekly check-ins and calcMPI stays /100.
const SCALE = ['Struggling', 'Shaky', 'Okay', 'Strong', 'Locked in']

const INTRO = ['Every athlete plays two games.', 'The one on the field.', 'And the one in their head.']

type Step = 'intro' | 'name' | 'sport' | 'age' | 'young' | 'proof' | 'mpi' | 'score' | 'account' | 'code' | 'saving' | 'done' | 'guide'
const PROGRESS: Partial<Record<Step, number>> = { name: 1, sport: 2, age: 3, proof: 4, mpi: 5, score: 15 }
const TOTAL = 15

function mondayISO(d = new Date()): string {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  return localDateISO(date)
}

export default function StartPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<Step>('intro')
  const [d, setD] = useState<OnboardingDraft>(EMPTY_DRAFT)
  const [q, setQ] = useState(0)
  const [introDone, setIntroDone] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [code, setCode] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [teamMsg, setTeamMsg] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    const saved = readDraft()
    // Signed in already: either back from the email's sign-in button with
    // answers waiting on this device (save them), or an existing account.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      if (draftComplete(saved)) { setStep('saving'); saveOnboarding(saved) }
      else router.replace('/')
    })
    if (saved) setD(saved)
    if (draftComplete(saved)) setStep('score')
    setTeamCode(readPendingTeamCode() ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const update = (patch: Partial<OnboardingDraft>) => {
    setD(prev => { const next = { ...prev, ...patch }; saveDraft(next); return next })
  }
  const go = (s: Step) => { setError(''); setStep(s); window.scrollTo(0, 0) }
  const first = d.name.trim().split(/\s+/)[0] || 'Athlete'

  const back = () => {
    if (step === 'mpi' && q > 0) return setQ(q - 1)
    const order: Step[] = ['intro', 'name', 'sport', 'age', 'proof', 'mpi', 'score', 'account']
    const i = order.indexOf(step)
    if (step === 'proof' || step === 'young') return go('age')
    if (step === 'code') return go('account')
    if (i > 0) go(order[i - 1])
  }

  const submitAge = () => {
    const birth = validBirth(d.birthYear, d.birthMonth)
    if (!birth) return setError('Pick your birth month and year.')
    if (isUnder13({ birth_year: birth.year, birth_month: birth.month })) {
      clearDraft()
      setD(EMPTY_DRAFT)
      return go('young')
    }
    go('proof')
  }

  const rate = (key: MpiKey, v: number) => {
    update({ scores: { ...d.scores, [key]: v } })
    setTimeout(() => {
      if (q < MPI_DIMENSIONS.length - 1) setQ(q + 1)
      else go('score')
    }, 220)
  }

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8 || password.length > 72) return setError('Your password needs at least 8 characters.')
    if (!agreed) return setError('Please accept the Terms and Privacy Policy to continue.')
    setBusy(true)
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, termsAccepted: true, next: '/start' }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(data.error || 'Could not create your account. Try again.')
    setCode('')
    setResendIn(30)
    go('code')
  }

  const resend = async () => {
    setError('')
    const res = await fetch('/api/auth/otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    if (!res.ok) { const data = await res.json().catch(() => ({})); return setError(data.error || 'Could not resend. Try again.') }
    setResendIn(30)
  }

  const verify = async (token: string) => {
    setError('')
    setBusy(true)
    const { error: vErr } = await supabase.auth.verifyOtp({ email: email.toLowerCase().trim(), token, type: 'email' })
    if (vErr) { setBusy(false); setCode(''); return setError('That code didn’t work. Check it or send a new one.') }
    const { error: pwErr } = await supabase.auth.updateUser({ password })
    if (pwErr) console.error('Password not saved:', pwErr.message)
    try { localStorage.setItem('mf_last_email', email.toLowerCase().trim()) } catch {}
    await saveOnboarding(d)
  }

  const saveOnboarding = async (draft: OnboardingDraft) => {
    setBusy(true)
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft.name.trim(), sport: draft.sport, year: draft.birthYear, month: draft.birthMonth, scores: draft.scores, week_date: mondayISO() }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (data.status === 'too_young') {
      await supabase.auth.signOut().catch(() => {})
      clearDraft()
      return go('young')
    }
    clearDraft()
    if (!res.ok || data.status === 'existing') { router.push('/'); router.refresh(); return }
    go('done')
  }

  const finish = async () => {
    if (teamCode.length === 6) {
      setBusy(true)
      const r = await joinTeam(teamCode)
      setBusy(false)
      if (!r.ok) return setTeamMsg(r.error)
      clearPendingTeamCode()
    }
    const parent = parentEmail.trim()
    if (isTeen && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parent)) {
      try {
        await fetch('/api/me/links', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'parent', email: parent }),
        })
      } catch {}
    }
    go('guide')
  }

  const isTeen = d.birthYear != null && d.birthMonth != null && !isUnder13({ birth_year: d.birthYear, birth_month: d.birthMonth })
  const mpi = calcMPI(d.scores)
  const { edge, gap } = edgeAndGap(d.scores)
  const progress = step === 'mpi' ? PROGRESS.mpi! + q : PROGRESS[step]

  return (
    <div className="min-h-[100dvh] bg-page flex flex-col pt-safe pb-safe">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgb(var(--cta-rgb)/0.10),transparent_60%)]" />

      {progress != null && (
        <div className="relative w-full max-w-md mx-auto px-5 pt-4 flex items-center gap-4">
          <button type="button" onClick={back} aria-label="Back" className="h-10 w-10 -ml-2 grid place-items-center rounded-full text-fg-3 hover:text-fg-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="flex-1 h-[3px] rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={progress}>
            <div className="h-full bg-cta rounded-full transition-[width] duration-500 ease-out" style={{ width: `${(progress / TOTAL) * 100}%` }} />
          </div>
        </div>
      )}

      <main key={step === 'mpi' ? `mpi-${q}` : step} className="relative flex-1 w-full max-w-md mx-auto px-6 flex flex-col mf-rise">

        {step === 'intro' && (
          <>
            <div className="flex-1 flex flex-col justify-center py-10">
              <Typewriter lines={INTRO} onDone={() => setIntroDone(true)} />
              <p className={`mt-8 text-sm text-fg-3 transition-opacity duration-700 ${introDone ? 'opacity-100' : 'opacity-0'}`}>
                MindFit trains the second one. Free, forever.
              </p>
            </div>
            <div className={`pb-8 space-y-4 transition-opacity duration-700 ${introDone ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-center font-display tracking-[0.4em] text-cta text-sm">MINDFIT</p>
              <button type="button" onClick={() => go('name')} className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors">
                Begin
              </button>
              <Link href="/login" className="block text-center text-sm text-fg-3 hover:text-fg-1 py-2">I already have an account</Link>
            </div>
          </>
        )}

        {step === 'name' && (
          <form className="flex-1 flex flex-col" onSubmit={e => { e.preventDefault(); if (d.name.trim()) go('sport') }}>
            <Question title="What should we call you?" sub="Your first name is perfect." />
            <input
              id="start-name"
              autoFocus
              autoComplete="given-name"
              value={d.name}
              maxLength={60}
              onChange={e => update({ name: e.target.value })}
              placeholder="First name"
              className="input-field h-14 text-lg text-center"
            />
            <div className="flex-1" />
            <Primary disabled={!d.name.trim()}>Next</Primary>
          </form>
        )}

        {step === 'sport' && (
          <div className="flex-1 flex flex-col">
            <Question title={`What’s your sport, ${first}?`} sub="Pick your main one. You can add more later." />
            <div className="flex flex-wrap justify-center gap-2">
              {SPORTS.map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={d.sport === s}
                  onClick={() => { update({ sport: s }); setTimeout(() => go('age'), 200) }}
                  className={`px-4 h-11 rounded-full text-sm border transition-colors ${d.sport === s ? 'bg-cta text-fg-inverse border-cta font-semibold' : 'border-edge text-fg-2 hover:border-cta/50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'age' && (
          <form className="flex-1 flex flex-col" onSubmit={e => { e.preventDefault(); submitAge() }}>
            <Question title="When were you born?" sub="We ask everyone. It helps us set up your account the right way." />
            <div className="grid grid-cols-2 gap-3">
              <select id="start-month" aria-label="Birth month" value={d.birthMonth ?? ''} onChange={e => update({ birthMonth: e.target.value ? Number(e.target.value) : null })} className="input-field h-14">
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select id="start-year" aria-label="Birth year" value={d.birthYear ?? ''} onChange={e => update({ birthYear: e.target.value ? Number(e.target.value) : null })} className="input-field h-14">
                <option value="">Year</option>
                {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {error && <p role="alert" className="error-box mt-4">{error}</p>}
            <div className="flex-1" />
            <Primary disabled={!d.birthMonth || !d.birthYear}>Next</Primary>
          </form>
        )}

        {step === 'young' && (
          <div className="flex-1 flex flex-col justify-center text-center gap-4 py-10">
            <h1 className="font-display text-3xl text-fg-1">MindFit is for athletes 13 and older</h1>
            <p className="text-fg-3">Thanks for wanting to train your mind. We can’t set up an account for you yet, and nothing you entered was kept. Come back when you’re 13.</p>
          </div>
        )}

        {step === 'proof' && (
          <div className="flex-1 flex flex-col">
            <Question title={`${first}, did you know…`} sub="Physical training is only half the work." />
            <div className="space-y-3">
              {PROOF.map((p, i) => (
                <div key={p.head} className="rounded-2xl border border-edge bg-surface/80 px-4 py-3 mf-rise" style={{ animationDelay: `${150 + i * 180}ms` }}>
                  <p className="font-semibold text-fg-1">{p.head}</p>
                  <p className="text-[13px] leading-snug text-fg-3 mt-1">{p.body}</p>
                  <p className="text-[11px] uppercase tracking-wider text-cta/80 mt-2">{p.cite}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-fg-3 text-center mt-5">Next: 10 quick taps, 1 to 5, to measure your mental game today.</p>
            <div className="flex-1" />
            <Primary onClick={() => { setQ(0); go('mpi') }}>Start my baseline</Primary>
          </div>
        )}

        {step === 'mpi' && (() => {
          const dim = MPI_DIMENSIONS[q]
          const val = d.scores[dim.key]
          return (
            <div className="flex-1 flex flex-col">
              <p className="mt-10 text-center text-xs uppercase tracking-[0.24em] text-cta">{q + 1} of {MPI_DIMENSIONS.length} · {dim.label}</p>
              <h1 className="mt-3 mb-10 text-center font-display text-2xl text-fg-1 text-balance">{dim.description}</h1>
              <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={dim.label}>
                {SCALE.map((word, i) => {
                  const n = i + 1
                  const on = val === n * 2
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${n}, ${word}`}
                      onClick={() => rate(dim.key, n * 2)}
                      className={`h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${on ? 'bg-cta text-fg-inverse border-cta scale-[1.04]' : 'border-edge text-fg-2 bg-surface/60'}`}
                    >
                      <span className="font-display text-2xl leading-none">{n}</span>
                      <span className={`text-[10px] leading-none ${on ? 'text-fg-inverse' : 'text-fg-4'}`}>{word}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-center text-xs text-fg-4 mt-10">Be honest. This is your starting line, not a test.</p>
            </div>
          )
        })()}

        {step === 'score' && (
          <div className="flex-1 flex flex-col text-center">
            <p className="mt-8 text-xs uppercase tracking-[0.24em] text-fg-4">Your Mental Performance Index</p>
            <ScoreRing value={mpi} />
            <p className="text-fg-1 font-medium">{mpiVerdict(mpi)}</p>
            <div className="grid grid-cols-2 gap-3 mt-6 text-left">
              <div className="rounded-2xl border border-edge bg-surface/80 p-4">
                <p className="text-[11px] uppercase tracking-wider text-fg-4">Your edge</p>
                <p className="text-fg-1 font-semibold mt-1">{edge}</p>
              </div>
              <div className="rounded-2xl border border-cta/40 bg-cta/5 p-4">
                <p className="text-[11px] uppercase tracking-wider text-cta">Your gap</p>
                <p className="text-fg-1 font-semibold mt-1">{gap}</p>
              </div>
            </div>
            <p className="text-sm text-fg-3 mt-6">This is your starting line, {first}. Every week you’ll measure against today.</p>
            <div className="flex-1" />
            <Primary onClick={() => go('account')}>Save my score</Primary>
          </div>
        )}

        {step === 'account' && (
          <form className="flex-1 flex flex-col" onSubmit={createAccount}>
            <Question title="Save your score" sub="Create your free account to keep your baseline and start training." />
            <p className="text-center text-[11px] uppercase tracking-[0.2em] text-cta -mt-4 mb-6">Free forever · No card · No trial</p>
            <div className="space-y-3">
              <input id="start-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="input-field h-14" />
              <div className="relative">
                <input id="start-password" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" className="input-field h-14 pr-16" />
                <button type="button" onClick={() => setShowPw(s => !s)} aria-pressed={showPw} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-4 text-xs font-medium text-fg-4 hover:text-fg-2">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <label className="flex items-start gap-3 text-sm text-fg-3 cursor-pointer pt-1">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-edge bg-surface-2 accent-cta" />
                <span>I agree to the <Link href="/terms" target="_blank" className="text-cta hover:underline">Terms</Link> and <Link href="/privacy" target="_blank" className="text-cta hover:underline">Privacy Policy</Link>.</span>
              </label>
            </div>
            {error && <p role="alert" className="error-box mt-4">{error}</p>}
            <div className="flex-1" />
            <Primary disabled={busy || !email}>{busy ? 'One moment…' : 'Create account'}</Primary>
            <Link href="/login" className="block text-center text-sm text-fg-3 hover:text-fg-1 py-3">I already have an account</Link>
          </form>
        )}

        {step === 'code' && (
          <div className="flex-1 flex flex-col">
            <Question title="Check your email" sub={`We sent a 6-digit code to ${email}.`} />
            <CodeInput value={code} onChange={setCode} onComplete={verify} disabled={busy} />
            {busy && <p className="text-center text-sm text-fg-3 mt-4">Saving your score…</p>}
            {error && <p role="alert" className="error-box mt-4">{error}</p>}
            <div className="flex justify-between text-sm mt-6">
              <button type="button" onClick={() => go('account')} className="text-fg-4 hover:text-fg-2">Different email</button>
              <button type="button" onClick={resend} disabled={resendIn > 0} className="text-cta disabled:text-fg-4">
                {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
              </button>
            </div>
          </div>
        )}

        {step === 'guide' && (
          <GuideChoice onChosen={on => { router.push(on ? '/guide' : '/mindset'); router.refresh() }} />
        )}

        {step === 'saving' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="h-10 w-10 rounded-full border-2 border-cta/30 border-t-cta animate-spin" aria-hidden />
            <p className="text-fg-2">Saving your score…</p>
          </div>
        )}

        {step === 'done' && (
          <form className="flex-1 flex flex-col" onSubmit={e => { e.preventDefault(); finish() }}>
            <div className="mt-16 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-cta">You’re in</p>
              <h1 className="mt-3 font-display text-3xl text-fg-1">Welcome to MindFit, {first}.</h1>
              <p className="text-fg-3 mt-3">Your baseline is saved. One 2-minute rep a day moves it.</p>
            </div>
            <label htmlFor="start-team" className="block text-sm text-fg-2 mt-10 mb-2">Team code <span className="text-fg-4">(optional, from your coach)</span></label>
            <input
              id="start-team"
              value={teamCode}
              onChange={e => { setTeamCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setTeamMsg('') }}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="ABC123"
              className="input-field h-14 text-center font-mono tracking-[0.4em]"
            />
            {teamMsg && <p role="alert" className="error-box mt-3">{teamMsg}</p>}
            {isTeen && (
              <div className="mt-6">
                <label htmlFor="start-parent" className="block text-sm text-fg-2 mb-2">Parent or guardian email <span className="text-fg-4">(optional)</span></label>
                <input
                  id="start-parent"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={parentEmail}
                  onChange={e => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="input-field h-14"
                />
                <p className="text-xs text-fg-4 mt-2">We&apos;ll send them an invite to follow your progress. They see nothing until they accept.</p>
              </div>
            )}
            <div className="flex-1" />
            <Primary disabled={busy || (teamCode.length > 0 && teamCode.length < 6)}>{busy ? 'Joining…' : 'Start training'}</Primary>
          </form>
        )}
      </main>
    </div>
  )
}

function Question({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mt-8 mb-6 text-center">
      <h1 className="font-display text-[1.7rem] leading-tight text-fg-1 text-balance">{title}</h1>
      {sub && <p className="text-sm text-fg-3 mt-2">{sub}</p>}
    </div>
  )
}

function Primary({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <div className="pb-6 pt-4">
      <button
        type={onClick ? 'button' : 'submit'}
        onClick={onClick}
        disabled={disabled}
        className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-40"
      >
        {children}
      </button>
    </div>
  )
}

function ScoreRing({ value }: { value: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); return }
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1400)
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  const C = 2 * Math.PI * 44
  return (
    <div className="relative w-48 h-48 mx-auto my-6">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-muted)" strokeWidth="5" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--cta)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(shown / 100) * C} ${C}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-label={`MPI ${value} out of 100`}>
        <span className="font-display text-6xl text-cta tabular-nums">{shown}</span>
        <span className="text-xs text-fg-4 mt-1">/ 100</span>
      </div>
    </div>
  )
}
