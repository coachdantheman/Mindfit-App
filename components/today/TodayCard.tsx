'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cached } from '@/lib/api-cache'
import { localDateISO } from '@/lib/dates'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'
import { readinessScore, readinessVerdict } from '@/lib/readiness'
import Celebrate from '@/components/shared/Celebrate'
import DailyCheckIn from './DailyCheckIn'

export interface TodayData {
  journal: {
    objective: string
    rating_motivation: number
    rating_focus: number
    rating_confidence: number
    rating_anxiety: number
    quick: boolean
  } | null
  sleep: {
    hours_slept: number | null
    sleep_quality: number | null
    bedtime: string | null
    wake_time: string | null
    notes: string | null
  } | null
  pillars: { mind: boolean; body: boolean; fuel: boolean; rest: boolean }
  affirmation: string | null
  focus: { need: string; label: string; action: { text: string; href: string }; from: 'quiz' | 'mpi' } | null
}

type PillarKey = keyof TodayData['pillars']

const PILLARS: { key: PillarKey; label: string; href: string; action: string }[] = [
  { key: 'mind', label: 'Mind', href: '/mindset?tab=Journal', action: 'Open your journal' },
  { key: 'body', label: 'Body', href: '/exercise', action: 'Log your training' },
  { key: 'fuel', label: 'Fuel', href: '/nutrition', action: 'Log a meal' },
  { key: 'rest', label: 'Rest', href: '/sleep', action: "Log last night's sleep" },
]

function ReadinessRing({ score }: { score: number | null }) {
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    // A timer, not an animation frame: frames pause in a background tab and
    // the ring would sit empty.
    const t = setTimeout(() => setDrawn(score ?? 0), 40)
    return () => clearTimeout(t)
  }, [score])

  const r = 50
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-[120px] h-[120px] shrink-0 flex items-center justify-center">
      <svg className="-rotate-90" width={120} height={120} viewBox="0 0 120 120" aria-hidden>
        <circle cx={60} cy={60} r={r} fill="none" stroke="var(--border-muted)" strokeWidth={8} />
        <circle
          cx={60}
          cy={60}
          r={r}
          fill="none"
          stroke="var(--cta)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - drawn / 100)}
          style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-[34px] font-extrabold tracking-tight text-fg-1 leading-none tabular-nums">
          {score ?? '-'}
        </div>
        <div className="text-[10px] text-cta uppercase tracking-[0.18em] font-semibold font-mono mt-1">
          Readiness
        </div>
      </div>
    </div>
  )
}

function PillarRing({ label, href, done }: { label: string; href: string; done: boolean }) {
  const r = 19
  const c = 2 * Math.PI * r
  return (
    <Link href={href} className="flex flex-col items-center gap-1.5 min-w-0" aria-label={`${label}, ${done ? 'complete' : 'not yet'}`}>
      <span className="relative w-11 h-11 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width={44} height={44} viewBox="0 0 44 44" aria-hidden>
          <circle cx={22} cy={22} r={r} fill="none" stroke="var(--border-muted)" strokeWidth={3} />
          {done && (
            <circle cx={22} cy={22} r={r} fill="none" stroke="var(--cta)" strokeWidth={3} strokeDasharray={c} strokeDashoffset={0} />
          )}
        </svg>
        {done && (
          <svg className="relative text-cta" width={16} height={16} viewBox="0 0 16 16" aria-hidden>
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[11px] uppercase tracking-[0.16em] text-fg-3 font-semibold">{label}</span>
    </Link>
  )
}

export default function TodayCard() {
  const [data, setData] = useState<TodayData | null>(null)
  const [game, setGame] = useState<UpcomingGame | null>(null)
  const [failed, setFailed] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)
  const [freezeInfo, setFreezeInfo] = useState<{ freezes: number; savedYesterday: boolean }>({ freezes: 0, savedYesterday: false })
  // null until the first load, so a Clutch Day already complete on arrival does not celebrate.
  const wasAllFour = useRef<boolean | null>(null)

  const load = useCallback(async () => {
    try {
      const day = localDateISO()
      const start = new Date(`${day}T00:00:00`)
      const end = new Date(start.getTime() + 86_400_000)
      const res = await fetch(`/api/today?date=${day}&from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`)
      if (!res.ok) throw new Error('today')
      const json: TodayData = await res.json()
      const allFour = Object.values(json.pillars).every(Boolean)
      if (wasAllFour.current === false && allFour) setJustCompleted(true)
      wasAllFour.current = allFour
      setData(json)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    load()
    loadNextGame(localDateISO()).then(setGame).catch(() => setGame(null))
    cached('/api/stats/overview', (d: { freezes?: number; savedYesterday?: boolean }) => {
      if (d && typeof d.freezes === 'number') setFreezeInfo({ freezes: d.freezes, savedYesterday: d.savedYesterday === true })
    }).catch(() => {})
  }, [load])

  if (!data && failed) return null

  const today = localDateISO()
  const pillars = data?.pillars ?? { mind: false, body: false, fuel: false, rest: false }
  const doneCount = PILLARS.filter(p => pillars[p.key]).length
  const allFour = doneCount === 4
  const score = data?.journal ? readinessScore(data.journal) : null
  const firstOpen = PILLARS.find(p => !pillars[p.key])

  return (
    <section className="card p-5 mb-6 min-h-[300px] space-y-5" aria-label="Today">
      {!data ? (
        <div className="space-y-5 animate-pulse" aria-hidden>
          <div className="flex items-center gap-5">
            <div className="w-[120px] h-[120px] rounded-full bg-surface-2 shrink-0" />
            <div className="h-4 w-40 rounded bg-surface-2" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {PILLARS.map(p => <div key={p.key} className="h-11 w-11 mx-auto rounded-full bg-surface-2" />)}
          </div>
          <div className="h-10 rounded-xl bg-surface-2" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5">
            <ReadinessRing score={score} />
            <div className="min-w-0">
              {score === null ? (
                <p className="text-sm text-fg-2">Check in to see today&apos;s readiness.</p>
              ) : (
                <p className="text-base font-semibold leading-snug text-fg-1">{readinessVerdict(score)}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Celebrate fire={allFour && justCompleted}>
              <div className="grid grid-cols-4 gap-2">
                {PILLARS.map(p => (
                  <PillarRing key={p.key} label={p.label} href={p.href} done={pillars[p.key]} />
                ))}
              </div>
            </Celebrate>
            <p className="text-xs text-center text-fg-4">
              {allFour ? <span className="text-cta font-semibold uppercase tracking-[0.16em]">Clutch Day</span> : `${doneCount} of 4 today`}
            </p>
            {freezeInfo.freezes > 0 && (
              <p className="text-xs text-center text-sky-300" title="Miss a day and a freeze keeps your streak alive. Earn one every 7 days in a row, hold up to 2.">
                {'🧊'.repeat(freezeInfo.freezes)} {freezeInfo.freezes === 1 ? '1 streak freeze ready' : `${freezeInfo.freezes} streak freezes ready`}
              </p>
            )}
            {freezeInfo.savedYesterday && (
              <p className="text-xs text-center text-cta">Freeze your streak, keep your flame. A freeze saved yours yesterday.</p>
            )}
            {data.focus ? (
              <Link href={data.focus.action.href} className="block rounded-xl border border-edge px-4 py-3 hover:bg-surface-2 transition-colors">
                <span className="block text-[11px] uppercase tracking-[0.16em] text-cta font-semibold">Your focus today · {data.focus.label}</span>
                <span className="block mt-1 text-sm text-fg-1">{data.focus.action.text}</span>
              </Link>
            ) : (
              <p className="text-xs text-center">
                <Link href="/learn?tab=quiz" className="text-cta underline underline-offset-4">Take the 2-minute quiz to personalise this</Link>
              </p>
            )}
          </div>

          <div className="border-t border-edge pt-4">
            {!data.journal ? (
              <button type="button" onClick={() => setCheckInOpen(true)} className="btn-primary w-full py-3">
                Start check-in
              </button>
            ) : game?.date === today ? (
              <Link href="/exercise?tab=gameday" className="btn-primary block w-full py-3 text-center leading-snug">
                Run your pregame routine
              </Link>
            ) : firstOpen ? (
              <Link href={firstOpen.href} className="btn-primary block w-full py-3 text-center leading-snug">
                {firstOpen.action}
              </Link>
            ) : data.focus ? (
              <Link href={data.focus.action.href} className="btn-primary block w-full py-3 text-center leading-snug">
                {data.focus.action.text}
              </Link>
            ) : (
              <p className="text-sm text-center text-fg-2">Everything is logged. Recover well.</p>
            )}
          </div>
        </>
      )}

      {checkInOpen && data && (
        <DailyCheckIn
          today={today}
          data={data}
          onClose={() => setCheckInOpen(false)}
          onSaved={load}
        />
      )}
    </section>
  )
}
