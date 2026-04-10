'use client'
import { useState, useEffect } from 'react'
import { Goal, GoalType } from '@/types'

const GOAL_LABELS: Record<GoalType, string> = {
  weekly: 'Weekly Goals',
  season: 'Season Goals',
  year: 'Year Goals',
}

export default function GoalsSection() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<GoalType>('weekly')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/mindset/goals')
      .then(r => r.json())
      .then(data => { setGoals(data); setLoading(false) })
  }, [])

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return
    setSaving(true)
    const res = await fetch('/api/mindset/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal_type: formType, title: formTitle, description: formDesc || null }),
    })
    if (res.ok) {
      const data = await res.json()
      setGoals(prev => [data, ...prev])
      setFormTitle('')
      setFormDesc('')
      setShowForm(false)
    }
    setSaving(false)
  }

  const updateProgress = async (id: string, progress: number) => {
    const completed = progress >= 100
    await fetch('/api/mindset/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, progress, is_completed: completed }),
    })
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, is_completed: completed } : g))
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await fetch('/api/mindset/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  const grouped = {
    weekly: goals.filter(g => g.goal_type === 'weekly'),
    season: goals.filter(g => g.goal_type === 'season'),
    year: goals.filter(g => g.goal_type === 'year'),
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-100">Goals</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              showForm
                ? 'text-gray-400 border border-white/10 hover:text-gray-200'
                : 'bg-cta/20 text-cta border border-cta/30 hover:bg-cta/30'
            }`}
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">Set your targets. Track your progress. Champions know where they're headed.</p>

        {showForm && (
          <form onSubmit={addGoal} className="bg-gray-800/50 rounded-xl border border-white/5 p-4 mb-5 space-y-3">
            <div className="flex gap-2">
              {(['weekly', 'season', 'year'] as GoalType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormType(t)}
                  className={formType === t ? 'tab-btn-active text-xs' : 'tab-btn text-xs'}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Goal title"
              className="input-field"
            />
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="textarea-field"
            />
            <button
              type="submit"
              disabled={saving || !formTitle.trim()}
              className="btn-primary"
            >
              {saving ? 'Saving…' : 'Add Goal'}
            </button>
          </form>
        )}

        {goals.length === 0 && !showForm && (
          <div className="text-center py-8 text-gray-400">
            <p className="font-medium">No goals set yet</p>
            <p className="text-sm mt-1">Start by setting a weekly goal.</p>
          </div>
        )}

        {(['weekly', 'season', 'year'] as GoalType[]).map(type => {
          const items = grouped[type]
          if (items.length === 0) return null
          return (
            <div key={type} className="mb-5 last:mb-0">
              <h4 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-3">{GOAL_LABELS[type]}</h4>
              <div className="space-y-2">
                {items.map(g => (
                  <div key={g.id} className="p-3 rounded-xl bg-gray-800/50 border border-white/5 group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className={`text-sm font-medium ${g.is_completed ? 'text-green-400 line-through' : 'text-gray-200'}`}>
                          {g.title}
                        </p>
                        {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                      </div>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-cta rounded-full transition-all"
                          style={{ width: `${g.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{g.progress}%</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={g.progress}
                        onChange={e => updateProgress(g.id, parseInt(e.target.value))}
                        className="w-20 accent-[#C4B400]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
