'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'
import { readinessScore, readinessVerdict } from '@/lib/readiness'
import { greeting, markGuideSeenToday, todayQuery, type GuideStep, type TodayData, PILLARS, readSkips, recordSkip, readNextObjective } from '@/lib/guide'
import { flowFor, greetKey, revealKey, stepLineKey, needFor, planSteps, daySeed, slotFor, type Flow } from '@/lib/guide-brain'
import { guideLine, type LineKey } from '@/lib/data/guide-lines'
import { guideFor, type GuideCharacter } from '@/lib/guide-characters'
import Celebrate from '@/components/shared/Celebrate'
import DailyCheckIn from '@/components/today/DailyCheckIn'
import { PillarRings, ReadinessRing } from './Rings'
import GuideChoice from './GuideChoice'
import GuideSpeaker from './GuideSpeaker'
import EveningFlow from './EveningFlow'
import MeetYourGuide from './MeetYourGuide'
import { clearTrip, markFromGuide, readTrip } from '@/lib/guide-return'
import { useToast } from '@/components/shared/Toast'

type Phase = 'loading' | 'failed' | 'pick' | 'dayone' | 'greet' | 'checkin' | 'reveal' | 'choice' | 'step' | 'evening' | 'end'

const doneKey = (day: string) => `mf-guide-done:${day}`

function readDone(day: string): string[] {
  try { return JSON.parse(sessionStorage.getItem(doneKey(day)) ?? '[]') } catch { return [] }
}

function daysUntil(date: string, today: string): number {
  return Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
}

type Profile = {
  full_name?: string | null
  daily_guidance?: boolean | null
  guide_character?: unknown
  guide_visible?: boolean
  onboarded_at?: string | null
} | null

export default function DailyGuide() {
  const today = localDateISO()
  const hour = new Date().getHours()
  const seed = daySeed(today)
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<TodayData | null>(null)
  const [game, setGame] = useState<UpcomingGame | null>(null)
  const [stats, setStats] = useState<{ streak: number; freezes: number } | null>(null)
  const [first, setFirst] = useState('')
  const [done, setDone] = useState<string[]>([])
  // null on the profile = never asked; existing athletes get the choice once.
  const [askChoice, setAskChoice] = useState(false)
  const [guide, setGuide] = useState<GuideCharacter>(() => guideFor(null))
  const [showGuide, setShowGuide] = useState(true)
  const [mode, setMode] = useState<'check-in' | 'morning'>('check-in')
  const [evening, setEvening] = useState({ check: false, night: false })
  const [afterChoice, setAfterChoice] = useState<Phase>('step')
  const [nightJustDone, setNightJustDone] = useState(false)
  const [skips, setSkips] = useState<Record<string, number>>({})
  const [nextObjective, setNextObjective] = useState('')
  // Chosen once when the guide opens, so the greeting never changes mid-read.
  const [greet, setGreet] = useState<LineKey>('greet.morning')
  const profileRef = useRef<Profile>(null)
  const lastOpen = useRef<{ json: TodayData; doneList: string[]; now: { streak: number | null; gameToday: boolean } } | null>(null)
  // Rings as they were when the athlete left, so the one they just closed animates shut.
  const [shownPillars, setShownPillars] = useState<TodayData['pillars'] | null>(null)
  const [closedNow, setClosedNow] = useState(0)
  const notify = useToast()
  const toSteps = () => setPhase(askChoice ? 'choice' : 'step')
  const speaker = { character: guide.key, voice: guide.voice, show: showGuide }

  const load = useCallback(async (): Promise<TodayData | null> => {
    try {
      const res = await fetch(todayQuery(today))
      if (!res.ok) throw new Error('today')
      const json: TodayData = await res.json()
      setData(json)
      return json
    } catch {
      return null
    }
  }, [today])

  // Decides which flow opens for this athlete, right now.
  const open = (json: TodayData, profile: Profile, doneList: string[], now: { streak: number | null; gameToday: boolean }) => {
    setGreet(greetKey({ hour, ...now }))
    lastOpen.current = { json, doneList, now }
    const ask = !!profile && profile.daily_guidance == null
    setAskChoice(ask)
    setGuide(guideFor(profile?.guide_character))
    setShowGuide(profile?.guide_visible !== false)
    // Athletes who joined before guides existed meet them once, then carry on.
    if (profile && profile.guide_character == null && profile.guide_visible !== false) return setPhase('pick')
    const isDayOne = !!profile?.onboarded_at && localDateISO(new Date(profile.onboarded_at)) === today 
    const checkOpen = !!json.journal && json.journal.objective_result == null && !doneList.includes('check')
    const nightOpen = !json.routines.night && !doneList.includes('night')
    const flow: Flow = flowFor({ hour, hasJournal: !!json.journal, dayOne: isDayOne, checkOpen, nightOpen })
    if (flow === 'day-one') return setPhase('dayone')
    if (flow === 'morning' || flow === 'check-in') { setMode(flow); return setPhase('greet') }
    const next: Phase = flow === 'evening' ? 'evening' : 'step'
    if (flow === 'evening') setEvening({ check: checkOpen, night: nightOpen })
    setAfterChoice(next)
    setPhase(ask ? 'choice' : next)
  }

  useEffect(() => {
    markGuideSeenToday()
    const doneList = readDone(today)
    setDone(doneList)
    setNextObjective(readNextObjective())
    const trip = readTrip()
    clearTrip()
    // The greeting depends on the streak and on game day, so the first screen
    // waits for them, but never longer than a moment.
    const extras = Promise.all([
      loadNextGame(today).then(g => { setGame(g); return g }).catch(() => { setGame(null); return null }),
      cached('/api/stats/overview', (st: { streak?: number; freezes?: number } | null) => {
        if (st && typeof st.streak === 'number') setStats({ streak: st.streak, freezes: st.freezes ?? 0 })
      }).catch(() => null),
    ])
    const soon = Promise.race([extras, new Promise<null>(resolve => setTimeout(() => resolve(null), 700))])
    Promise.all([
      load(),
      fetch('/api/profile').then(r => (r.ok ? r.json() : null)).catch(() => null) as Promise<Profile>,
      soon,
    ]).then(([json, profile, extra]) => {
      profileRef.current = profile
      setFirst(profile?.full_name?.trim().split(/\s+/)[0] ?? '')
      if (!json) return setPhase('failed')
      PILLARS.filter(p => json.pillars[p.key]).forEach(p => recordSkip(p.key, false))
      setSkips(readSkips())
      const [nextGame, st] = extra ?? [null, null]
      open(json, profile, doneList, {
        streak: typeof st?.streak === 'number' ? st.streak : null,
        gameToday: !!nextGame && daysUntil(nextGame.date, today) === 0,
      })
      if (!trip) return
      const newly = PILLARS.filter(p => json.pillars[p.key] && !trip.pillars[p.key])
      if (!newly.length) return
      setShownPillars(trip.pillars)
      setTimeout(() => {
        setShownPillars(null)
        setClosedNow(Date.now())
        notify(`${newly.map(p => p.label).join(' and ')} ring closed`)
      }, 450)
    })
  }, [today, load])

  const markDone = (id: string) => {
    setDone(prev => {
      const next = prev.includes(id) ? prev : [...prev, id]
      try { sessionStorage.setItem(doneKey(today), JSON.stringify(next)) } catch {}
      return next
    })
  }

  const gameIn = game ? daysUntil(game.date, today) : null
  const steps: GuideStep[] = data ? planSteps({ data, hour, gameToday: gameIn === 0, done, focus: guide.focus, skips }) : []
  const step = steps[0] ?? null
  const score = data?.journal ? readinessScore(data.journal) : null
  const allClosed = !!data && Object.values(data.pillars).every(Boolean)
  const view: Phase = phase === 'step' && !step ? 'end' : phase

  // Each screen replaces the last, so move focus to it for keyboard and screen-reader users.
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { if (view !== 'loading') mainRef.current?.focus({ preventScroll: true }) }, [view])

  const gameLine = gameIn == null || gameIn < 0 || gameIn > 7 ? null
    : `${gameIn === 0 ? 'Game day' : gameIn === 1 ? 'Game tomorrow' : `Game in ${gameIn} days`}${game?.opponent ? ` vs ${game.opponent}` : ''}`

  return (
    <div className="min-h-[100dvh] bg-page flex flex-col pt-safe pb-safe">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgb(var(--cta-rgb)/0.10),transparent_60%)]" />

      <div className="relative w-full max-w-md mx-auto px-5 pt-4 flex items-center justify-between">
        <span className="font-display tracking-[0.4em] text-cta text-xs">MINDFIT</span>
        <Link href="/mindset" aria-label="Close guide" className="h-11 w-11 -mr-2 grid place-items-center rounded-full text-fg-3 hover:text-fg-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </Link>
      </div>

      <main key={view} ref={mainRef} tabIndex={-1} className="relative flex-1 w-full max-w-md mx-auto px-6 flex flex-col mf-rise outline-none">
        {view === 'loading' && (
          <div className="flex-1 grid place-items-center" aria-busy>
            <div className="h-10 w-10 rounded-full border-2 border-cta/30 border-t-cta animate-spin" aria-hidden />
          </div>
        )}

        {view === 'failed' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-fg-2">Couldn&apos;t load your day. Check your connection.</p>
            <button type="button" onClick={() => { setPhase('loading'); load().then(j => (j ? open(j, profileRef.current, readDone(today), { streak: stats?.streak ?? null, gameToday: gameIn === 0 }) : setPhase('failed'))) }} className="text-cta underline underline-offset-4 min-h-[44px]">Try again</button>
          </div>
        )}

        {view === 'pick' && (
          <MeetYourGuide
            existing
            onDone={(_, key) => {
              const picked = { ...(profileRef.current ?? {}), guide_character: key }
              profileRef.current = picked
              const a = lastOpen.current
              if (a) open(a.json, picked, a.doneList, a.now)
            }}
          />
        )}

        {view === 'dayone' && data && (
          <>
            <div className="flex-1 flex flex-col justify-center py-8">
              <GuideSpeaker layout="hero" character={guide.key} show={showGuide} line={guideLine(guide.voice, 'dayone.done', { name: first })} />
              <div className="mt-8 space-y-3">
                {data.affirmation && (
                  <div className="rounded-2xl border border-edge p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Who you are</p>
                    <p className="mt-2 text-fg-1 break-words">{data.affirmation}</p>
                  </div>
                )}
                {nextObjective && (
                  <div className="rounded-2xl border border-edge p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Today&apos;s objective</p>
                    <p className="mt-2 text-fg-1 break-words">{nextObjective}</p>
                  </div>
                )}
                {data.focus && (
                  <Link href={data.focus.action.href} onClick={() => markFromGuide(data.pillars)} className="block rounded-2xl border border-cta/30 bg-surface/80 p-4 hover:border-cta/60 transition-colors">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">A good first rep · {data.focus.label}</p>
                    <p className="mt-2 text-fg-1">{data.focus.action.text} →</p>
                  </Link>
                )}
              </div>
            </div>
            <div className="pb-6 pt-4">
              <Link href="/mindset" className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors flex items-center justify-center">
                Enter the app
              </Link>
            </div>
          </>
        )}

        {view === 'greet' && (
          <>
            <div className="flex-1 flex flex-col justify-center py-10">
              <GuideSpeaker
                layout="hero"
                character={guide.key}
                show={showGuide}
                line={guideLine(guide.voice, greet, { name: first, streak: stats?.streak, seed })}
              />
              <Meta stats={stats} gameLine={gameLine} className="mt-8 justify-center" />
            </div>
            <Primary onClick={() => setPhase('checkin')}>{mode === 'morning' ? 'Start my morning' : 'Start my check-in'}</Primary>
            <button type="button" onClick={toSteps} className="-mt-3 mb-3 mx-auto text-sm text-fg-4 hover:text-fg-2 min-h-[44px] px-4">Not now</button>
          </>
        )}

        {view === 'checkin' && data && (
          <DailyCheckIn
            inline
            today={today}
            data={data}
            mode={mode}
            speaker={speaker}
            onClose={() => {}}
            onSaved={() => {
              if (slotFor(hour) === 'evening') markDone('check')
              load().then(j => setPhase(j ? 'reveal' : 'failed'))
            }}
          />
        )}

        {view === 'reveal' && data && (
          <>
            <div className="flex-1 flex flex-col justify-center items-center text-center py-8">
              <p className="text-xs uppercase tracking-[0.24em] text-cta">Today&apos;s readiness</p>
              <div className="my-6"><ReadinessRing score={score} size={192} /></div>
              {score != null && <h1 className="font-display text-2xl text-fg-1 text-balance">{readinessVerdict(score)}</h1>}
              {score != null && (
                <GuideSpeaker
                  className="mt-6 text-left"
                  character={guide.key}
                  show={showGuide}
                  state={score >= 75 ? 'cheer' : score < 50 ? 'steady' : 'idle'}
                  line={guideLine(guide.voice, revealKey(score), { seed })}
                />
              )}
              <div className="w-full mt-10"><PillarRings pillars={data.pillars} /></div>
            </div>
            <Primary onClick={toSteps}>{steps.length ? 'See my next step' : 'Finish'}</Primary>
          </>
        )}

        {view === 'choice' && (
          <GuideChoice onChosen={() => { setAskChoice(false); setPhase(afterChoice) }} />
        )}

        {view === 'step' && data && step && (
          <>
            <div className="pt-6 flex items-center gap-5">
              <ReadinessRing score={score} size={96} />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-cta">{greeting(hour)}{first ? `, ${first}` : ''}</p>
                {score != null && <p className="mt-1 text-fg-1 font-semibold leading-snug">{readinessVerdict(score)}</p>}
                <Meta stats={stats} gameLine={gameLine} className="mt-2" small />
              </div>
            </div>
            <Celebrate fire={closedNow} className="mt-8"><PillarRings pillars={shownPillars ?? data.pillars} /></Celebrate>

            <div className="flex-1 flex flex-col justify-end pt-10">
              <GuideSpeaker className="mb-4" character={guide.key} show={showGuide} state="point" line={guideLine(guide.voice, stepLineKey(step, needFor(data)), { seed })} />
              <div key={step.id} className="mf-rise rounded-3xl border border-cta/30 bg-surface/80 p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Next · {step.tag}</p>
                <h1 className="mt-3 font-display text-[1.7rem] leading-tight text-fg-1 text-balance">{step.text}</h1>
                <p className="mt-2 text-sm text-fg-3">{step.why}</p>
              </div>
              <div className="pb-2 pt-5">
                {step.inline ? (
                  <button
                    type="button"
                    onClick={() => { setEvening({ check: step.id === 'check', night: step.id === 'night' }); setPhase('evening') }}
                    className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors flex items-center justify-center"
                  >
                    {step.text}
                  </button>
                ) : (
                  <Link
                    href={step.href}
                    onClick={() => { markFromGuide(data.pillars); if (step.id === 'pregame' || step.id === 'focus' || step.id === 'need') markDone(step.id) }}
                    className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors flex items-center justify-center"
                  >
                    {step.text}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (PILLARS.some(p => p.key === step.id)) { recordSkip(step.id, true); setSkips(readSkips()) }
                  markDone(step.id)
                }}
                className="mb-4 mx-auto text-sm text-fg-4 hover:text-fg-2 min-h-[44px] px-4"
              >
                I&apos;ll do this later
              </button>
            </div>
          </>
        )}

        {view === 'evening' && data && (
          <EveningFlow
            today={today}
            data={data}
            speaker={speaker}
            check={evening.check}
            night={evening.night}
            onDone={r => {
              if (r.checkSkipped) markDone('check')
              if (r.nightSkipped) markDone('night')
              setNightJustDone(r.nightDone)
              load().then(j => setPhase(!j ? 'failed' : r.nightDone ? 'end' : 'step'))
            }}
          />
        )}

        {view === 'end' && data && (
          <>
            <div className="flex-1 flex flex-col justify-center items-center text-center py-10">
              {nightJustDone || (slotFor(hour) === 'evening' && data.routines.night) ? (
                <>
                  <GuideSpeaker layout="hero" state="sleep" character={guide.key} show={showGuide} line={guideLine(guide.voice, 'night.done', { seed })} />
                  <div className="w-full mt-10"><PillarRings pillars={data.pillars} /></div>
                </>
              ) : allClosed ? (
                <>
                  <Celebrate fire={allClosed}>
                    <div className="w-full"><PillarRings pillars={shownPillars ?? data.pillars} /></div>
                  </Celebrate>
                  <p className="mt-10 text-xs uppercase tracking-[0.24em] text-cta">Clutch Day</p>
                  <GuideSpeaker className="mt-6" layout="hero" state="cheer" character={guide.key} show={showGuide} line={guideLine(guide.voice, 'end.clutch', { seed })} />
                </>
              ) : (
                <>
                  <PillarRings pillars={data.pillars} />
                  <p className="mt-10 text-xs uppercase tracking-[0.24em] text-cta">Your plan is set</p>
                  <GuideSpeaker className="mt-6" layout="hero" character={guide.key} show={showGuide} line={guideLine(guide.voice, 'end.plan', { seed })} />
                  {done.length > 0 && (
                    <button type="button" onClick={() => { setDone([]); try { sessionStorage.removeItem(doneKey(today)) } catch {} }} className="mt-4 text-sm text-cta underline underline-offset-4 min-h-[44px]">
                      Show my steps again
                    </button>
                  )}
                </>
              )}
              <Meta stats={stats} gameLine={gameLine} className="mt-8 justify-center" />
            </div>
            <div className="pb-6 pt-4">
              <Link href="/mindset" className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors flex items-center justify-center">
                Enter the app
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Meta({ stats, gameLine, className = '', small = false }: { stats: { streak: number; freezes: number } | null; gameLine: string | null; className?: string; small?: boolean }) {
  const parts: React.ReactNode[] = []
  if (stats && stats.streak > 0) parts.push(<span key="s">🔥 {stats.streak}-day streak</span>)
  if (stats && stats.freezes > 0) parts.push(<span key="f" className="text-sky-300">{'🧊'.repeat(stats.freezes)} {stats.freezes === 1 ? '1 freeze' : `${stats.freezes} freezes`}</span>)
  if (gameLine) parts.push(<span key="g" className="text-cta">{gameLine}</span>)
  if (!parts.length) return null
  return <div className={`flex flex-wrap gap-x-3 gap-y-1 ${small ? 'text-xs' : 'text-sm'} text-fg-2 ${className}`}>{parts}</div>
}

function Primary({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div className="pb-6 pt-4">
      <button type="button" onClick={onClick} className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors">
        {children}
      </button>
    </div>
  )
}
