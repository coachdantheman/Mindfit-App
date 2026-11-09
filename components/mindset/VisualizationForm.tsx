'use client'
import { useState } from 'react'
import DailyPracticeForm from './DailyPracticeForm'

const TYPES: { value: string; hint: string }[] = [
  { value: 'Pre-game run-through', hint: 'Play the game in your head before it happens: warm-up, first play, your response to a mistake, the finish.' },
  { value: 'Skill rehearsal', hint: 'Slow, detailed reps of one skill. See it, feel it, hear it from inside your own eyes.' },
  { value: 'Guided meditation', hint: 'Follow a recording and let it set the pace. Bring your attention back each time it drifts.' },
  { value: 'Breathing', hint: 'Box breathing or long exhales. Slow the body down so the mind can follow.' },
  { value: 'Body scan', hint: 'Move your attention from head to toe and release tension wherever you find it.' },
  { value: 'Mindfulness', hint: 'Notice thoughts without chasing them. Train the skill of coming back to now.' },
  { value: 'Other', hint: '' },
]

export default function VisualizationForm() {
  const [type, setType] = useState('')
  const hint = TYPES.find(t => t.value === type)?.hint

  return (
    <DailyPracticeForm
      endpoint="/api/mindset/visualization"
      title="Daily Visualization"
      description="See yourself performing at your peak. Pick the type of practice, then rehearse who you are when it matters."
      checkboxLabel="I did my practice today"
      notesPlaceholder="What did you see and feel? What will you carry into your next practice or game?"
      loadExtra={(data) => setType((data.viz_type as string) || '')}
      buildPayload={() => ({ viz_type: type || null })}
      extraFields={({ setSaved }) => (
        <div>
          <label className="text-sm text-fg-3 block mb-1">Type</label>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setSaved(false) }}
            className="input-field w-full min-w-0 sm:w-auto"
          >
            <option value="">Select type</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.value}</option>)}
          </select>
          {hint && <p className="text-xs text-fg-3 mt-2">{hint}</p>}
        </div>
      )}
    />
  )
}
