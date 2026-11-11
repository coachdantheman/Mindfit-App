'use client'
import { useState, useEffect, useRef } from 'react'
import { cachedAll } from '@/lib/api-cache'
import Skeleton from '@/components/shared/Skeleton'
import SaveButton from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { localDateISO } from '@/lib/dates'
import { Goal } from '@/types'
import { Habit, HabitCheck, HabitFrequency, dailyStreak, weekCount } from '@/lib/habits'

const SUGGESTIONS = [
  'Read for 30 min',
  'Power hour after getting home',
  'Cold shower / plunge',
  'Sauna',
  'Watch MindFit Academy',
]

interface HabitFormValues {
  title: string
  frequency: HabitFrequency
  timesPerWeek: number
  goalId: string
}

const EMPTY_FORM: HabitFormValues = { title: '', frequency: 'daily', timesPerWeek: 3, goalId: '' }

function groupChecks(rows: HabitCheck[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  for (const row of rows) {
    if (!grouped[row.habit_id]) grouped[row.habit_id] = []
    grouped[row.habit_id].push(row.check_date)
  }
  return grouped
}

interface HabitFieldsProps {
  values: HabitFormValues
  goals: Goal[]
  onChange: (patch: Partial<HabitFormValues>) => void
}

function HabitFields({ values, goals, onChange }: HabitFieldsProps) {
  return (
    <>
      <div className="flex gap-2">
        {(['daily', 'weekly'] as HabitFrequency[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => onChange({ frequency: f })}
            className={values.frequency === f ? 'tab-btn-active text-xs' : 'tab-btn text-xs'}
          >
            {f === 'daily' ? 'Daily' : 'Weekly'}
          </button>
        ))}
      </div>
      <input
        value={values.title}
        onChange={e => onChange({ title: e.target.value })}
        aria-label="Habit title"
        placeholder="Habit title"
        maxLength={80}
        className="input-field w-full min-w-0"
      />
      {values.frequency === 'weekly' && (
        <label className="block text-sm text-fg-3">
          Times per week
          <select
            value={values.timesPerWeek}
            onChange={e => onChange({ timesPerWeek: parseInt(e.target.value) })}
            className="input-field w-full min-w-0 mt-1"
          >
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm text-fg-3">
        Linked goal (optional)
        <select
          value={values.goalId}
          onChange={e => onChange({ goalId: e.target.value })}
          className="input-field w-full min-w-0 mt-1"
        >
          <option value="">No goal</option>
          {goals.map(g => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
      </label>
    </>
  )
}

export default function HabitsTab() {
  const notify = useToast()
  const today = localDateISO()
  const [habits, setHabits] = useState<Habit[]>([])
  const [checks, setChecks] = useState<Record<string, string[]>>({})
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<HabitFormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<HabitFormValues>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)
  const pendingChecks = useRef<Set<string>>(new Set())

  useEffect(() => {
    cachedAll(['/api/mindset/habits', '/api/mindset/goals'], ([habitData, goalData]: [{ habits?: Habit[]; checks?: HabitCheck[] }, Goal[]]) => {
      setHabits(habitData.habits ?? [])
      setChecks(groupChecks(habitData.checks ?? []))
      setGoals(Array.isArray(goalData) ? goalData : [])
      setLoading(false)
    })
      .catch(() => notify('Could not load your habits. Please refresh.', 'error'))
      .finally(() => setLoading(false))
  }, [notify])

  const toggleCheck = async (habit: Habit) => {
    if (pendingChecks.current.has(habit.id)) return
    const previous = checks[habit.id] ?? []
    const checked = !previous.includes(today)
    const next = checked ? [...previous, today] : previous.filter(d => d !== today)
    pendingChecks.current.add(habit.id)
    setChecks(prev => ({ ...prev, [habit.id]: next }))
    try {
      const res = await fetch('/api/mindset/habits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habit.id, date: today, checked }),
      })
      if (!res.ok) throw new Error(`check failed: ${res.status}`)
    } catch {
      setChecks(prev => ({ ...prev, [habit.id]: previous }))
      notify('Could not save that check. Please try again.', 'error')
    } finally {
      pendingChecks.current.delete(habit.id)
    }
  }

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/mindset/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          frequency: form.frequency,
          times_per_week: form.frequency === 'weekly' ? form.timesPerWeek : null,
          goal_id: form.goalId || null,
        }),
      })
      if (!res.ok) throw new Error(`add failed: ${res.status}`)
      const habit: Habit = await res.json()
      setHabits(prev => [...prev, habit])
      setForm(EMPTY_FORM)
      setShowForm(false)
      notify('Habit added ✓')
    } catch {
      notify('Could not add the habit. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const useSuggestion = (title: string) => {
    setForm({ ...EMPTY_FORM, title })
    setShowForm(true)
  }

  const startEdit = (h: Habit) => {
    setEditingId(h.id)
    setEditForm({
      title: h.title,
      frequency: h.frequency,
      timesPerWeek: h.times_per_week ?? 3,
      goalId: h.goal_id ?? '',
    })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editForm.title.trim() || editSaving) return
    setEditSaving(true)
    const title = editForm.title.trim()
    const frequency = editForm.frequency
    const timesPerWeek = frequency === 'weekly' ? editForm.timesPerWeek : null
    const goalId = editForm.goalId || null
    try {
      const res = await fetch('/api/mindset/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, title, frequency, times_per_week: timesPerWeek, goal_id: goalId }),
      })
      if (!res.ok) throw new Error(`update failed: ${res.status}`)
      setHabits(prev => prev.map(h => h.id === editingId
        ? { ...h, title, frequency, times_per_week: timesPerWeek, goal_id: goalId }
        : h))
      setEditingId(null)
      notify('Habit updated ✓')
    } catch {
      notify('Could not update the habit. Please try again.', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const removeHabit = async (id: string) => {
    if (!confirm('Remove this habit?')) return
    try {
      const res = await fetch(`/api/mindset/habits?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`remove failed: ${res.status}`)
      setHabits(prev => prev.filter(h => h.id !== id))
    } catch {
      notify('Could not remove the habit. Please try again.', 'error')
    }
  }

  if (loading) return <Skeleton />

  const availableSuggestions = SUGGESTIONS.filter(
    s => !habits.some(h => h.title.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="font-semibold text-fg-1">Habits</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
              showForm
                ? 'text-fg-3 border border-edge hover:text-fg-2'
                : 'bg-cta/20 text-cta border border-cta/30 hover:bg-cta/30'
            }`}
          >
            {showForm ? 'Cancel' : '+ New Habit'}
          </button>
        </div>
        <p className="text-sm text-fg-4 mb-5">Habits are the small daily actions that move your goals forward.</p>

        {showForm && (
          <form onSubmit={addHabit} className="bg-surface-2/50 rounded-xl border border-edge-muted p-4 mb-5 space-y-3">
            <HabitFields values={form} goals={goals} onChange={patch => setForm(prev => ({ ...prev, ...patch }))} />
            <SaveButton
              state={saving ? 'saving' : 'idle'}
              idleLabel="Add Habit"
              savingLabel="Adding…"
              disabled={!form.title.trim()}
              className="sm:w-auto"
            />
          </form>
        )}

        {availableSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {availableSuggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => useSuggestion(s)}
                className="text-xs px-3 py-2 rounded-full border border-edge text-fg-2 hover:border-cta hover:text-cta transition-colors min-w-0 text-left"
              >
                + {s}
              </button>
            ))}
          </div>
        )}

        {habits.length === 0 && !showForm && (
          <div className="text-center py-8 text-fg-3">
            <p className="font-medium">No habits yet</p>
            <p className="text-sm mt-1">Start with one small action you can repeat.</p>
          </div>
        )}

        <div className="space-y-2">
          {habits.map(h => {
            if (editingId === h.id) {
              return (
                <form key={h.id} onSubmit={saveEdit} className="p-3 rounded-xl bg-surface-2/50 border border-edge-muted space-y-3">
                  <HabitFields values={editForm} goals={goals} onChange={patch => setEditForm(prev => ({ ...prev, ...patch }))} />
                  <div className="flex gap-2">
                    <SaveButton
                      state={editSaving ? 'saving' : 'idle'}
                      idleLabel="Save"
                      disabled={!editForm.title.trim()}
                      className="sm:w-auto"
                    />
                    <button type="button" onClick={() => setEditingId(null)} className="btn-ghost">
                      Cancel
                    </button>
                  </div>
                </form>
              )
            }

            const dates = checks[h.id] ?? []
            const doneToday = dates.includes(today)
            const goalTitle = goals.find(g => g.id === h.goal_id)?.title
            const isWeekly = h.frequency === 'weekly'
            const thisWeek = isWeekly ? weekCount(dates, today) : 0
            const weekDone = isWeekly && h.times_per_week !== null && thisWeek >= h.times_per_week

            return (
              <div key={h.id} className="rounded-xl bg-surface-2/50 border border-edge-muted flex items-stretch min-w-0">
                <button
                  type="button"
                  onClick={() => toggleCheck(h)}
                  aria-pressed={doneToday}
                  className="flex-1 min-w-0 flex items-center gap-3 p-4 min-h-[64px] text-left"
                >
                  <span
                    aria-hidden="true"
                    className={`w-8 h-8 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      doneToday ? 'bg-cta border-cta' : 'border-edge'
                    }`}
                  >
                    {doneToday && (
                      <svg className="w-5 h-5 text-fg-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-medium truncate ${doneToday ? 'text-green-400' : 'text-fg-2'}`}>
                      {h.title}
                    </span>
                    {goalTitle && (
                      <span className="block text-xs text-fg-3 truncate mt-0.5">Goal: {goalTitle}</span>
                    )}
                    <span className="block text-xs text-fg-4 mt-0.5">
                      {isWeekly ? (
                        <span className={weekDone ? 'text-green-400' : undefined}>
                          {thisWeek} / {h.times_per_week} this week
                        </span>
                      ) : (
                        <span>🔥 {dailyStreak(dates, today)}-day streak</span>
                      )}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 flex-col justify-center sm:flex-row -my-1 -mr-1">
                  <button
                    type="button"
                    onClick={() => startEdit(h)}
                    className="text-xs text-cta px-3 min-h-[44px] sm:min-h-0 sm:py-1"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeHabit(h.id)}
                    className="text-xs text-red-400 px-3 min-h-[44px] sm:min-h-0 sm:py-1"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
