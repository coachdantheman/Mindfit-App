'use client'
import CollapsibleList from '@/components/shared/CollapsibleList'
import { cached } from '@/lib/api-cache'
import { useState, useEffect, useRef } from 'react'
import SaveButton from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'
import { Goal, GoalType } from '@/types'
import Skeleton from '@/components/shared/Skeleton'
import Link from 'next/link'
import { Habit, HabitCheck } from '@/lib/habits'
import { localDateISO } from '@/lib/dates'
import GoalTracker from '@/components/mindset/GoalTracker'

type GoalAuto = { checks: number; days: number; progress: number; habit_name: string }
type GoalRow = Goal & { habit_id?: string | null; auto?: GoalAuto }

const GOAL_LABELS: Record<GoalType, string> = {
  weekly: 'Weekly Goals',
  season: 'Season Goals',
  year: 'Year Goals',
}

interface GoalFieldsProps {
  type: GoalType
  title: string
  desc: string
  endDate: string
  habits: Habit[]
  habitId: string
  onType: (t: GoalType) => void
  onTitle: (v: string) => void
  onDesc: (v: string) => void
  onEndDate: (v: string) => void
  onHabit: (v: string) => void
}

function GoalFields({ type, title, desc, endDate, habits, habitId, onType, onTitle, onDesc, onEndDate, onHabit }: GoalFieldsProps) {
  return (
    <>
      <div className="flex gap-2">
        {(['weekly', 'season', 'year'] as GoalType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => onType(t)}
            className={type === t ? 'tab-btn-active text-xs' : 'tab-btn text-xs'}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={e => onTitle(e.target.value)}
        aria-label="Goal title"
        placeholder="Goal title"
        className="input-field"
      />
      <textarea
        value={desc}
        onChange={e => onDesc(e.target.value)}
        aria-label="Why this goal matters"
        placeholder="Why does this matter to who you are becoming? (optional)"
        rows={2}
        maxLength={500}
        className="textarea-field"
      />
      <label className="flex items-center justify-between gap-3 text-sm text-fg-3">
        <span>End date <span className="text-fg-4">(optional)</span></span>
        <input
          type="date"
          value={endDate}
          min={localDateISO()}
          onChange={e => onEndDate(e.target.value)}
          aria-label="Goal end date"
          className="input-field !w-auto"
        />
      </label>
      {habits.length > 0 && (
        <label className="flex items-center justify-between gap-3 text-sm text-fg-3">
          <span>Link a habit <span className="text-fg-4">(optional)</span></span>
          <select
            value={habitId}
            onChange={e => onHabit(e.target.value)}
            aria-label="Link a habit"
            className="input-field !w-auto max-w-[60%]"
          >
            <option value="">None</option>
            {habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
          </select>
        </label>
      )}
    </>
  )
}

export default function GoalsSection() {
  const notify = useToast()
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<GoalType>('weekly')
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formHabit, setFormHabit] = useState('')
  const [formActions, setFormActions] = useState<string[]>([''])
  const [habits, setHabits] = useState<Habit[]>([])
  const [checks, setChecks] = useState<HabitCheck[]>([])
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<GoalType>('weekly')
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editHabit, setEditHabit] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const progressTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const confirmedProgress = useRef(new Map<string, number>())
  const latestProgress = useRef(new Map<string, number>())

  useEffect(() => {
    cached('/api/mindset/goals', (data: GoalRow[]) => { setGoals(data); setLoading(false) })
    fetch('/api/mindset/habits')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.habits) { setHabits(d.habits); setChecks(d.checks ?? []) } })
      .catch(() => {})
  }, [])

  // Habit-linked goals need the server's auto progress, so re-read after a save.
  const reloadGoals = () => {
    fetch('/api/mindset/goals')
      .then(r => (r.ok ? r.json() : null))
      .then((d: GoalRow[] | null) => { if (d) setGoals(d) })
      .catch(() => {})
  }

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || saving) return
    setSaving(true)
    const actions = formActions.map(a => a.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/mindset/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_type: formType, title: formTitle, description: formDesc || null, target_date: formEnd || null, habit_id: formHabit || null }),
      })
      if (res.ok) {
        const data = await res.json()
        setGoals(prev => [data, ...prev])
        if (formHabit) reloadGoals()
        setFormTitle('')
        setFormDesc('')
        setFormEnd('')
        setFormHabit('')
        setFormActions([''])
        setShowForm(false)
        const created: Habit[] = []
        let failed = 0
        for (const title of actions) {
          try {
            const hr = await fetch('/api/mindset/habits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, frequency: 'daily', goal_id: data.id }),
            })
            if (hr.ok) created.push(await hr.json())
            else failed++
          } catch {
            failed++
          }
        }
        if (created.length) setHabits(prev => [...prev, ...created])
        if (failed) notify("Goal saved, but a habit didn't. Add it in Habits.", 'error')
        else if (created.length) notify(`Goal added with ${created.length} habit${created.length === 1 ? '' : 's'}`)
        else notify('Goal added ✓')
      } else {
        notify('Could not add the goal. Please try again.', 'error')
      }
    } catch {
      notify('Could not add the goal. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateProgress = (id: string, progress: number) => {
    const completed = progress >= 100
    if (!confirmedProgress.current.has(id)) {
      confirmedProgress.current.set(id, goals.find(g => g.id === id)?.progress ?? progress)
    }
    latestProgress.current.set(id, progress)
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress, is_completed: completed } : g))
    clearTimeout(progressTimers.current.get(id))
    progressTimers.current.set(id, setTimeout(async () => {
      const res = await fetch('/api/mindset/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, progress, is_completed: completed }),
      }).catch(() => null)
      if (res?.ok) {
        confirmedProgress.current.set(id, progress)
        return
      }
      // A newer change is on its way; let that request decide the final value.
      if (latestProgress.current.get(id) !== progress) return
      const back = confirmedProgress.current.get(id) ?? progress
      setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: back, is_completed: back >= 100 } : g))
      notify("Couldn't update progress. Try again.", 'error')
    }, 400))
  }

  const startEdit = (g: GoalRow) => {
    setEditingId(g.id)
    setEditType(g.goal_type)
    setEditTitle(g.title)
    setEditDesc(g.description ?? '')
    setEditEnd(g.target_date ?? '')
    setEditHabit(g.habit_id ?? '')
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editTitle.trim()) return
    setEditSaving(true)
    const title = editTitle.trim()
    const description = editDesc.trim() || null
    const target_date = editEnd || null
    const habit_id = editHabit || null
    try {
      const res = await fetch('/api/mindset/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, title, description, goal_type: editType, target_date, habit_id }),
      })
      if (res.ok) {
        setGoals(prev => prev.map(g => g.id === editingId ? { ...g, title, description, goal_type: editType, target_date, habit_id } : g))
        reloadGoals()
        setEditingId(null)
        notify('Goal updated ✓')
      } else {
        notify('Could not update the goal. Please try again.', 'error')
      }
    } catch {
      notify('Could not update the goal. Please try again.', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    const before = goals
    setGoals(prev => prev.filter(g => g.id !== id))
    const res = await fetch('/api/mindset/goals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => null)
    if (!res?.ok) {
      setGoals(before)
      notify("Couldn't delete the goal. Try again.", 'error')
    }
  }

  if (loading) return <Skeleton />

  // Active goals by type; completed goals sit on the shelf at the bottom.
  const activeOf = (t: GoalType) => goals.filter(g => g.goal_type === t && !g.is_completed)
  const grouped = { weekly: activeOf('weekly'), season: activeOf('season'), year: activeOf('year') }
  const completed = goals
    .filter(g => g.is_completed)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  const weekDays = new Set(Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return localDateISO(d)
  }))
  const daysDone = (habitId: string) => checks.filter(c => c.habit_id === habitId && weekDays.has(c.check_date)).length

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-fg-1">Goals</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              showForm
                ? 'text-fg-3 border border-edge hover:text-fg-2'
                : 'bg-cta/20 text-cta border border-cta/30 hover:bg-cta/30'
            }`}
          >
            {showForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>
        <p className="text-sm text-fg-4 mb-5">Set your targets. Track your progress. Champions know where they're headed.</p>

        {showForm && (
          <form onSubmit={addGoal} className="bg-surface-2/50 rounded-xl border border-edge-muted p-4 mb-5 space-y-3">
            <GoalFields
              type={formType}
              title={formTitle}
              desc={formDesc}
              endDate={formEnd}
              habits={habits}
              habitId={formHabit}
              onType={setFormType}
              onTitle={setFormTitle}
              onDesc={setFormDesc}
              onEndDate={setFormEnd}
              onHabit={setFormHabit}
            />
            <div className="space-y-2">
              <p className="text-sm text-fg-2">What daily action will get you there?</p>
              <p className="text-xs text-fg-4">Each one becomes a habit you can check off.</p>
              {formActions.map((action, i) => (
                <input
                  key={i}
                  value={action}
                  onChange={e => setFormActions(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                  aria-label={`Daily action ${i + 1}`}
                  placeholder="Daily action"
                  maxLength={80}
                  className="input-field"
                />
              ))}
              {formActions.length < 3 && (
                <button
                  type="button"
                  onClick={() => setFormActions(prev => [...prev, ''])}
                  className="text-xs text-cta"
                >
                  + Add another
                </button>
              )}
            </div>
            <SaveButton
              state={saving ? 'saving' : 'idle'}
              idleLabel="Add Goal"
              savingLabel="Adding…"
              disabled={!formTitle.trim()}
              className="sm:w-auto"
            />
          </form>
        )}

        {goals.length === 0 && !showForm && (
          <div className="text-center py-8 text-fg-3">
            <p className="font-medium">No goals set yet</p>
            <p className="text-sm mt-1">Start by setting a weekly goal.</p>
          </div>
        )}

        {(['weekly', 'season', 'year'] as GoalType[]).map(type => {
          const items = grouped[type]
          if (items.length === 0) return null
          return (
            <div key={type} className="mb-5 last:mb-0">
              <h4 className="text-xs uppercase tracking-wider text-fg-4 font-medium mb-3">{GOAL_LABELS[type]}</h4>
              <CollapsibleList className="space-y-2" items={items} visible={items.length} noun="completed" render={g => editingId === g.id ? (
                  <form key={g.id} onSubmit={saveEdit} className="p-3 rounded-xl bg-surface-2/50 border border-edge-muted space-y-3">
                    <GoalFields
                      type={editType}
                      title={editTitle}
                      desc={editDesc}
                      endDate={editEnd}
                      habits={habits}
                      habitId={editHabit}
                      onType={setEditType}
                      onTitle={setEditTitle}
                      onDesc={setEditDesc}
                      onEndDate={setEditEnd}
                      onHabit={setEditHabit}
                    />
                    <div className="flex gap-2">
                      <SaveButton
                        state={editSaving ? 'saving' : 'idle'}
                        idleLabel="Save"
                        disabled={!editTitle.trim()}
                        className="sm:w-auto"
                      />
                      <button type="button" onClick={() => setEditingId(null)} className="btn-ghost">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div key={g.id} className="p-3 rounded-xl bg-surface-2/50 border border-edge-muted">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-fg-2">{g.title}</p>
                        {g.description && <p className="text-xs text-fg-3 mt-0.5 italic">{g.description}</p>}
                        {g.target_date && <DaysLeft date={g.target_date} />}
                        {habits.some(h => h.goal_id === g.id) && (
                          <div className="mt-2 space-y-1">
                            {habits.filter(h => h.goal_id === g.id).map(h => (
                              <div key={h.id} className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-fg-3">{h.title}</span>
                                <span className="text-fg-4 shrink-0">{daysDone(h.id)} of 7 days</span>
                              </div>
                            ))}
                            <Link href="/mindset?tab=Habits" className="text-xs text-cta">Open Habits →</Link>
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 -my-1 -mr-1">
                        <button
                          onClick={() => startEdit(g)}
                          className="text-xs text-cta px-3 min-h-[44px] sm:min-h-0 sm:py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteGoal(g.id)}
                          className="text-xs text-red-400 px-3 min-h-[44px] sm:min-h-0 sm:py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {g.auto ? (
                      <GoalTracker
                        value={g.auto.progress}
                        label={g.title}
                        readOnly
                        note={`Fills from your habit: ${g.auto.habit_name}. ${g.auto.checks} of ${g.auto.days} days.`}
                      />
                    ) : (
                      <GoalTracker value={g.progress} label={g.title} onChange={v => updateProgress(g.id, v)} />
                    )}
                  </div>
                )} />
            </div>
          )
        })}

        {completed.length > 0 && (
          <div className="mt-6 pt-4 border-t border-edge-muted">
            <button
              type="button"
              onClick={() => setShowCompleted(v => !v)}
              aria-expanded={showCompleted}
              className="w-full flex items-center justify-between py-2 text-xs uppercase tracking-wider text-fg-4 font-medium"
            >
              <span>Completed goals ({completed.length})</span>
              <span aria-hidden="true">{showCompleted ? '−' : '+'}</span>
            </button>
            {showCompleted && (
              <ul className="mt-2 space-y-2">
                {completed.map(g => (
                  <li key={g.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2/50 border border-edge-muted">
                    <span className="text-sm text-fg-3 line-through truncate">{g.title}</span>
                    {g.completed_at && (
                      <span className="text-xs text-fg-4 shrink-0">
                        {new Date(g.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DaysLeft({ date }: { date: string }) {
  const today = new Date(`${localDateISO()}T00:00:00`)
  const end = new Date(`${date}T00:00:00`)
  const days = Math.round((end.getTime() - today.getTime()) / 86_400_000)
  const text = days < 0 ? `Ended ${Math.abs(days)} day${days === -1 ? '' : 's'} ago` : days === 0 ? 'Ends today' : `${days} day${days === 1 ? '' : 's'} left`
  const tone = days < 0 ? 'text-red-400 border-red-400/40' : days <= 7 ? 'text-amber-400 border-amber-400/40' : 'text-fg-3 border-edge'
  return <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full border ${tone}`}>{text}</span>
}
