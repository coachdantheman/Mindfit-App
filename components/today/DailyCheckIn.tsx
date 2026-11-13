'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import BottomSheet from '@/components/shared/BottomSheet'
import Stepper from '@/components/shared/Stepper'
import Dial from '@/components/shared/Dial'
import CrisisNote from '@/components/shared/CrisisNote'
import LowScoreNote from '@/components/shared/LowScoreNote'
import RatingSlider from '@/components/journal/RatingSlider'
import SaveButton, { SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import FlowShell from '@/components/guide/FlowShell'
import RoutinePage from '@/components/guide/RoutinePage'
import GuideSpeaker from '@/components/guide/GuideSpeaker'
import type { Species } from '@/components/guide/art/Character'
import { guideLine, type LineKey } from '@/lib/data/guide-lines'
import { routineByKey, readRoutineChecks, writeRoutineChecks } from '@/lib/data/routines'
import { sleepKey, daySeed } from '@/lib/guide-brain'
import type { Voice } from '@/lib/guide-characters'
import { readNextObjective, saveNextObjective } from '@/lib/guide'
import type { TodayData } from '@/lib/guide'
import { readDraft, writeDraft, clearDraft, draftKey } from '@/lib/useDraft'
import { haptic } from '@/lib/haptics'
import { localDateISO } from '@/lib/dates'

type Step = 'sleep' | 'feel' | 'objective' | 'lock' | 'water' | 'identity' | 'breathe' | 'see'
type Mode = 'check-in' | 'morning'

interface Props {
  today: string
  data: TodayData
  onClose: () => void
  onSaved: () => void
  // Full-screen pages inside the Daily Guide instead of a bottom sheet.
  inline?: boolean
  mode?: Mode
  speaker?: { character: Species; voice: Voice; show: boolean }
}

type Ratings = { motivation: number; focus: number; confidence: number; anxiety: number }
type Draft = {
  i: number
  hours: number
  quality: number
  sleepTouched: boolean
  ratings: Ratings
  objective: string
  routineDone: string[]
}

const SWIPE_PX = 60
const ROUTINE_PAGES: Step[] = ['water', 'identity', 'breathe', 'see']
const MORNING_IDS = routineByKey('morning').steps.map(s => s.id)

export default function DailyCheckIn({ today, data, onClose, onSaved, inline = false, mode = 'check-in', speaker }: Props) {
  const notify = useToast()
  const hasJournal = !!data.journal
  const steps: Step[] = mode === 'morning'
    ? ['sleep', 'water', 'identity', 'breathe', 'see', 'objective', 'feel']
    : hasJournal ? ['sleep', 'lock'] : ['sleep', 'feel', 'objective', 'lock']
  const night = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return localDateISO(d)
  })()
  const dKey = draftKey('guide-' + mode)
  const TITLES: Record<Step, string> = {
    sleep: 'Last night',
    water: 'Morning routine · 1 of 5',
    identity: 'Morning routine · 2 of 5',
    breathe: 'Morning routine · 3 of 5',
    see: 'Morning routine · 4 of 5',
    objective: mode === 'morning' ? 'Morning routine · 5 of 5' : 'Today',
    feel: 'Right now',
    lock: 'Lock it in',
  }

  const [savedDraft] = useState(() => readDraft<Draft>(dKey))
  const [i, setI] = useState(() => Math.min(Math.max(savedDraft?.i ?? 0, 0), steps.length - 1))
  const step = steps[i]
  const last = i === steps.length - 1
  const [hours, setHours] = useState((savedDraft?.sleepTouched ? savedDraft.hours : null) ?? data.sleep?.hours_slept ?? 8)
  const [quality, setQuality] = useState((savedDraft?.sleepTouched ? savedDraft.quality : null) ?? data.sleep?.sleep_quality ?? 7)
  // A draft's sleep counts only if the athlete set it; otherwise a real entry logged since wins.
  // With no entry for last night, 8 hr and 7 are only starting points:
  // sleep is saved only once the athlete moves one of them.
  const [sleepTouched, setSleepTouched] = useState(savedDraft?.sleepTouched ?? false)
  const logSleep = !!data.sleep || sleepTouched
  const [ratings, setRatings] = useState<Ratings>(savedDraft?.ratings ?? { motivation: 5, focus: 5, confidence: 5, anxiety: 5 })
  const [objective, setObjective] = useState(() => (savedDraft ? savedDraft.objective : readNextObjective()))
  const [routineDone, setRoutineDone] = useState<string[]>(savedDraft?.routineDone ?? [])
  const [state, setState] = useState<SaveState>('idle')
  const savedSleep = useRef<string | null>(null)
  const sleepSig = `${hours}|${quality}`

  useEffect(() => {
    writeDraft<Draft>(dKey, { i, hours, quality, sleepTouched, ratings, objective, routineDone })
  }, [dKey, i, hours, quality, sleepTouched, ratings, objective, routineDone])

  const canAdvance = step !== 'objective' || objective.trim().length > 0

  const markRoutine = (id: string) => setRoutineDone(prev => (prev.includes(id) ? prev : [...prev, id]))

  const saveSleep = async (): Promise<boolean> => {
    const res = await fetch('/api/sleep/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: night,
        hours_slept: hours,
        sleep_quality: quality,
        bedtime: data.sleep?.bedtime ?? null,
        wake_time: data.sleep?.wake_time ?? null,
        notes: data.sleep?.notes ?? null,
      }),
    })
    if (res.ok) savedSleep.current = sleepSig
    return res.ok
  }

  const go = (delta: 1 | -1) => {
    const next = i + delta
    if (next < 0 || next >= steps.length) return
    if (delta === 1 && !canAdvance) return
    if (delta === 1 && step === 'sleep' && logSleep && savedSleep.current !== sleepSig) saveSleep().catch(() => {})
    setI(next)
  }

  // Swipe left for next, right for back. Taps on controls and sliders never turn the page.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return
    if ((e.target as HTMLElement).closest('[role="slider"], button, input, textarea, a')) return
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(dx < 0 ? 1 : -1)
  }

  const setRating = (key: keyof Ratings, v: number) => setRatings(prev => ({ ...prev, [key]: v }))

  const save = async () => {
    if (state === 'saving' || state === 'saved') return
    setState('saving')
    try {
      if (logSleep && savedSleep.current !== sleepSig) {
        if (!(await saveSleep())) throw new Error('sleep')
      }

      if (!hasJournal) {
        const journalRes = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_date: today,
            objective: objective.trim(),
            action_step_1: '', action_step_2: '', action_step_3: '',
            strength_1: '', strength_2: '', strength_3: '',
            weakness: '',
            rating_motivation: ratings.motivation,
            rating_focus: ratings.focus,
            rating_confidence: ratings.confidence,
            rating_anxiety: ratings.anxiety,
          }),
        })
        if (!journalRes.ok && journalRes.status !== 409) throw new Error('journal')
        saveNextObjective('')
      }

      if (mode === 'morning') {
        const ids = Array.from(new Set([...readRoutineChecks('morning', today), ...routineDone, 'objective']))
        writeRoutineChecks('morning', today, ids)
        if (MORNING_IDS.every(id => ids.includes(id))) {
          fetch('/api/mindset/routine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day: today, kind: 'morning' }),
          }).catch(() => {})
        }
      }

      setState('saved')
      haptic.success()
      notify('Check-in done')
      clearDraft(dKey)
      onSaved()
      onClose()
    } catch {
      setState('error')
      notify('Check-in did not save. Try again.', 'error')
    }
  }

  const lineKey = (): LineKey => {
    switch (step) {
      case 'sleep': return sleepKey(hours, logSleep)
      case 'water': return 'routine.water'
      case 'identity': return 'routine.identity'
      case 'breathe': return 'routine.breathe'
      case 'see': return 'routine.see'
      case 'objective': return 'routine.objective'
      case 'feel': return mode === 'morning' ? 'ratings.morning' : 'ratings.ask'
      case 'lock': return 'lock.identity'
    }
  }
  const speakerNode = speaker ? (
    <GuideSpeaker character={speaker.character} show={speaker.show} line={guideLine(speaker.voice, lineKey(), { seed: daySeed(today) })} />
  ) : undefined

  const routineStep = ROUTINE_PAGES.includes(step) ? routineByKey('morning').steps.find(s => s.id === step) : undefined
  const isRoutine = ROUTINE_PAGES.includes(step)

  const progress = (
        <div className="h-1 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-label="Check-in progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
          <div className="h-full bg-cta transition-[width] duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
  )
  const content = (
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }} className="min-h-[300px]">
        {routineStep && (
          <RoutinePage key={step} step={routineStep} done={routineDone.includes(step)} onTimerDone={() => markRoutine(step)}>
            {step === 'identity' && (
              <p className="text-xl font-semibold leading-snug tracking-tight text-fg-1 text-center">{data.affirmation ?? 'I act from my identity, not my mood.'}</p>
            )}
          </RoutinePage>
        )}

        {step === 'sleep' && (
          <div key="sleep" className="mf-rise space-y-8 pt-2">
            <Stepper label="Hours slept" value={hours} onChange={v => { setHours(v); setSleepTouched(true) }} min={0} max={14} step={0.5} unit="hr" />
            <Dial label="Sleep quality" value={quality} onChange={v => { setQuality(v); setSleepTouched(true) }} lowLabel="Rough" highLabel="Great" />
            {!logSleep && (
              <div className="text-center space-y-2">
                <p className="text-xs text-fg-4">Set last night's sleep, or confirm these.</p>
                <button type="button" onClick={() => setSleepTouched(true)} className="btn-secondary text-xs">8 hr and 7 is right</button>
              </div>
            )}
          </div>
        )}

        {step === 'feel' && (
          // Inside the guide the sliders drop their tick rows so the page fits one phone screen.
          <div key="feel" className="mf-rise space-y-4">
            <RatingSlider compact={inline} label="Motivation" value={ratings.motivation} onChange={v => setRating('motivation', v)} color="bg-blue-500" />
            <RatingSlider compact={inline} label="Focus" value={ratings.focus} onChange={v => setRating('focus', v)} color="bg-purple-500" />
            <RatingSlider compact={inline} label="Confidence" value={ratings.confidence} onChange={v => setRating('confidence', v)} color="bg-green-500" />
            <RatingSlider compact={inline} label="Anxiety" hint="Lower is better" value={ratings.anxiety} onChange={v => setRating('anxiety', v)} color="bg-orange-500" />
            {ratings.anxiety >= 8 && <CrisisNote />}
            <LowScoreNote ratings={ratings} links={false} />
          </div>
        )}

        {step === 'objective' && (
          <div key="objective" className="mf-rise space-y-3 pt-2">
            <label htmlFor="checkin-objective" className="text-sm text-fg-3">Today&apos;s objective</label>
            <input
              id="checkin-objective"
              type="text"
              autoFocus
              data-autofocus
              maxLength={200}
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="One thing I will do today"
              className="input-field py-3"
            />
          </div>
        )}

        {step === 'lock' && (
          <div key="lock" className="mf-rise text-center space-y-6 py-6">
            {data.affirmation ? (
              <p className="text-2xl font-semibold leading-snug tracking-tight text-fg-1">{data.affirmation}</p>
            ) : (
              <>
                <p className="text-2xl font-semibold leading-snug tracking-tight text-fg-1">I act from my identity, not my mood.</p>
                <Link href="/mindset?tab=Affirmations" onClick={onClose} className="text-sm text-cta hover:underline">Add your own →</Link>
              </>
            )}
          </div>
        )}
      </div>
  )

  if (inline) {
    return (
      <FlowShell
        index={i}
        total={steps.length}
        title={TITLES[step]}
        speaker={speakerNode}
        onBack={i > 0 ? () => go(-1) : undefined}
        backDisabled={state === 'saving'}
        primary={
          last ? (
            <SaveButton state={state} idleLabel="Lock in my day" onClick={save} type="button" className="h-14 rounded-full" />
          ) : isRoutine ? (
            <button type="button" onClick={() => { markRoutine(step); go(1) }} className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors">
              Done
            </button>
          ) : (
            <button type="button" onClick={() => go(1)} disabled={!canAdvance} className="w-full h-14 rounded-full bg-cta text-fg-inverse font-semibold tracking-wide hover:bg-brand-600 transition-colors disabled:opacity-40">
              Next
            </button>
          )
        }
        secondary={
          isRoutine ? (
            <button type="button" onClick={() => go(1)} className="text-sm text-fg-4 hover:text-fg-2 min-h-[44px] px-4">Skip this one</button>
          ) : undefined
        }
      >
        {content}
      </FlowShell>
    )
  }

  return (
    <BottomSheet
      title="Daily check-in"
      onClose={onClose}
      header={progress}
      footer={
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => go(-1)} disabled={i === 0 || state === 'saving'} className="btn-secondary px-5 py-3 shrink-0 disabled:opacity-40">
            Back
          </button>
          {last ? (
            <SaveButton state={state} idleLabel="Finish check-in" onClick={save} type="button" className="py-3" />
          ) : (
            <button type="button" onClick={() => go(1)} disabled={!canAdvance} className="btn-primary w-full py-3 disabled:opacity-40">
              Next
            </button>
          )}
        </div>
      }
    >
      {content}
    </BottomSheet>
  )
}
