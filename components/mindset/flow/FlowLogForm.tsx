'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FlowStage, FlowTrigger } from '@/types'
import { FLOW_STAGES, STAGE_META, TRIGGERS } from '@/components/mindset/flow/flow-constants'
import { is4PctZone, ZONE_COLOR } from '@/components/mindset/flow-logic'

export default function FlowLogForm() {
  const router = useRouter()
  const search = useSearchParams()
  const sessionId = search.get('session')

  const [sport, setSport] = useState('')
  const [challenge, setChallenge] = useState(6)
  const [skill, setSkill] = useState(6)
  const [flow, setFlow] = useState(6)
  const [stage, setStage] = useState<FlowStage | null>(null)
  const [triggers, setTriggers] = useState<FlowTrigger[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mindset/flow-state/profile').then(r => r.json()).then(p => {
      if (p?.primary_sport) setSport(p.primary_sport)
    })
  }, [])

  const zone = is4PctZone(challenge, skill)
  const delta = skill > 0 ? Math.round(((challenge - skill) / skill) * 100) : 0

  const toggleTrigger = (t: FlowTrigger) => {
    setTriggers(cur => cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t])
  }

  async function save() {
    if (!stage) { setError('Pick an ending stage before saving.'); return }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/mindset/flow-state/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow_session_id: sessionId,
        sport: sport || null,
        challenge_level: challenge,
        skill_level: skill,
        flow_score: flow,
        ending_stage: stage,
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
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => router.push('/mindset')} className="text-sm text-gray-500 hover:text-gray-300 mb-4">
        ← Back to Mindset
      </button>
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Log flow session</h1>
      <p className="text-gray-500 text-sm mb-6">Takes less than a minute.</p>

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-6">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Sport</label>
          <input
            type="text"
            value={sport}
            onChange={e => setSport(e.target.value)}
            placeholder="e.g. Basketball"
            className="input-field"
          />
        </div>

        <Slider label="Challenge level" value={challenge} onChange={setChallenge} />
        <Slider label="Skill level today" value={skill} onChange={setSkill} />

        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${ZONE_COLOR[zone].tw}`}>
          <span className="text-sm font-semibold">{ZONE_COLOR[zone].label}</span>
          <span className="text-xs">
            {delta > 0 ? '+' : ''}{delta}% vs skill · 4% Rule target: +1–8%
          </span>
        </div>

        <Slider label="Flow score — how in the zone were you?" value={flow} onChange={setFlow} />

        <div>
          <p className="text-sm text-gray-400 mb-2">Which stage did you end in?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FLOW_STAGES.map(s => (
              <button
                key={s}
                onClick={() => setStage(s)}
                style={stage === s ? { backgroundColor: STAGE_META[s].hex, borderColor: STAGE_META[s].hex } : undefined}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  stage === s
                    ? 'text-white'
                    : 'border-white/10 text-gray-300 hover:border-white/30'
                }`}
              >
                <span className="mr-1">{STAGE_META[s].emoji}</span>{STAGE_META[s].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2">Which triggers fired today?</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGERS.map(t => (
              <button
                key={t.code}
                onClick={() => toggleTrigger(t.code)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  triggers.includes(t.code)
                    ? 'bg-cta/20 border-cta text-cta'
                    : 'border-white/10 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">What's one thing that worked or didn't?</label>
          <textarea
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

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-cta font-bold tabular-nums">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full accent-cta"
      />
    </div>
  )
}
