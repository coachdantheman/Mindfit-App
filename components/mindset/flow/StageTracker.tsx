'use client'
import { useEffect, useState } from 'react'
import { FlowStage, FlowStageCheckin } from '@/types'
import { FLOW_STAGES, STAGE_META, nextStage } from '@/components/mindset/flow/flow-constants'
import { formatDistanceToNow, parseISO } from 'date-fns'

export default function StageTracker() {
  const [latest, setLatest] = useState<FlowStageCheckin | null>(null)
  const [saving, setSaving] = useState<FlowStage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    fetch('/api/mindset/flow-state/stage-checkins?limit=1')
      .then(async r => {
        if (r.ok) return r.json()
        const body = await r.json().catch(() => ({}))
        if (/schema cache/i.test(body?.error || '')) setUnavailable(true)
        return []
      })
      .then(rows => {
        setLatest(Array.isArray(rows) && rows.length > 0 ? rows[0] : null)
        setLoading(false)
      })
  }, [])

  async function logStage(stage: FlowStage) {
    setSaving(stage)
    setError(null)
    try {
      const res = await fetch('/api/mindset/flow-state/stage-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        const msg = j?.error || `Save failed (${res.status})`
        if (/schema cache/i.test(msg)) setUnavailable(true)
        throw new Error(msg)
      }
      setLatest(await res.json())
    } catch (e: any) {
      setError(e?.message || 'Could not log stage.')
    } finally {
      setSaving(null)
    }
  }

  const suggest = latest ? nextStage(latest.stage) : null

  if (unavailable) {
    return (
      <div className="bg-gray-900 rounded-2xl border border-yellow-500/40 p-5">
        <p className="text-sm font-semibold text-yellow-300 mb-1">Stage tracker temporarily unavailable</p>
        <p className="text-xs text-gray-400">
          Supabase's API server is serving a stale schema cache. To fix:
          in <span className="text-gray-200">Supabase Dashboard → Project Settings → API</span> click
          <span className="text-gray-200"> Restart server</span>, or run
          <code className="mx-1 text-cta"> NOTIFY pgrst, 'reload schema';</code>
          in the SQL editor.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-100">What stage are you in right now?</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Track the 4-stage cycle — Struggle → Release → Flow → Recovery → Struggle. Tap the one you're in.
      </p>

      {!loading && latest && (
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm">
            <span className="text-gray-500">Last check-in: </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: STAGE_META[latest.stage].hex }}
            >
              {STAGE_META[latest.stage].emoji} {STAGE_META[latest.stage].label}
            </span>
            <span className="text-gray-500 ml-2 text-xs">
              {formatDistanceToNow(parseISO(latest.checked_at), { addSuffix: true })}
            </span>
          </div>
          {suggest && (
            <p className="text-xs text-gray-500">
              Next in the cycle:{' '}
              <span className="text-cta font-semibold">{STAGE_META[suggest].label}</span>
              {latest.stage === 'flow' && <span className="text-gray-500"> — always transition through Recovery</span>}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FLOW_STAGES.map(s => {
          const active = latest?.stage === s
          const isSaving = saving === s
          const isSuggested = suggest === s
          return (
            <button
              key={s}
              onClick={() => logStage(s)}
              disabled={saving !== null}
              style={active ? { backgroundColor: STAGE_META[s].hex, borderColor: STAGE_META[s].hex } : undefined}
              className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                active
                  ? 'text-white'
                  : isSuggested
                    ? 'border-cta/50 text-cta hover:bg-cta/10'
                    : 'border-white/10 text-gray-300 hover:border-white/30'
              }`}
            >
              <span className="mr-1">{STAGE_META[s].emoji}</span>
              {isSaving ? '…' : STAGE_META[s].label}
            </button>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  )
}
