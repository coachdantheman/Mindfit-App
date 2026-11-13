'use client'
import { useEffect, useRef, useState } from 'react'
import FlowShell from '@/components/guide/FlowShell'
import RoutinePage from '@/components/guide/RoutinePage'
import GuideSpeaker from '@/components/guide/GuideSpeaker'
import ObjectiveCheck from '@/components/journal/ObjectiveCheck'
import type { Species } from '@/components/guide/art/Character'
import { guideLine, type LineKey } from '@/lib/data/guide-lines'
import { routineByKey, readRoutineChecks, writeRoutineChecks, type RoutineStep } from '@/lib/data/routines'
import { daySeed } from '@/lib/guide-brain'
import type { Voice } from '@/lib/guide-characters'
import { readNextObjective, saveNextObjective, type TodayData } from '@/lib/guide'
import type { ObjectiveResult } from '@/types'
import { localDateISO } from '@/lib/dates'

type Page = { kind: 'check' } | { kind: 'night'; step: RoutineStep; n: number }

const NIGHT = routineByKey('night').steps
const NIGHT_IDS = NIGHT.map(s => s.id)
const PRIMARY = 'w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-40'
const TEXT = 'text-sm text-fg-4 hover:text-fg-2 min-h-[44px] px-4'

interface Props {
  today: string
  data: TodayData
  speaker: { character: Species; voice: Voice; show: boolean; stage?: 1 | 2 | 3; outfit?: string | null }
  check: boolean
  night: boolean
  onDone: (r: { checkSkipped: boolean; nightSkipped: boolean; nightDone: boolean }) => void
}

export default function EveningFlow({ today, data, speaker, check, night, onDone }: Props) {
  const seed = daySeed(today)
  const nextDay = (() => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + 1); return localDateISO(d) })()
  const pages: Page[] = [
    ...(check && data.journal ? [{ kind: 'check' as const }] : []),
    ...(night ? NIGHT.map((step, n) => ({ kind: 'night' as const, step, n: n + 1 })) : []),
  ]
  const [i, setI] = useState(0)
  const [result, setResult] = useState<ObjectiveResult | null>(data.journal?.objective_result ?? null)
  // Steps already checked off tonight, here or on the Routine tab, stay checked.
  const [routineDone, setRoutineDone] = useState<string[]>(() => readRoutineChecks('night', today))
  const [tomorrow, setTomorrow] = useState(() => readNextObjective(nextDay))
  const [checkSkipped, setCheckSkipped] = useState(false)
  const busy = useRef(false)
  const fired = useRef(false)

  useEffect(() => {
    if (pages.length || fired.current) return
    fired.current = true
    onDone({ checkSkipped: false, nightSkipped: false, nightDone: false })
  }, [pages.length, onDone])

  if (!pages.length) return null

  const page = pages[i]
  const last = i === pages.length - 1
  const firstNight = pages.findIndex(p => p.kind === 'night')

  const markStep = (id: string) => setRoutineDone(prev => (prev.includes(id) ? prev : [...prev, id]))

  const finish = async (cs: boolean, doneList: string[]) => {
    if (busy.current) return
    busy.current = true
    const ids = Array.from(new Set([...readRoutineChecks('night', today), ...doneList]))
    writeRoutineChecks('night', today, ids)
    // Done only once it is saved; otherwise the guide offers it again later.
    let nightDone = night && NIGHT_IDS.every(id => ids.includes(id))
    if (nightDone) {
      nightDone = await fetch('/api/mindset/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: today, kind: 'night' }),
      }).then(r => r.ok).catch(() => false)
    }
    onDone({ checkSkipped: cs, nightSkipped: false, nightDone })
  }

  const advance = (cs = checkSkipped, markId?: string) => {
    const doneNow = markId && !routineDone.includes(markId) ? [...routineDone, markId] : routineDone
    setRoutineDone(doneNow)
    if (last) return finish(cs, doneNow)
    setI(i + 1)
  }

  const lineKey = (): LineKey => {
    if (page.kind === 'night') return `night.${page.step.id}` as LineKey
    if (result === 'yes') return 'evening.yes'
    if (result === 'partly') return 'evening.partly'
    if (result === 'no') return 'evening.no'
    return 'evening.check'
  }
  const pose = page.kind === 'check' ? (result === 'yes' ? 'cheer' : result === 'no' ? 'steady' : 'idle') : 'idle'

  const title = page.kind === 'check' ? 'Today' : `Night routine · ${page.n} of ${NIGHT.length}`

  const content = page.kind === 'check' ? (
    <div key="check" className="mf-rise pt-2">
      <ObjectiveCheck quiet entry={{ entry_date: today, objective: data.journal?.objective ?? '', objective_result: result }} onChange={setResult} />
    </div>
  ) : (
    <RoutinePage key={page.step.id} step={page.step} done={routineDone.includes(page.step.id)} onTimerDone={() => markStep(page.step.id)}>
      {page.step.id === 'tomorrow' && (
        <input
          type="text"
          maxLength={200}
          value={tomorrow}
          onChange={e => setTomorrow(e.target.value)}
          placeholder="One thing I will do tomorrow"
          aria-label="Tomorrow's objective"
          className="input-field py-3"
        />
      )}
    </RoutinePage>
  )

  const primary = page.kind === 'check' ? (
    <button type="button" onClick={() => advance()} disabled={!result} className={PRIMARY}>
      {pages.length === 1 ? 'Done' : 'Next'}
    </button>
  ) : (
    <button
      type="button"
      disabled={page.step.id === 'tomorrow' && !tomorrow.trim()}
      onClick={() => {
        if (page.step.id === 'tomorrow') saveNextObjective(tomorrow, nextDay)
        advance(checkSkipped, page.step.id)
      }}
      className={PRIMARY}
    >
      {last ? 'Close the day' : 'Done'}
    </button>
  )

  const secondary = page.kind === 'check' ? (
    <button type="button" onClick={() => { setCheckSkipped(true); advance(true) }} className={TEXT}>Not now</button>
  ) : i === firstNight ? (
    <button type="button" onClick={() => onDone({ checkSkipped, nightSkipped: true, nightDone: false })} className={TEXT}>Not tonight</button>
  ) : (
    <button type="button" onClick={() => advance()} className={TEXT}>Skip this one</button>
  )

  return (
    <FlowShell
      index={i}
      total={pages.length}
      title={title}
      speaker={<GuideSpeaker character={speaker.character} stage={speaker.stage} outfit={speaker.outfit} show={speaker.show} state={pose} line={guideLine(speaker.voice, lineKey(), { seed })} />}
      onBack={i > 0 ? () => setI(i - 1) : undefined}
      primary={primary}
      secondary={secondary}
    >
      {content}
    </FlowShell>
  )
}
