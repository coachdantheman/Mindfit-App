'use client'
import { useReturnToGuide } from '@/lib/guide-return'
import TabBar from '@/components/shared/TabBar'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import LessonLinks from '@/components/shared/LessonLinks'
import PageSkeleton from '@/components/shared/PageSkeleton'
import SaveButton from '@/components/shared/SaveButton'
import Dial from '@/components/shared/Dial'
import { useToast } from '@/components/shared/Toast'
import { clearDraft, draftKey, readDraft, writeDraft } from '@/lib/useDraft'
import { localDateISO } from '@/lib/dates'
import { cachedAll } from '@/lib/api-cache'
import { shiftDate } from '@/lib/nutrition'
import WindDown from '@/components/sleep/WindDown'
import SleepDebt from '@/components/sleep/SleepDebt'

interface SleepDraft { bedtime: string; wakeTime: string; quality: number; sleepNotes: string }
interface RecoveryDraft { isRestDay: boolean; activities: { type: string; duration_min: number }[]; recoveryNotes: string }

const RECOVERY_ACTIVITIES = ['Stretching', 'Foam Rolling', 'Ice Bath', 'Sauna', 'Massage', 'Yoga', 'Walking', 'Epsom Salt Bath', 'Compression']

type Tab = 'track' | 'tips'

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')
const clock = (t: string) => format(parseISO(`2000-01-01T${t}`), 'h:mm a')

export default function SleepPage() {
  const returnToGuide = useReturnToGuide()
  const [tab, setTab] = useState<Tab>('track')
  const today = localDateISO()
  // Athletes log in the morning, so the default is last night. Recovery
  // belongs to the day they woke up (the day after the night).
  const lastNight = shiftDate(today, -1)
  const [date, setDate] = useState(lastNight)
  const recoveryDate = shiftDate(date, 1)
  const isDefault = date === lastNight
  const [usual, setUsual] = useState<{ bedtime: string; wakeTime: string } | null>(null)
  const [savingUsual, setSavingUsual] = useState(false)
  const [trend, setTrend] = useState<{ entry_date: string; hours_slept: number | null }[]>([])

  // Sleep form state
  const [bedtime, setBedtime] = useState('')
  const [wakeTime, setWakeTime] = useState('')
  const [quality, setQuality] = useState(7)
  const [sleepNotes, setSleepNotes] = useState('')
  const [sleepSaved, setSleepSaved] = useState(false)

  // Recovery state
  const [isRestDay, setIsRestDay] = useState(false)
  const [activities, setActivities] = useState<{ type: string; duration_min: number }[]>([])
  const [recoveryNotes, setRecoveryNotes] = useState('')
  const [recoverySaved, setRecoverySaved] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'sleep' | 'recovery' | null>(null)
  const [justSaved, setJustSaved] = useState<'sleep' | 'recovery' | null>(null)
  const notify = useToast()
  const sleepKey = draftKey('sleep')
  const recoveryKey = draftKey('recovery')

  useEffect(() => {
    setLoading(true)
    cachedAll([
      `/api/sleep/entries?date=${date}`,
      `/api/sleep/recovery?date=${recoveryDate}`,
      '/api/profile',
      '/api/sleep/entries',
    ], ([sleepData, recoveryData, profile, allSleep]: [
      { bedtime: string | null; wake_time: string | null; sleep_quality: number | null; notes: string | null }[],
      { is_rest_day: boolean; activities: { type: string; duration_min: number }[] | null; notes: string | null }[],
      { default_bedtime?: string | null; default_wake_time?: string | null } | null,
      { entry_date: string; hours_slept: number | null }[],
    ]) => {
      const u = profile?.default_bedtime && profile?.default_wake_time
        ? { bedtime: hhmm(profile.default_bedtime), wakeTime: hhmm(profile.default_wake_time) }
        : null
      setUsual(u)
      setTrend(Array.isArray(allSleep) ? allSleep : [])
      const draft = isDefault ? readDraft<SleepDraft>(sleepKey) : null
      if (sleepData.length > 0) {
        const s = sleepData[0]
        setBedtime(hhmm(s.bedtime))
        setWakeTime(hhmm(s.wake_time))
        setQuality(s.sleep_quality || 7)
        setSleepNotes(s.notes || '')
        setSleepSaved(true)
      } else if (draft) {
        setBedtime(draft.bedtime); setWakeTime(draft.wakeTime); setQuality(draft.quality); setSleepNotes(draft.sleepNotes)
        setSleepSaved(false)
      } else {
        setBedtime(u?.bedtime ?? '22:30'); setWakeTime(u?.wakeTime ?? '06:30'); setQuality(7); setSleepNotes('')
        setSleepSaved(false)
      }
      const rDraft = isDefault ? readDraft<RecoveryDraft>(recoveryKey) : null
      if (recoveryData.length > 0) {
        const r = recoveryData[0]
        setIsRestDay(r.is_rest_day)
        setActivities(r.activities || [])
        setRecoveryNotes(r.notes || '')
        setRecoverySaved(true)
      } else if (rDraft) {
        setIsRestDay(rDraft.isRestDay); setActivities(rDraft.activities); setRecoveryNotes(rDraft.recoveryNotes)
        setRecoverySaved(false)
      } else {
        setIsRestDay(false); setActivities([]); setRecoveryNotes('')
        setRecoverySaved(false)
      }
      setLoading(false)
    })
  }, [date, recoveryDate, isDefault, sleepKey, recoveryKey])

  // Unsaved edits persist across tab switches and reloads.
  useEffect(() => {
    if (loading || sleepSaved || !isDefault) return
    writeDraft<SleepDraft>(sleepKey, { bedtime, wakeTime, quality, sleepNotes })
  }, [bedtime, wakeTime, quality, sleepNotes, loading, sleepSaved, sleepKey, isDefault])
  useEffect(() => {
    if (loading || recoverySaved || !isDefault) return
    writeDraft<RecoveryDraft>(recoveryKey, { isRestDay, activities, recoveryNotes })
  }, [isRestDay, activities, recoveryNotes, loading, recoverySaved, recoveryKey, isDefault])

  const usualDiffers = !!bedtime && !!wakeTime && (bedtime !== usual?.bedtime || wakeTime !== usual?.wakeTime)

  const saveUsual = async () => {
    setSavingUsual(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_bedtime: bedtime, default_wake_time: wakeTime }),
      })
      if (res.ok) { setUsual({ bedtime, wakeTime }); notify(`Usual times saved: ${clock(bedtime)} – ${clock(wakeTime)}`) }
      else notify('Could not save your usual times.', 'error')
    } catch {
      notify("Couldn't save your usual times. Check your connection.", 'error')
    } finally {
      setSavingUsual(false)
    }
  }

  const calcHours = () => {
    if (!bedtime || !wakeTime) return null
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    let bedMins = bh * 60 + bm
    let wakeMins = wh * 60 + wm
    if (wakeMins <= bedMins) wakeMins += 24 * 60
    return ((wakeMins - bedMins) / 60).toFixed(1)
  }

  const hours = calcHours()

  const saveSleep = async () => {
    setSaving('sleep')
    try {
      const res = await fetch('/api/sleep/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: date,
          bedtime: bedtime || null,
          wake_time: wakeTime || null,
          hours_slept: hours ? parseFloat(hours) : null,
          sleep_quality: quality,
          notes: sleepNotes || null,
        }),
      })
      if (res.ok) { setSleepSaved(true); setJustSaved('sleep'); if (isDefault) clearDraft(sleepKey); notify('Sleep log saved'); returnToGuide() }
      else notify('Could not save your sleep log.', 'error')
      } catch {
      notify('Could not save your sleep log. Check your connection.', 'error')
    } finally {
      setSaving(null)
    }
  }

  const saveRecovery = async () => {
    setSaving('recovery')
    try {
      const res = await fetch('/api/sleep/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: recoveryDate,
          is_rest_day: isRestDay,
          activities,
          notes: recoveryNotes || null,
        }),
      })
      if (res.ok) { setRecoverySaved(true); setJustSaved('recovery'); if (isDefault) clearDraft(recoveryKey); notify('Recovery saved'); returnToGuide() }
      else notify('Could not save your recovery log.', 'error')
      } catch {
      notify('Could not save your recovery log. Check your connection.', 'error')
    } finally {
      setSaving(null)
    }
  }

  const toggleActivity = (type: string) => {
    setRecoverySaved(false)
    setActivities(prev => {
      const exists = prev.find(a => a.type === type)
      if (exists) return prev.filter(a => a.type !== type)
      return [...prev, { type, duration_min: 15 }]
    })
  }

  const nights = Array.from({ length: 14 }, (_, i) => {
    const d = shiftDate(lastNight, i - 13)
    const row = trend.find(t => t.entry_date === d)
    return { date: d, hours: row?.hours_slept == null ? null : Number(row.hours_slept) }
  })

  const hoursNum = hours ? parseFloat(hours) : 0
  const sleepColor = hoursNum >= 7 && hoursNum <= 9 ? 'text-green-400' : hoursNum > 0 ? 'text-orange-400' : 'text-fg-4'

  if (loading) return <PageSkeleton variant="sleep" title="Sleep & Recovery" />

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Sleep & Recovery</h1>
        <p className="page-subtitle">Night of {format(parseISO(date), 'EEEE, MMMM d')}{isDefault ? ' (last night)' : ' · back-logged'}</p>
      </div>

      <TabBar label="Sleep sections" tabs={[{ key: 'track' as Tab, label: 'Track' }, { key: 'tips' as Tab, label: 'Tips & Recovery' }]} active={tab} onSelect={setTab} />

      {/* Both tabs stay mounted so unsaved edits survive switching. */}
      {(
        <div className={`space-y-5 ${tab === 'track' ? '' : 'hidden'}`}>
          {/* Sleep Tracking */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-semibold text-fg-1">Sleep Log</h3>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="sleep-date" className="text-xs text-fg-4">Night of</label>
                <input id="sleep-date"
                  type="date"
                  value={date}
                  max={lastNight}
                  onChange={e => { if (e.target.value && e.target.value <= lastNight) setDate(e.target.value) }}
                  className="input-field min-w-0 sm:w-auto py-1.5 text-xs text-fg-2 focus:ring-2 focus:ring-cta/50"
                />
                {!isDefault && (
                  <button type="button" onClick={() => setDate(lastNight)} className="text-xs text-cta hover:underline">Last night</button>
                )}
              </div>
            </div>
            <p className="text-sm text-fg-4 mb-5">Champions are built in recovery. Aim for 7–9 hours every night.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="sleep-bedtime" className="text-sm text-fg-3 block mb-1">Bedtime</label>
                  <input id="sleep-bedtime"
                    type="time"
                    value={bedtime}
                    onChange={e => { setBedtime(e.target.value); setSleepSaved(false) }}
                    className="w-full min-w-0 bg-surface-2 border border-edge rounded-xl px-4 py-2.5 text-sm text-fg-1 focus:ring-2 focus:ring-cta/50"
                  />
                </div>
                <div>
                  <label htmlFor="sleep-wake-time" className="text-sm text-fg-3 block mb-1">Wake Time</label>
                  <input id="sleep-wake-time"
                    type="time"
                    value={wakeTime}
                    onChange={e => { setWakeTime(e.target.value); setSleepSaved(false) }}
                    className="w-full min-w-0 bg-surface-2 border border-edge rounded-xl px-4 py-2.5 text-sm text-fg-1 focus:ring-2 focus:ring-cta/50"
                  />
                </div>
              </div>
              {hours && (
                <p className={`text-2xl font-bold ${sleepColor}`}>{hours}h</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-4">
                {usual && (
                  <>
                    <span>Usual: {clock(usual.bedtime)} – {clock(usual.wakeTime)}</span>
                    {(bedtime !== usual.bedtime || wakeTime !== usual.wakeTime) && (
                      <button type="button" onClick={() => { setBedtime(usual.bedtime); setWakeTime(usual.wakeTime); setSleepSaved(false) }} className="text-cta hover:underline">
                        Use usual times
                      </button>
                    )}
                  </>
                )}
                {usualDiffers && (
                  <button type="button" onClick={saveUsual} disabled={savingUsual} className="text-cta hover:underline disabled:opacity-50">
                    {savingUsual ? 'Saving…' : usual ? 'Save these as my usual times' : 'Set as my usual times'}
                  </button>
                )}
              </div>

              <Dial
                label="Sleep quality"
                value={quality}
                onChange={v => { setQuality(v); setSleepSaved(false) }}
                lowLabel="Rough"
                highLabel="Great"
              />

              <div>
                <label htmlFor="sleep-notes" className="text-sm text-fg-3 block mb-1">Notes</label>
                <textarea id="sleep-notes"
                  value={sleepNotes}
                  onChange={e => { setSleepNotes(e.target.value); setSleepSaved(false) }}
                  placeholder="How did you sleep? Any disruptions?"
                  rows={2}
                  className="textarea-field"
                />
              </div>

              <SaveButton
                type="button"
                state={saving === 'sleep' ? 'saving' : justSaved === 'sleep' ? 'saved' : 'idle'}
                idleLabel={sleepSaved ? 'Saved ✓' : 'Save Sleep Log'}
                disabled={sleepSaved || saving !== null}
                onClick={saveSleep}
                className="sm:w-auto"
              />
            </div>
          </div>

          <SleepDebt nights={nights} />
          <WindDown />

          {/* Recovery */}
          <div className="card p-6">
            <h3 className="font-semibold text-fg-1 mb-1">Recovery</h3>
            <p className="text-sm text-fg-4 mb-5">Muscle and memory are built in rest. Work hard, rest harder.</p>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRestDay}
                  onChange={() => { setIsRestDay(!isRestDay); setRecoverySaved(false) }}
                  className="sr-only peer"
                />
                <div
                  aria-hidden="true"
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cta ${
                    isRestDay ? 'bg-cta border-cta' : 'border-edge hover:border-fg-4'
                  }`}
                >
                  {isRestDay && (
                    <svg className="w-4 h-4 text-fg-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-fg-2 font-medium">{isDefault ? 'Today is a rest day' : 'Rest day'}</span>
              </label>

              <div>
                <label className="text-sm text-fg-3 block mb-2">Recovery Activities</label>
                <div className="flex flex-wrap gap-2">
                  {RECOVERY_ACTIVITIES.map(act => {
                    const selected = activities.some(a => a.type === act)
                    return (
                      <button
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`px-3 py-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-medium transition-colors ${
                          selected ? 'bg-cta/20 text-cta border border-cta/30' : 'text-fg-4 border border-edge hover:text-fg-2'
                        }`}
                      >
                        {act}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="sleep-notes-2" className="text-sm text-fg-3 block mb-1">Notes</label>
                <textarea id="sleep-notes-2"
                  value={recoveryNotes}
                  onChange={e => { setRecoveryNotes(e.target.value); setRecoverySaved(false) }}
                  placeholder="How are you recovering? Any soreness?"
                  rows={2}
                  className="textarea-field"
                />
              </div>

              <SaveButton
                type="button"
                state={saving === 'recovery' ? 'saving' : justSaved === 'recovery' ? 'saved' : 'idle'}
                idleLabel={recoverySaved ? 'Saved ✓' : 'Save Recovery'}
                disabled={recoverySaved || saving !== null}
                onClick={saveRecovery}
                className="sm:w-auto"
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'tips' && (
        <div className="space-y-5">
          <div className="card p-6">
            <h3 className="font-semibold text-fg-1 mb-3">Sleep Better Tonight</h3>
            <ul className="space-y-3">
              {[
                { title: 'Consistent schedule', desc: 'Go to bed and wake up at the same time every day, even weekends.' },
                { title: 'Screen curfew', desc: 'Put your phone down 30–60 minutes before bed. Blue light suppresses melatonin.' },
                { title: 'Cool & dark room', desc: 'Keep your room between 65–68°F. Use blackout curtains if possible.' },
                { title: 'No caffeine after 2pm', desc: 'Caffeine has a half-life of 5–6 hours. That afternoon coffee is still in your system at midnight.' },
                { title: 'Wind-down routine', desc: 'Read, stretch, breathe, or journal. Give your brain a signal that it\'s time to power down.' },
                { title: 'Limit late meals', desc: 'Finish eating 2–3 hours before bed. A full stomach disrupts sleep cycles.' },
              ].map(tip => (
                <li key={tip.title} className="flex gap-3">
                  <span className="text-cta mt-0.5">•</span>
                  <div>
                    <p className="text-sm font-medium text-fg-2">{tip.title}</p>
                    <p className="text-xs text-fg-4">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-fg-1 mb-3">Reduce Stress</h3>
            <ul className="space-y-3">
              {[
                { title: 'Box breathing', desc: 'Inhale 4 sec → Hold 4 sec → Exhale 4 sec → Hold 4 sec. Repeat 5 rounds.' },
                { title: 'Gratitude practice', desc: 'Write 3 things you\'re grateful for. Shifts your nervous system out of fight-or-flight.' },
                { title: 'Move your body', desc: 'Even a 10-minute walk resets cortisol levels and clears your head.' },
                { title: 'Talk it out', desc: 'Share what\'s on your mind with a teammate, coach, or parent. Don\'t carry it alone.' },
                { title: 'Progressive muscle relaxation', desc: 'Tense each muscle group for 5 seconds, then release. Start from your feet and work up.' },
              ].map(tip => (
                <li key={tip.title} className="flex gap-3">
                  <span className="text-cta mt-0.5">•</span>
                  <div>
                    <p className="text-sm font-medium text-fg-2">{tip.title}</p>
                    <p className="text-xs text-fg-4">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-r from-cta/10 to-brand-600/10 rounded-2xl border border-cta/20 p-6">
            <h3 className="font-semibold text-cta mb-2">Rest = Growth</h3>
            <p className="text-sm text-fg-2">
              Muscle is broken down in training but built during rest. Memory consolidation happens during deep sleep.
              Your body and brain need recovery to adapt and grow stronger. Rest days aren&apos;t lazy days. They&apos;re growth days.
            </p>
          </div>
        </div>
      )}

      <LessonLinks section="sleep" />
    </div>
  )
}
