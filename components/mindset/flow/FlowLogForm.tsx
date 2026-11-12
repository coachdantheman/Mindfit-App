'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlowTrigger } from '@/types'
import RatingSlider from '@/components/journal/RatingSlider'
import { TRIGGERS } from '@/components/mindset/flow/flow-constants'
import { flowZone, ZONE_COLOR } from '@/components/mindset/flow-logic'

export default function FlowLogForm() {
  const router = useRouter()
  const search = useSearchParams()
  const sessionId = search.get('session')

  const [sport, setSport] = useState('')
  const [primarySport, setPrimarySport] = useState<string | null>(null)
  const [secondarySport, setSecondarySport] = useState<string | null>(null)
  const [challenge, setChallenge] = useState(6)
  const [skill, setSkill] = useState(6)
  const [flow, setFlow] = useState(6)
  const [triggers, setTriggers] = useState<FlowTrigger[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) return
        setPrimarySport(p.primary_sport ?? null)
        setSecondarySport(p.secondary_sport ?? null)
        if (p.primary_sport) setSport(p.primary_sport)
      })
  }, [])

  const zone = flowZone(challenge, skill)
  const diff = challenge - skill

  const toggleTrigger = (t: FlowTrigger) => {
    setTriggers(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t])
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/mindset/flow-state/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow_session_id: sessionId,
          sport: sport || null,
          challenge_level: challenge,
          skill_level: skill,
          flow_score: flow,
          triggers_fired: triggers,
          journal_note: note || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error || 'Failed to save')
        setSaving(false)
        return
      }
      router.push('/mindset')
    } catch {
      setError("Couldn't save. Try again.")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.push('/mindset')} className="text-sm text-fg-4 hover:text-fg-2 mb-4">
        ← Back to Mindset
      </button>
      <h1 className="text-2xl font-bold text-fg-1 mb-1">Log flow session</h1>
      <p className="text-fg-4 text-sm mb-6">Takes less than a minute.</p>

      <div className="card p-6 space-y-6">
        <div>
          <label className="text-sm text-fg-3 block mb-1">Sport</label>
          {primarySport && secondarySport && (
            <div className="flex gap-2 mb-2">
              {[primarySport, secondarySport].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSport(opt)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sport === opt
                      ? 'bg-cta/20 border-cta text-cta'
                      : 'border-edge text-fg-3 hover:text-fg-2'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={sport}
            onChange={e => setSport(e.target.value)}
            placeholder="e.g. Basketball"
            className="input-field"
          />
        </div>

        <RatingSlider label="Challenge level" value={challenge} onChange={setChallenge} color="bg-cta" />
        <RatingSlider label="Skill level today" value={skill} onChange={setSkill} color="bg-cta" />

        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${ZONE_COLOR[zone].tw}`}>
          <span className="text-sm font-semibold">{ZONE_COLOR[zone].label}</span>
          <span className="text-xs tabular-nums">
            challenge {challenge} vs skill {skill} · {diff > 0 ? '+' : ''}{diff} (flow = within 1)
          </span>
        </div>

        <RatingSlider label="Flow score: how in the zone were you?" value={flow} onChange={setFlow} color="bg-cta" />

        <div>
          <p className="text-sm text-fg-3 mb-2">Which triggers fired today?</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map(t => (
              <button
                key={t.code}
                onClick={() => toggleTrigger(t.code)}
                title={t.hint}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  triggers.includes(t.code)
                    ? 'bg-cta/20 border-cta text-cta'
                    : 'border-edge text-fg-3 hover:text-fg-2'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="flowlogform-what-s-one-thing-that-worked-or-didn-t" className="text-sm text-fg-3 block mb-1">What's one thing that worked or didn't?</label>
          <textarea id="flowlogform-what-s-one-thing-that-worked-or-didn-t"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="textarea-field"
            placeholder="Keep it one line."
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button onClick={save} disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save flow log'}
        </button>
      </div>
    </div>
  )
}

