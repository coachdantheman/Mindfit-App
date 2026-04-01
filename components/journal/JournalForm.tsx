'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { JournalFormData } from '@/types'
import RatingSlider from './RatingSlider'

export default function JournalForm({ previewMode = false }: { previewMode?: boolean }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<JournalFormData>({
    defaultValues: {
      rating_motivation: 5,
      rating_focus: 5,
      rating_confidence: 5,
      rating_anxiety: 5,
    },
  })

  const ratings = {
    motivation: watch('rating_motivation'),
    focus: watch('rating_focus'),
    confidence: watch('rating_confidence'),
    anxiety: watch('rating_anxiety'),
  }

  const onSubmit = async (data: JournalFormData) => {
    setSubmitting(true)
    setError('')
    const today = new Date().toISOString().split('T')[0]
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, entry_date: today }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'Failed to save. Please try again.')
      setSubmitting(false)
    } else {
      router.refresh()
    }
  }

  const fieldClass = `w-full border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-800 text-gray-100 placeholder:text-gray-500`
  const errorClass = `text-red-400 text-xs mt-1`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Section 1: Objective */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-3">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
          Today&apos;s Objective
        </h2>
        <p className="text-sm text-gray-400">What is your goal for today?</p>
        <textarea
          {...register('objective', { required: 'Required' })}
          rows={3}
          placeholder="I want to..."
          className={fieldClass}
        />
        {errors.objective && <p className={errorClass}>{errors.objective.message}</p>}
      </section>

      {/* Section 2: Action Steps */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-3">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
          3 Action Steps
        </h2>
        <p className="text-sm text-gray-400">What 3 actions will you take to achieve your objective?</p>
        <div className="space-y-2">
          {(['action_step_1', 'action_step_2', 'action_step_3'] as const).map((field, i) => (
            <div key={field}>
              <input
                {...register(field, { required: 'Required' })}
                placeholder={`Action ${i + 1}`}
                className={fieldClass}
              />
              {errors[field] && <p className={errorClass}>{errors[field]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Strengths */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-3">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">3</span>
          3 Strengths
        </h2>
        <p className="text-sm text-gray-400">List 3 of your strengths today.</p>
        <div className="space-y-2">
          {(['strength_1', 'strength_2', 'strength_3'] as const).map((field, i) => (
            <div key={field}>
              <input
                {...register(field, { required: 'Required' })}
                placeholder={`Strength ${i + 1}`}
                className={fieldClass}
              />
              {errors[field] && <p className={errorClass}>{errors[field]?.message}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Weakness */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-3">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">4</span>
          One Weakness to Focus On
        </h2>
        <p className="text-sm text-gray-400">What one area do you want to improve today?</p>
        <input
          {...register('weakness', { required: 'Required' })}
          placeholder="I will work on..."
          className={fieldClass}
        />
        {errors.weakness && <p className={errorClass}>{errors.weakness.message}</p>}
      </section>

      {/* Section 5: Notes */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-3">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs flex items-center justify-center font-bold">5</span>
          Extra Notes
          <span className="text-gray-500 text-xs font-normal">(optional)</span>
        </h2>
        <textarea
          {...register('extra_notes')}
          rows={3}
          placeholder="Anything else on your mind..."
          className={fieldClass}
        />
      </section>

      {/* Section 6: Ratings */}
      <section className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-5">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">6</span>
          Daily Ratings (1–10)
        </h2>
        <p className="text-sm text-gray-400">Rate yourself honestly for today.</p>
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
      </section>

      {error && (
        <p className="text-red-400 text-sm bg-red-900/30 rounded-lg px-4 py-3">{error}</p>
      )}

      {previewMode ? (
        <a
          href="/login"
          className="block w-full text-center bg-cta hover:bg-brand-600 text-gray-900 font-semibold py-4 rounded-xl transition-colors text-base"
        >
          Sign in to submit and save your journal
        </a>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-cta hover:bg-brand-600 text-gray-900 font-semibold py-4 rounded-xl transition-colors disabled:opacity-60 text-base"
        >
          {submitting ? 'Saving…' : 'Submit Today\'s Journal'}
        </button>
      )}
    </form>
  )
}
