'use client'
import { useState } from 'react'
import PlanSetupForm, { type BuilderMode, type PlanSetup } from './PlanSetupForm'
import PlanDayEditor from './PlanDayEditor'
import PlanReview from './PlanReview'
import { generatePlanTemplate } from '@/lib/workout-templates'
import {
  applyTemplateToBlocks, blocksFromProgram, expandAiBlocks, expandTemplate, toLocalDateString,
  type DayTemplate, type PlanBlockInput,
} from '@/lib/programs'
import type { ExerciseLibraryRow, MuscleGroup, TrainingProgramRow } from '@/types/exercise'

type Step = 'choose' | 'setup' | 'days' | 'review'

interface Props {
  program: TrainingProgramRow | null      // current own plan, for "Edit current"
  library: ExerciseLibraryRow[]
  onCreateExercise: (name: string, muscle_group: MuscleGroup) => Promise<ExerciseLibraryRow | null>
  onSaved: () => void
  onCancel: () => void
  notify: (msg: string, kind?: 'success' | 'error') => void
}

function templatesFromBlocks(blocks: PlanBlockInput[]): DayTemplate[][] {
  return blocks.map(b => {
    const week = b.workouts.find(w => w.week_number === b.week_start)?.week_number ?? b.workouts[0]?.week_number
    const seen = new Set<number>()
    return b.workouts
      .filter(w => w.week_number === week && !seen.has(w.day_of_week) && (seen.add(w.day_of_week), true))
      .sort((a, b2) => a.day_of_week - b2.day_of_week)
      .map(w => ({ day_of_week: w.day_of_week, name: w.name, description: w.description, exercises: w.exercises.map(e => ({ ...e })) }))
  })
}

// Keep block ranges inside the chosen duration; the last block stretches
// or shrinks to end on the final week.
function fitBlocks(blocks: PlanBlockInput[], duration: number): PlanBlockInput[] {
  const kept = blocks.filter(b => b.week_start <= duration)
  return kept.map((b, i) => (i === kept.length - 1 ? { ...b, week_end: duration } : { ...b, week_end: Math.min(b.week_end, duration) }))
}

const defaultSetup = (p: TrainingProgramRow | null): PlanSetup => ({
  title: p?.title ?? '',
  description: p?.description ?? '',
  sport: p?.sport ?? '',
  goals: p?.goals ?? [],
  experience: 'intermediate',
  daysPerWeek: 4,
  durationWeeks: p?.duration_weeks ?? 8,
  startDate: p?.start_date ?? toLocalDateString(new Date()),
})

export default function PlanBuilder({ program, library, onCreateExercise, onSaved, onCancel, notify }: Props) {
  const [step, setStep] = useState<Step>('choose')
  const [mode, setMode] = useState<BuilderMode>('generate')
  const [setup, setSetup] = useState<PlanSetup>(() => defaultSetup(null))
  const [blocks, setBlocks] = useState<PlanBlockInput[]>([])
  const [templates, setTemplates] = useState<DayTemplate[][]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [aiProgress, setAiProgress] = useState(0)

  const choose = (m: BuilderMode) => {
    setMode(m)
    setError('')
    setSetup(m === 'edit' ? defaultSetup(program) : defaultSetup(null))
    setStep('setup')
  }

  const continueFromSetup = async () => {
    setError('')
    const duration = setup.durationWeeks
    if (!setup.startDate) { setError('Pick a start date.'); return }
    if ((mode === 'generate' || mode === 'ai') && (!setup.sport.trim() || setup.goals.length === 0)) {
      setError('Pick a sport and at least one goal.')
      return
    }
    if ((mode === 'scratch' || mode === 'edit') && !setup.title.trim()) { setError('Give the plan a name.'); return }

    if (mode === 'generate') {
      const tpl = generatePlanTemplate(setup.sport, setup.goals, setup.experience, setup.daysPerWeek, duration)
      const b = expandTemplate(tpl, duration)
      setBlocks(b)
      setTemplates(templatesFromBlocks(b))
      setSetup(s => ({ ...s, title: s.title || tpl.title, description: s.description || tpl.description }))
      setStep('days')
      return
    }
    if (mode === 'scratch') {
      setBlocks([{ name: 'Plan', focus: '', week_start: 1, week_end: duration, workouts: [] }])
      setTemplates([[]])
      setStep('days')
      return
    }
    if (mode === 'edit' && program) {
      const b = fitBlocks(blocksFromProgram(program), duration)
      setBlocks(b)
      setTemplates(templatesFromBlocks(b))
      setStep('days')
      return
    }
    if (mode === 'ai') {
      setBusy(true)
      setAiProgress(0)
      const tick = setInterval(() => setAiProgress(p => (p >= 90 ? 90 : p + Math.random() * 8 + 2)), 800)
      try {
        const res = await fetch('/api/exercise/programs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sport: setup.sport, goals: setup.goals, experience_level: setup.experience, days_per_week: setup.daysPerWeek, duration_weeks: duration }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(err.error || 'AI generation failed. Try "Generate" instead.')
          return
        }
        const data = await res.json()
        const b = expandAiBlocks(data, duration)
        if (b.length === 0) { setError('AI returned an incomplete plan. Try "Generate" instead.'); return }
        setBlocks(b)
        setTemplates(templatesFromBlocks(b))
        setSetup(s => ({ ...s, title: s.title || data.title || `${s.sport} AI plan`, description: s.description || data.description || '' }))
        setStep('days')
      } catch {
        setError('AI generation failed. Try "Generate" instead.')
      } finally {
        clearInterval(tick)
        setBusy(false)
        setAiProgress(0)
      }
    }
  }

  const continueFromDays = () => {
    if (templates.every(t => t.every(d => d.exercises.length === 0))) { setError('Add at least one training day.'); return }
    setError('')
    setStep('review')
  }

  const save = async () => {
    setBusy(true)
    setError('')
    const finalBlocks = fitBlocks(blocks, setup.durationWeeks).map((b, i) => applyTemplateToBlocks([b], templates[i] ?? [])[0])
    const body = {
      title: setup.title.trim() || `${setup.sport || 'My'} plan`,
      description: setup.description.trim(),
      sport: setup.sport.trim() || null,
      goals: setup.goals,
      duration_weeks: setup.durationWeeks,
      start_date: setup.startDate,
      source: mode === 'ai' ? 'ai' : 'self',
      blocks: finalBlocks,
    }
    try {
      const res = mode === 'edit' && program
        ? await fetch('/api/exercise/programs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: program.id, ...body }) })
        : await fetch('/api/exercise/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || "Couldn't save the plan.")
        return
      }
      notify(mode === 'edit' ? 'Plan updated' : 'Plan saved')
      onSaved()
    } catch {
      setError("Couldn't reach the server. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const header = (title: string, back: () => void) => (
    <div className="flex items-center justify-between">
      <button type="button" onClick={back} className="btn-ghost -ml-3">← Back</button>
      <h3 className="text-sm font-semibold text-fg-1">{title}</h3>
      <button type="button" onClick={onCancel} className="btn-ghost -mr-3">Cancel</button>
    </div>
  )

  if (step === 'choose') {
    const options: { m: BuilderMode; title: string; sub: string; show: boolean }[] = [
      { m: 'generate', title: 'Generate', sub: 'Instant periodized plan from your sport and goals', show: true },
      { m: 'ai', title: 'Generate with AI', sub: 'More tailored, takes ~20 seconds', show: true },
      { m: 'scratch', title: 'Build from scratch', sub: 'Pick your own days and exercises', show: true },
      { m: 'edit', title: 'Edit current plan', sub: program ? `Change ${program.title}` : '', show: !!program },
    ]
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg-1">New plan</h3>
          <button type="button" onClick={onCancel} className="btn-ghost -mr-3">Cancel</button>
        </div>
        {options.filter(o => o.show).map(o => (
          <button key={o.m} type="button" onClick={() => choose(o.m)} className="card p-4 w-full text-left hover:border-cta/30 transition-colors">
            <p className="font-semibold text-fg-1">{o.title}</p>
            <p className="text-xs text-fg-4 mt-0.5">{o.sub}</p>
          </button>
        ))}
      </div>
    )
  }

  if (step === 'setup') {
    return (
      <div className="space-y-4">
        {header(mode === 'edit' ? 'Edit plan' : 'Set up', () => setStep('choose'))}
        <PlanSetupForm mode={mode} setup={setup} onChange={setSetup} error={error} />
        {busy && mode === 'ai' && (
          <div className="card p-4 space-y-2">
            <p className="text-sm font-medium text-fg-2">Building your plan…</p>
            <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
              <div className="bg-cta h-2 rounded-full transition-all duration-500" style={{ width: `${aiProgress}%` }} />
            </div>
            <p className="text-[11px] text-fg-4">Usually 15–30 seconds.</p>
          </div>
        )}
        <button type="button" onClick={continueFromSetup} disabled={busy} className="btn-primary w-full py-3">
          {busy ? 'Working…' : mode === 'generate' ? 'Generate plan' : mode === 'ai' ? 'Generate with AI' : 'Continue'}
        </button>
      </div>
    )
  }

  if (step === 'days') {
    return (
      <div className="space-y-4">
        {header('Workouts', () => setStep('setup'))}
        <p className="text-xs text-fg-4">
          {blocks.length > 1 ? 'Each phase has its own week template. ' : ''}The week you set here repeats every week{blocks.length > 1 ? ' of that phase' : ''}.
        </p>
        <PlanDayEditor blocks={blocks} templates={templates} onChange={setTemplates} library={library} onCreateExercise={onCreateExercise} />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="button" onClick={continueFromDays} className="btn-primary w-full py-3">Review</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header('Review', () => setStep('days'))}
      <PlanReview setup={setup} blocks={fitBlocks(blocks, setup.durationWeeks)} templates={templates} isEdit={mode === 'edit'} saving={busy} error={error} onSave={save} />
    </div>
  )
}
