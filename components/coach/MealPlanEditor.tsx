'use client'
import { useEffect, useState } from 'react'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import { useToast } from '@/components/shared/Toast'

export const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
  { key: 'pregame', label: 'Pre-game' },
  { key: 'postgame', label: 'Post-game' },
] as const

type SlotKey = (typeof MEAL_SLOTS)[number]['key']
const blank = () => Object.fromEntries(MEAL_SLOTS.map(s => [s.key, ''])) as Record<SlotKey, string>

interface Props { teams: { id: string; name: string }[] }

export default function MealPlanEditor({ teams }: Props) {
  const notify = useToast()
  const [teamId, setTeamId] = useState('')
  const current = teams.some(t => t.id === teamId) ? teamId : (teams[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [hasPlan, setHasPlan] = useState(false)
  const [title, setTitle] = useState('')
  const [texts, setTexts] = useState<Record<SlotKey, string>>(blank)
  const [notes, setNotes] = useState('')
  const [save, setSave] = useState<SaveState>('idle')

  useEffect(() => {
    if (!current) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/coach/meal-plan?team_id=${encodeURIComponent(current)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((plan: { title: string; meals: { slot: SlotKey; text: string }[]; notes: string | null } | null) => {
        if (cancelled) return
        const t = blank()
        for (const m of plan?.meals ?? []) if (m.slot in t) t[m.slot] = m.text
        setHasPlan(!!plan)
        setTitle(plan?.title ?? '')
        setTexts(t)
        setNotes(plan?.notes ?? '')
      })
      .catch(() => { if (!cancelled) notify('Could not load that plan.', 'error') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [current])

  useEffect(() => { setSave('idle') }, [title, texts, notes])

  const onSave = async () => {
    if (!current) return
    if (!title.trim()) { notify('Add a title for the plan.', 'error'); return }
    setSave('saving')
    const meals = MEAL_SLOTS.map(s => ({ slot: s.key, text: texts[s.key].trim() })).filter(m => m.text)
    try {
      const res = await fetch('/api/coach/meal-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: current, title: title.trim(), meals, notes: notes.trim() || null }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        notify(data?.error ?? 'Could not save the plan.', 'error')
        setSave('idle')
        return
      }
      setHasPlan(true)
      setSave('saved')
      notify('Meal plan saved')
    } catch {
      notify("Couldn't save the plan. Check your connection.", 'error')
      setSave('idle')
    }
  }

  const onRemove = async () => {
    if (!current || !hasPlan) return
    if (!confirm('Remove this meal plan? Athletes on this team will stop seeing it.')) return
    const res = await fetch(`/api/coach/meal-plan?team_id=${encodeURIComponent(current)}`, { method: 'DELETE' }).catch(() => null)
    if (!res?.ok) { notify('Could not remove the plan.', 'error'); return }
    setHasPlan(false)
    setTitle('')
    setTexts(blank())
    setNotes('')
    notify('Meal plan removed')
  }

  if (teams.length === 0) {
    return <p className="text-sm text-fg-4 text-center py-8">Create a team first, then build its meal plan here.</p>
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-fg-1 mb-1">Team meal plan</h3>
        <p className="text-sm text-fg-4">Athletes on the team see this on their Nutrition Today view.</p>
      </div>

      <div>
        <label htmlFor="meal-plan-team" className="text-sm text-fg-3 block mb-1">Team</label>
        <select id="meal-plan-team" value={current} onChange={e => setTeamId(e.target.value)} className="input-field sm:w-64">
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="meal-plan-title" className="text-sm text-fg-3 block mb-1">Plan title</label>
        <input
          id="meal-plan-title"
          value={title}
          maxLength={80}
          onChange={e => setTitle(e.target.value)}
          placeholder="Game week fueling"
          className="input-field"
        />
      </div>

      {loading ? (
        <div className="skeleton h-40" />
      ) : (
        <div className="space-y-4">
          {MEAL_SLOTS.map(s => (
            <div key={s.key}>
              <label htmlFor={`meal-${s.key}`} className="text-sm text-fg-3 block mb-1">{s.label}</label>
              <textarea
                id={`meal-${s.key}`}
                value={texts[s.key]}
                maxLength={300}
                rows={2}
                onChange={e => setTexts(prev => ({ ...prev, [s.key]: e.target.value }))}
                placeholder="Optional"
                className="textarea-field"
              />
            </div>
          ))}
          <div>
            <label htmlFor="meal-plan-notes" className="text-sm text-fg-3 block mb-1">Notes</label>
            <textarea
              id="meal-plan-notes"
              value={notes}
              maxLength={500}
              rows={3}
              onChange={e => setNotes(e.target.value)}
              placeholder="Hydration, timing, anything the team should know"
              className="textarea-field"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton type="button" state={save} idleLabel="Save meal plan" disabled={loading} onClick={onSave} className="sm:w-auto" />
        {hasPlan && (
          <button type="button" onClick={onRemove} className="text-sm text-fg-4 hover:text-red-400 min-h-[44px] px-2">Remove plan</button>
        )}
      </div>
    </div>
  )
}
