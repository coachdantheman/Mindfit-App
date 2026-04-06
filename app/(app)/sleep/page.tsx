'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

const RECOVERY_ACTIVITIES = ['Stretching', 'Foam Rolling', 'Ice Bath', 'Massage', 'Yoga', 'Walking', 'Epsom Salt Bath', 'Compression']

type Tab = 'track' | 'tips'

export default function SleepPage() {
  const [tab, setTab] = useState<Tab>('track')
  const today = new Date().toISOString().split('T')[0]

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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/sleep/entries?date=${today}`).then(r => r.json()),
      fetch(`/api/sleep/recovery?date=${today}`).then(r => r.json()),
    ]).then(([sleepData, recoveryData]) => {
      if (sleepData.length > 0) {
        const s = sleepData[0]
        setBedtime(s.bedtime || '')
        setWakeTime(s.wake_time || '')
        setQuality(s.sleep_quality || 7)
        setSleepNotes(s.notes || '')
        setSleepSaved(true)
      }
      if (recoveryData.length > 0) {
        const r = recoveryData[0]
        setIsRestDay(r.is_rest_day)
        setActivities(r.activities || [])
        setRecoveryNotes(r.notes || '')
        setRecoverySaved(true)
      }
      setLoading(false)
    })
  }, [today])

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
    setSaving(true)
    const res = await fetch('/api/sleep/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: today,
        bedtime: bedtime || null,
        wake_time: wakeTime || null,
        hours_slept: hours ? parseFloat(hours) : null,
        sleep_quality: quality,
        notes: sleepNotes || null,
      }),
    })
    if (res.ok) setSleepSaved(true)
    setSaving(false)
  }

  const saveRecovery = async () => {
    setSaving(true)
    const res = await fetch('/api/sleep/recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entry_date: today,
        is_rest_day: isRestDay,
        activities,
        notes: recoveryNotes || null,
      }),
    })
    if (res.ok) setRecoverySaved(true)
    setSaving(false)
  }

  const toggleActivity = (type: string) => {
    setRecoverySaved(false)
    setActivities(prev => {
      const exists = prev.find(a => a.type === type)
      if (exists) return prev.filter(a => a.type !== type)
      return [...prev, { type, duration_min: 15 }]
    })
  }

  const hoursNum = hours ? parseFloat(hours) : 0
  const sleepColor = hoursNum >= 7 && hoursNum <= 9 ? 'text-green-400' : hoursNum > 0 ? 'text-orange-400' : 'text-gray-500'

  if (loading) return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100 mb-2">Sleep & Recovery</h1>
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Sleep & Recovery</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        {(['track', 'tips'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-cta/20 text-cta border border-cta/30' : 'text-gray-500 border border-white/10 hover:text-gray-300'
            }`}
          >
            {t === 'track' ? 'Track' : 'Tips & Recovery'}
          </button>
        ))}
      </div>

      {tab === 'track' && (
        <div className="space-y-5">
          {/* Sleep Tracking */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold text-gray-100 mb-1">Sleep Log</h3>
            <p className="text-sm text-gray-500 mb-5">Champions are built in recovery. Aim for 7–9 hours every night.</p>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Bedtime</label>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={e => { setBedtime(e.target.value); setSleepSaved(false) }}
                    className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1">Wake Time</label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={e => { setWakeTime(e.target.value); setSleepSaved(false) }}
                    className="bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-cta/50"
                  />
                </div>
                {hours && (
                  <div className="flex flex-col justify-end">
                    <p className={`text-2xl font-bold ${sleepColor}`}>{hours}h</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Sleep Quality: <span className="text-gray-200 font-medium">{quality}/10</span></label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={quality}
                  onChange={e => { setQuality(parseInt(e.target.value)); setSleepSaved(false) }}
                  className="w-full accent-[#C4B400]"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Poor</span>
                  <span>Great</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Notes</label>
                <textarea
                  value={sleepNotes}
                  onChange={e => { setSleepNotes(e.target.value); setSleepSaved(false) }}
                  placeholder="How did you sleep? Any disruptions?"
                  rows={2}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50 resize-none"
                />
              </div>

              <button
                onClick={saveSleep}
                disabled={saving || sleepSaved}
                className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : sleepSaved ? 'Success ✓' : 'Save Sleep Log'}
              </button>
            </div>
          </div>

          {/* Recovery */}
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold text-gray-100 mb-1">Recovery</h3>
            <p className="text-sm text-gray-500 mb-5">Muscle and memory are built in rest. Work hard, rest harder.</p>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => { setIsRestDay(!isRestDay); setRecoverySaved(false) }}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isRestDay ? 'bg-cta border-cta' : 'border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {isRestDay && (
                    <svg className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-gray-200 font-medium">Today is a rest day</span>
              </label>

              <div>
                <label className="text-sm text-gray-400 block mb-2">Recovery Activities</label>
                <div className="flex flex-wrap gap-2">
                  {RECOVERY_ACTIVITIES.map(act => {
                    const selected = activities.some(a => a.type === act)
                    return (
                      <button
                        key={act}
                        onClick={() => toggleActivity(act)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selected ? 'bg-cta/20 text-cta border border-cta/30' : 'text-gray-500 border border-white/10 hover:text-gray-300'
                        }`}
                      >
                        {act}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Notes</label>
                <textarea
                  value={recoveryNotes}
                  onChange={e => { setRecoveryNotes(e.target.value); setRecoverySaved(false) }}
                  placeholder="How are you recovering? Any soreness?"
                  rows={2}
                  className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cta/50 resize-none"
                />
              </div>

              <button
                onClick={saveRecovery}
                disabled={saving || recoverySaved}
                className="bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : recoverySaved ? 'Success ✓' : 'Save Recovery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'tips' && (
        <div className="space-y-5">
          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold text-gray-100 mb-3">Sleep Better Tonight</h3>
            <ul className="space-y-3">
              {[
                { title: 'Consistent schedule', desc: 'Go to bed and wake up at the same time every day — even weekends.' },
                { title: 'Screen curfew', desc: 'Put your phone down 30–60 minutes before bed. Blue light suppresses melatonin.' },
                { title: 'Cool & dark room', desc: 'Keep your room between 65–68°F. Use blackout curtains if possible.' },
                { title: 'No caffeine after 2pm', desc: 'Caffeine has a half-life of 5–6 hours. That afternoon coffee is still in your system at midnight.' },
                { title: 'Wind-down routine', desc: 'Read, stretch, breathe, or journal. Give your brain a signal that it\'s time to power down.' },
                { title: 'Limit late meals', desc: 'Finish eating 2–3 hours before bed. A full stomach disrupts sleep cycles.' },
              ].map(tip => (
                <li key={tip.title} className="flex gap-3">
                  <span className="text-cta mt-0.5">•</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{tip.title}</p>
                    <p className="text-xs text-gray-500">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold text-gray-100 mb-3">Reduce Stress</h3>
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
                    <p className="text-sm font-medium text-gray-200">{tip.title}</p>
                    <p className="text-xs text-gray-500">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-r from-cta/10 to-brand-600/10 rounded-2xl border border-cta/20 p-6">
            <h3 className="font-semibold text-cta mb-2">Rest = Growth</h3>
            <p className="text-sm text-gray-300">
              Muscle is broken down in training but built during rest. Memory consolidation happens during deep sleep.
              Your body and brain need recovery to adapt and grow stronger. Rest days aren&apos;t lazy days — they&apos;re growth days.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
