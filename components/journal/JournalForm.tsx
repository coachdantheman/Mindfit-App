'use client'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { JournalEntry, JournalFormData } from '@/types'
import RatingSlider from './RatingSlider'
import SaveButton, { SaveState } from '@/components/shared/SaveButton'
import CrisisNote from '@/components/shared/CrisisNote'
import { useToast } from '@/components/shared/Toast'
import { clearDraft, draftKey, readDraft, writeDraft } from '@/lib/useDraft'
import { localDateISO } from '@/lib/dates'

const DEFAULTS: Partial<JournalFormData> = {
  rating_motivation: 5,
  rating_focus: 5,
  rating_confidence: 5,
  rating_anxiety: 5,
}

interface Props {
  previewMode?: boolean
  onSaved?: (entry: JournalEntry) => void
  /** Edit an existing entry (e.g. a quick check-in). Saves with PUT for that entry's date. */
  existing?: JournalEntry
}

export default function JournalForm({ previewMode = false, onSaved, existing }: Props) {
  const notify = useToast()
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const key = draftKey('journal')

  const existingDefaults: Partial<JournalFormData> | undefined = existing && {
    objective: existing.objective,
    action_step_1: existing.action_step_1,
    action_step_2: existing.action_step_2,
    action_step_3: existing.action_step_3,
    strength_1: existing.strength_1,
    strength_2: existing.strength_2,
    strength_3: existing.strength_3,
    weakness: existing.weakness,
    extra_notes: existing.extra_notes ?? '',
    rating_motivation: existing.rating_motivation,
    rating_focus: existing.rating_focus,
    rating_confidence: existing.rating_confidence,
    rating_anxiety: existing.rating_anxiety,
  }

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<JournalFormData>({
    defaultValues: existingDefaults ?? DEFAULTS,
  })

  // Restore an unsent draft, then keep it updated as the athlete types.
  // Editing an existing entry uses its saved values, so the draft is ignored.
  useEffect(() => {
    if (existing) return
    const saved = readDraft<Partial<JournalFormData>>(key)
    if (saved) { reset({ ...DEFAULTS, ...saved }); setRestored(true) }
  }, [key, reset, existing])

  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (existing) return
    const sub = watch(values => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => writeDraft(key, values), 300)
    })
    return () => { sub.unsubscribe(); clearTimeout(timer.current) }
  }, [watch, key, existing])

  const ratings = {
    motivation: watch('rating_motivation'),
    focus: watch('rating_focus'),
    confidence: watch('rating_confidence'),
    anxiety: watch('rating_anxiety'),
  }

  const onSubmit = async (data: JournalFormData) => {
    if (state === 'saving') return
    setState('saving')
    setError('')
    const today = localDateISO()
    try {
      const res = await fetch('/api/journal', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, entry_date: existing ? existing.entry_date : today }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save. Please try again.')
        setState('error')
        return
      }
      clearTimeout(timer.current)
      clearDraft(key)
      setState('saved')
      notify('Journal saved. Streak kept 🔥')
      onSaved?.(json)
    } catch {
      setError('Failed to save. Please try again.')
      setState('error')
    }
  }

  const fieldClass = `input-field py-3`
  const errorClass = `text-red-400 text-xs mt-1`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {restored && (
        <p className="text-xs text-fg-4 -mb-4">Picked up where you left off. Your draft was saved.</p>
      )}

      {/* Section 1: Objective */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cta text-fg-inverse text-xs flex items-center justify-center font-bold">1</span>
          Today&apos;s Objective
        </h2>
        <p className="text-sm text-fg-3">What is your goal for today?</p>
        <textarea
          {...register('objective', { required: 'Required' })}
          rows={3}
          aria-label="Today\u2019s objective"
          placeholder="I want to..."
          className={fieldClass}
        />
        {errors.objective && <p className={errorClass}>{errors.objective.message}</p>}
      </section>

      {/* Section 2: Action Steps */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cta text-fg-inverse text-xs flex items-center justify-center font-bold">2</span>
          3 Action Steps
        </h2>
        <p className="text-sm text-fg-3">What 3 actions will you take to achieve your objective?</p>
        <div className="space-y-2">
          {(['action_step_1', 'action_step_2', 'action_step_3'] as const).map((field, i) => (
            <div key={field}>
              <input
                {...register(field, { required: 'Required' })}
                aria-label={`Action step ${i + 1}`}
                placeholder={`Action ${i + 1}`}
                className={fieldClass}
              />
              {errors[field] && <p className={errorClass}>{errors[field]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Strengths */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cta text-fg-inverse text-xs flex items-center justify-center font-bold">3</span>
          3 Strengths
        </h2>
        <p className="text-sm text-fg-3">List 3 of your strengths today.</p>
        <div className="space-y-2">
          {(['strength_1', 'strength_2', 'strength_3'] as const).map((field, i) => (
            <div key={field}>
              <input
                {...register(field, { required: 'Required' })}
                aria-label={`Strength ${i + 1}`}
                placeholder={`Strength ${i + 1}`}
                className={fieldClass}
              />
              {errors[field] && <p className={errorClass}>{errors[field]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Weakness */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cta text-fg-inverse text-xs flex items-center justify-center font-bold">4</span>
          One Weakness to Focus On
        </h2>
        <p className="text-sm text-fg-3">What one area do you want to improve today?</p>
        <input
          {...register('weakness', { required: 'Required' })}
          aria-label="Weakness to work on"
          placeholder="I will work on..."
          className={fieldClass}
        />
        {errors.weakness && <p className={errorClass}>{errors.weakness.message}</p>}
      </section>

      {/* Section 5: Notes */}
      <section className="card p-6 space-y-3">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-surface-3 text-fg-2 text-xs flex items-center justify-center font-bold">5</span>
          Extra Notes
          <span className="text-fg-4 text-xs font-normal">(optional)</span>
        </h2>
        <textarea
          {...register('extra_notes')}
          rows={3}
          aria-label="Extra notes"
          placeholder="Anything else on your mind..."
          className={fieldClass}
        />
      </section>

      {/* Section 6: Ratings */}
      <section className="card p-6 space-y-5">
        <h2 className="font-semibold text-fg-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-cta text-fg-inverse text-xs flex items-center justify-center font-bold">6</span>
          Daily Ratings (1–10)
        </h2>
        <p className="text-sm text-fg-3">Rate yourself honestly for today.</p>
        <RatingSlider
          label="Motivation"
          value={ratings.motivation}
          registration={register('rating_motivation', { valueAsNumber: true })}
          onChange={v => setValue('rating_motivation', v)}
          color="bg-blue-500"
        />
        <RatingSlider
          label="Focus"
          value={ratings.focus}
          registration={register('rating_focus', { valueAsNumber: true })}
          onChange={v => setValue('rating_focus', v)}
          color="bg-purple-500"
        />
        <RatingSlider
          label="Confidence"
          value={ratings.confidence}
          registration={register('rating_confidence', { valueAsNumber: true })}
          onChange={v => setValue('rating_confidence', v)}
          color="bg-green-500"
        />
        <RatingSlider
          label="Anxiety"
          value={ratings.anxiety}
          registration={register('rating_anxiety', { valueAsNumber: true })}
          onChange={v => setValue('rating_anxiety', v)}
          color="bg-orange-500"
        />
        {Number(ratings.anxiety) >= 8 && <CrisisNote />}
        {!previewMode && (
          <p className="text-xs text-fg-4">
            Need to talk to someone? <a href="/support#help" className="underline hover:text-fg-2">Find help here</a>.
          </p>
        )}
      </section>

      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">{error}</p>
      )}

      {previewMode ? (
        <a
          href="/login"
          className="block w-full text-center bg-cta hover:bg-brand-600 text-fg-inverse font-semibold py-4 rounded-xl transition-colors text-base"
        >
          Sign in to submit and save your journal
        </a>
      ) : (
        <SaveButton
          state={state}
          idleLabel="Submit Today's Journal"
          savedLabel="Submitted ✓"
          className="py-4 text-base"
        />
      )}
    </form>
  )
}
