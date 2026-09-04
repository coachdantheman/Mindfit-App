'use client'
import { useState, useEffect } from 'react'
import { WeeklyAssessment as WeeklyAssessmentType } from '@/types'
import { MPI_DIMENSIONS, calcMPI, MpiKey } from '@/lib/mpi'
import Skeleton from '@/components/shared/Skeleton'

const CATEGORIES = MPI_DIMENSIONS

type CategoryKey = MpiKey

function getMonday(d: Date): string {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

function getScoreColor(score: number): string {
  if (score <= 3) return 'bg-red-500/80'
  if (score <= 5) return 'bg-yellow-500/80'
  if (score <= 7) return 'bg-cta/60'
  return 'bg-green-500/80'
}

interface WeeklyAssessmentProps {
  mode?: 'weekly' | 'baseline'
  onComplete?: (mpi: number) => void
}

export default function WeeklyAssessment({ mode = 'weekly', onComplete }: WeeklyAssessmentProps) {
  const isBaseline = mode === 'baseline'
  const [scores, setScores] = useState<Record<CategoryKey, number>>(
    Object.fromEntries(CATEGORIES.map(c => [c.key, 5])) as Record<CategoryKey, number>
  )
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(!isBaseline)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<WeeklyAssessmentType[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const weekDate = getMonday(new Date())

  useEffect(() => {
    if (isBaseline) return
    fetch('/api/mindset/weekly-assessment').then(r => r.json()).then(all => {
      const weeklies = Array.isArray(all)
        ? all.filter((e: WeeklyAssessmentType) => e.assessment_type !== 'baseline')
        : []
      const current = weeklies.find((e: WeeklyAssessmentType) => e.week_date === weekDate)
      if (current) {
        const loaded: Record<string, number> = {}
        CATEGORIES.forEach(c => { loaded[c.key] = current[c.key] })
        setScores(loaded as Record<CategoryKey, number>)
        setNotes(current.notes || '')
        setSaved(true)
      }
      setHistory(weeklies)
      setLoading(false)
    })
  }, [weekDate, isBaseline])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/mindset/weekly-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        week_date: weekDate,
        ...scores,
        notes: notes || null,
        assessment_type: mode,
      }),
    })
    if (res.ok) {
      setSaved(true)
      const saved = await res.json()
      if (!isBaseline) {
        setHistory(prev => {
          const idx = prev.findIndex(e => e.week_date === weekDate)
          if (idx >= 0) return prev.map((e, i) => i === idx ? saved : e)
          return [saved, ...prev]
        })
      }
      onComplete?.(calcMPI(scores))
    }
    setSaving(false)
  }

  const average = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length) * 10) / 10

  if (loading) return <Skeleton />

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-fg-1">{isBaseline ? 'Baseline Assessment' : 'Weekly Assessment'}</h3>
          {!isBaseline && (
            <span className="text-sm text-fg-4">Week of {new Date(weekDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
        </div>
        <p className="text-sm text-fg-4 mb-6">
          {isBaseline
            ? 'Be honest — this is your starting point, and it’s how we measure your growth.'
            : 'Rate each area 1–10. Track your mental game weekly.'}
        </p>

        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, description }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium text-fg-2">{label}</span>
                  <p className="text-xs text-fg-4">{description}</p>
                </div>
                <span className="text-lg font-bold text-cta tabular-nums w-8 text-right">{scores[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-fg-4 w-3">1</span>
                <div className="relative flex-1 h-8 flex items-center">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(scores[key])}`}
                        style={{ width: `${(scores[key] / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scores[key]}
                    onChange={e => {
                      setScores(prev => ({ ...prev, [key]: parseInt(e.target.value) }))
                      setSaved(false)
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-xs text-fg-4 w-4">10</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-surface-2/50 rounded-xl border border-edge-muted">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fg-3">Overall Average</span>
            <span className="text-2xl font-bold text-cta">{average}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-fg-4">Mental Performance Index (MPI)</span>
            <span className="text-sm font-semibold text-fg-2 tabular-nums">{calcMPI(scores)} / 100</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-fg-3 block mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); setSaved(false) }}
            placeholder="Any reflections on your week?"
            rows={3}
            className="textarea-field"
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="btn-primary"
          >
            {saving ? 'Saving…' : saved ? 'Success ✓' : isBaseline ? 'See My MPI Score' : 'Save Assessment'}
          </button>
          {!isBaseline && history.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-fg-3 hover:text-fg-2 transition-colors"
            >
              {showHistory ? 'Hide History' : `View History (${history.length})`}
            </button>
          )}
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-fg-1 mb-4">Assessment History</h3>
          <div className="space-y-3">
            {history.map(entry => {
              const avg = Math.round(
                (CATEGORIES.reduce((sum, c) => sum + (entry[c.key as keyof WeeklyAssessmentType] as number), 0) / CATEGORIES.length) * 10
              ) / 10
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-surface-2/50 rounded-xl border border-edge-muted">
                  <span className="text-sm text-fg-2">
                    Week of {new Date(entry.week_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {CATEGORIES.map(c => {
                        const val = entry[c.key as keyof WeeklyAssessmentType] as number
                        return (
                          <div
                            key={c.key}
                            title={`${c.label}: ${val}`}
                            className={`w-2 h-6 rounded-sm ${getScoreColor(val)}`}
                          />
                        )
                      })}
                    </div>
                    <span className="text-sm font-semibold text-cta tabular-nums">{avg}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
