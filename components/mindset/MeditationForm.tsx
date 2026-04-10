'use client'
import { useState } from 'react'
import DailyPracticeForm from './DailyPracticeForm'

const TYPES = ['Guided', 'Breathing', 'Body Scan', 'Mindfulness', 'Other']

export default function MeditationForm() {
  const [type, setType] = useState('')

  return (
    <DailyPracticeForm
      endpoint="/api/mindset/meditation"
      title="Daily Meditation"
      description="Train your mind like you train your body. Even 5 minutes makes a difference."
      checkboxLabel="I meditated today"
      notesPlaceholder="How was your session? What did you focus on?"
      loadExtra={(data) => setType((data.meditation_type as string) || '')}
      buildPayload={() => ({ meditation_type: type || null })}
      extraFields={({ setSaved }) => (
        <div>
          <label className="text-sm text-gray-400 block mb-1">Type</label>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setSaved(false) }}
            className="input-field w-auto"
          >
            <option value="">Select type</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
    />
  )
}
