'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'
import { readinessScore, readinessVerdict } from '@/lib/readiness'
import { greeting, guideSteps, todayQuery, type GuideStep, type TodayData } from '@/lib/guide'
import Celebrate from '@/components/shared/Celebrate'
import DailyCheckIn from '@/components/today/DailyCheckIn'
import { PillarRings, ReadinessRing } from './Rings'

type Phase = 'loading' | 'failed' | 'greet' | 'checkin' | 'reveal' | 'step' | 'end'

const doneKey = (day: string) => `mf-guide-done:${day}`

function readDone(day: string): string[] {
  try { return JSON.parse(sessionStorage.getItem(doneKey(day)) ?? '[]') } catch { return [] }
}

function daysUntil(date: string, today: string): number {
  return Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000)
}

export default function DailyGuide() {
  const today = localDateISO()
  const hour = new Date().getHours()
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<TodayData | null>(null)
  const [game, setGame] = useState<UpcomingGame | null>(null)
  const [stats, setStats] = useState<{ streak: number; freezes: number } | null>(null)
  const [first, setFirst] = useState('')
  const [done, setDone] = useState<string[]>([])

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

  useEffect(() => {
    const d = readDone(today)
    setDone(d)
    load().then(json => {
      if (!json) return setPhase('failed')
      setPhase(json.journal ? 'step' : 'greet')
    })
    loadNextGame(today).then(setGame).catch(() => setGame(null))
    cached('/api/stats/overview', (s: { streak?: number; freezes?: number } | null) => {
      if (s && typeof s.streak === 'number') setStats({ streak: s.streak, freezes: s.freezes ?? 0 })
    }).catch(() => {})
    cached('/api/profile', (p: { full_name?: string | null } | null) => setFirst(p?.full_name?.trim().split(/\s+/)[0] ?? '')).catch(() => {})
  }, [today, load])

  const markDone = (id: string) => {
    setDone(prev => {
      const next = prev.includes(id) ? prev : [...prev, id]
      try { sessionStorage.setItem(doneKey(today), JSON.stringify(next)) } catch {}
      return next
    })
  }

  const gameIn = game ? daysUntil(game.date, today) : null
  const steps: GuideStep[] = data ? guideSteps(data, { hour, gameToday: gameIn === 0, done }) : []
  const step = steps[0] ?? null
  const score = data?.journal ? readinessScore(data.journal) : null
  const allClosed = !!data && Object.values(data.pillars).every(Boolean)
  const view: Phase = phase === 'step' && !step ? 'end' : phase

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

      <main key={view} className="relative flex-1 w-full max-w-md mx-auto px-6 flex flex-col mf-rise">
        {view === 'loading' && (
          <div className="flex-1 grid place-items-center" aria-busy>
            <div className="h-10 w-10 rounded-full border-2 border-cta/30 border-t-cta animate-spin" aria-hidden />
          </div>
        )}

        {view === 'failed' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-fg-2">Couldn&apos;t load your day. Check your connection.</p>
            <button type="button" onClick={() => { setPhase('loading'); load().then(j => setPhase(!j ? 'failed' : j.journal ? 'step' : 'greet')) }} className="text-cta underline underline-offset-4 min-h-[44px]">Try again</button>
          </div>
        )}

        {view === 'greet' && (
          <>
            <div className="flex-1 flex flex-col justify-center py-10">
              <p className="text-xs uppercase tracking-[0.24em] text-cta">{greeting(hour)}{first ? `, ${first}` : ''}</p>
              <h1 className="mt-4 font-display text-[2.2rem] leading-tight text-fg-1 text-balance">Champions decide who they are before the day decides for them.</h1>
              <Meta stats={stats} gameLine={gameLine} className="mt-8" />
            </div>
            <Primary onClick={() => setPhase('checkin')}>Start my check-in</Primary>
          </>
        )}

        {view === 'checkin' && data && (
          <DailyCheckIn
            inline
            today={today}
            data={data}
            onClose={() => {}}
            onSaved={() => { load().then(j => setPhase(j ? 'reveal' : 'failed')) }}
          />
        )}

        {view === 'reveal' && data && (
          <>
            <div className="flex-1 flex flex-col justify-center items-center text-center py-8">
              <p className="text-xs uppercase tracking-[0.24em] text-cta">Today&apos;s readiness</p>
              <div className="my-6"><ReadinessRing score={score} size={192} /></div>
              {score != null && <h1 className="font-display text-2xl text-fg-1 text-balance">{readinessVerdict(score)}</h1>}
              <div className="w-full mt-10"><PillarRings pillars={data.pillars} /></div>
            </div>
            <Primary onClick={() => setPhase('step')}>{steps.length ? 'See my next step' : 'Finish'}</Primary>
          </>
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
            <div className="mt-8"><PillarRings pillars={data.pillars} /></div>

            <div className="flex-1 flex flex-col justify-end pt-10">
              <div key={step.id} className="mf-rise rounded-3xl border border-cta/30 bg-surface/80 p-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-cta font-semibold">Next · {step.tag}</p>
                <h1 className="mt-3 font-display text-[1.7rem] leading-tight text-fg-1 text-balance">{step.text}</h1>
                <p className="mt-2 text-sm text-fg-3">{step.why}</p>
              </div>
              <div className="pb-2 pt-5">
                <Link
                  href={step.href}
                  onClick={() => { if (step.id === 'pregame' || step.id === 'focus') markDone(step.id) }}
                  className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors flex items-center justify-center"
                >
                  {step.text}
                </Link>
              </div>
              <button type="button" onClick={() => markDone(step.id)} className="mb-4 mx-auto text-sm text-fg-4 hover:text-fg-2 min-h-[44px] px-4">
                I&apos;ll do this later
              </button>
            </div>
          </>
        )}

        {view === 'end' && data && (
          <>
            <div className="flex-1 flex flex-col justify-center items-center text-center py-10">
              {allClosed ? (
                <>
                  <Celebrate fire={allClosed}>
                    <div className="w-full"><PillarRings pillars={data.pillars} /></div>
                  </Celebrate>
                  <p className="mt-10 text-xs uppercase tracking-[0.24em] text-cta">Clutch Day</p>
                  <h1 className="mt-3 font-display text-3xl text-fg-1 text-balance">All four rings closed.</h1>
                  <p className="mt-3 text-fg-3">This is what your standard looks like. Recover well tonight.</p>
                </>
              ) : (
                <>
                  <PillarRings pillars={data.pillars} />
                  <p className="mt-10 text-xs uppercase tracking-[0.24em] text-cta">Your plan is set</p>
                  <h1 className="mt-3 font-display text-3xl text-fg-1 text-balance">The rest is yours to finish.</h1>
                  <p className="mt-3 text-fg-3">Open rings stay here. Come back to your guide anytime from Mindset.</p>
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
