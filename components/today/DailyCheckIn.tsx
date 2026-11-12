'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import BottomSheet from '@/components/shared/BottomSheet'
import Stepper from '@/components/shared/Stepper'
import Dial from '@/components/shared/Dial'
import CrisisNote from '@/components/shared/CrisisNote'
import RatingSlider from '@/components/journal/RatingSlider'
import SaveButton, { SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { haptic } from '@/lib/haptics'
import { localDateISO } from '@/lib/dates'
import type { TodayData } from './TodayCard'

type Step = 'sleep' | 'feel' | 'objective' | 'lock'

interface Props {
  today: string
  data: TodayData
  onClose: () => void
  onSaved: () => void
}

type Ratings = { motivation: number; focus: number; confidence: number; anxiety: number }

const SWIPE_PX = 60

export default function DailyCheckIn({ today, data, onClose, onSaved }: Props) {
  const notify = useToast()
  const hasJournal = !!data.journal
  const steps: Step[] = hasJournal ? ['sleep', 'lock'] : ['sleep', 'feel', 'objective', 'lock']
  const night = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return localDateISO(d)
  })()

  const [i, setI] = useState(0)
  const step = steps[i]
  const last = i === steps.length - 1
  const [hours, setHours] = useState(data.sleep?.hours_slept ?? 8)
  const [quality, setQuality] = useState(data.sleep?.sleep_quality ?? 7)
  // With no entry for last night, 8 hr and 7 are only starting points:
  // sleep is saved only once the athlete moves one of them.
  const [sleepTouched, setSleepTouched] = useState(false)
  const logSleep = !!data.sleep || sleepTouched
  const [ratings, setRatings] = useState<Ratings>({ motivation: 5, focus: 5, confidence: 5, anxiety: 5 })
  const [objective, setObjective] = useState('')
  const [state, setState] = useState<SaveState>('idle')

  const canAdvance = step !== 'objective' || objective.trim().length > 0

  const go = (delta: 1 | -1) => {
    const next = i + delta
    if (next < 0 || next >= steps.length) return
    if (delta === 1 && !canAdvance) return
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
    if (state === 'saving') return
    setState('saving')
    try {
      if (logSleep) {
        const sleepRes = await fetch('/api/sleep/entries', {
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
        if (!sleepRes.ok) throw new Error('sleep')
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
      }

      setState('saved')
      haptic.success()
      notify('Check-in done')
      onSaved()
      onClose()
    } catch {
      setState('error')
      notify('Check-in did not save. Try again.', 'error')
    }
  }

  return (
    <BottomSheet
      title="Daily check-in"
      onClose={onClose}
      header={
        <div className="h-1 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-label="Check-in progress" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
          <div className="h-full bg-cta transition-[width] duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>
      }
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
      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }} className="min-h-[300px]">
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
          <div key="feel" className="mf-rise space-y-4">
            <RatingSlider label="Motivation" value={ratings.motivation} onChange={v => setRating('motivation', v)} color="bg-blue-500" />
            <RatingSlider label="Focus" value={ratings.focus} onChange={v => setRating('focus', v)} color="bg-purple-500" />
            <RatingSlider label="Confidence" value={ratings.confidence} onChange={v => setRating('confidence', v)} color="bg-green-500" />
            <div>
              <RatingSlider label="Anxiety" value={ratings.anxiety} onChange={v => setRating('anxiety', v)} color="bg-orange-500" />
              <p className="text-xs text-fg-4 -mt-1">Lower is calmer</p>
            </div>
            {ratings.anxiety >= 8 && <CrisisNote />}
          </div>
        )}

        {step === 'objective' && (
          <div key="objective" className="mf-rise space-y-3 pt-2">
            <label htmlFor="checkin-objective" className="text-sm text-fg-3">Today&apos;s objective</label>
            <input
              id="checkin-objective"
              type="text"
              autoFocus
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
                <Link href="/mindset?tab=Affirmations" className="text-sm text-cta hover:underline">Add your own →</Link>
              </>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
