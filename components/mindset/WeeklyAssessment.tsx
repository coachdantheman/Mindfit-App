'use client'
import { useState, useEffect } from 'react'
import { WeeklyAssessment as WeeklyAssessmentType } from '@/types'

const CATEGORIES = [
  { key: 'self_identity_clarity', label: 'Self-Identity Clarity', description: 'How clear are you on who you are as an athlete?' },
  { key: 'confidence', label: 'Confidence', description: 'How confident do you feel in your abilities?' },
  { key: 'focus_quality', label: 'Focus Quality', description: 'How well can you lock in and stay present?' },
  { key: 'anxiety_management', label: 'Anxiety Management', description: 'How well are you managing pressure and nerves?' },
  { key: 'resilience', label: 'Resilience', description: 'How well do you bounce back from setbacks?' },
  { key: 'motivation', label: 'Motivation', description: 'How driven and motivated do you feel?' },
  { key: 'mental_imagery', label: 'Mental Imagery', description: 'How vivid and effective is your visualization?' },
  { key: 'routine_consistency', label: 'Routine Consistency', description: 'How consistent are your pre-performance routines?' },
  { key: 'team_relationships', label: 'Team Relationships', description: 'How connected do you feel with your teammates?' },
  { key: 'vision_clarity', label: 'Vision Clarity', description: 'How clear is your long-term vision and purpose?' },
] as const

type CategoryKey = typeof CATEGORIES[number]['key']

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

export default function WeeklyAssessment() {
  const [scores, setScores] = useState<Record<CategoryKey, number>>(
    Object.fromEntries(CATEGORIES.map(c => [c.key, 5])) as Record<CategoryKey, number>
  )
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<WeeklyAssessmentType[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const weekDate = getMonday(new Date())

  useEffect(() => {
    fetch('/api/mindset/weekly-assessment').then(r => r.json()).then(all => {
      const current = all.find((e: WeeklyAssessmentType) => e.week_date === weekDate)
      if (current) {
        const loaded: Record<string, number> = {}
        CATEGORIES.forEach(c => { loaded[c.key] = current[c.key] })
        setScores(loaded as Record<CategoryKey, number>)
        setNotes(current.notes || '')
        setSaved(true)
      }
      setHistory(all)
      setLoading(false)
    })
  }, [weekDate])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/mindset/weekly-assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_date: weekDate, ...scores, notes: notes || null }),
    })
    if (res.ok) {
      setSaved(true)
      const saved = await res.json()
      setHistory(prev => {
        const idx = prev.findIndex(e => e.week_date === weekDate)
        if (idx >= 0) return prev.map((e, i) => i === idx ? saved : e)
        return [saved, ...prev]
      })
    }
    setSaving(false)
  }

  const average = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length) * 10) / 10

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-100">Weekly Assessment</h3>
          <span className="text-sm text-gray-500">Week of {new Date(weekDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
        <p className="text-sm text-gray-500 mb-6">Rate each area 1–10. Track your mental game weekly.</p>

        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, description }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium text-gray-200">{label}</span>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <span className="text-lg font-bold text-cta tabular-nums w-8 text-right">{scores[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-3">1</span>
                <div className="relative flex-1 h-8 flex items-center">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
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
                <span className="text-xs text-gray-600 w-4">10</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Overall Average</span>
            <span className="text-2xl font-bold text-cta">{average}</span>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-400 block mb-1">Notes (optional)</label>
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
            {saving ? 'Saving…' : saved ? 'Success ✓' : 'Save Assessment'}
          </button>
          {history.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              {showHistory ? 'Hide History' : `View History (${history.length})`}
            </button>
          )}
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
          <h3 className="font-semibold text-gray-100 mb-4">Assessment History</h3>
          <div className="space-y-3">
            {history.map(entry => {
              const avg = Math.round(
                (CATEGORIES.reduce((sum, c) => sum + (entry[c.key as keyof WeeklyAssessmentType] as number), 0) / CATEGORIES.length) * 10
              ) / 10
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-white/5">
                  <span className="text-sm text-gray-300">
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
