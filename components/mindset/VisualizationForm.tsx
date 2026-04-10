'use client'
import DailyPracticeForm from './DailyPracticeForm'

export default function VisualizationForm() {
  return (
    <DailyPracticeForm
      endpoint="/api/mindset/visualization"
      title="Daily Visualization"
      description="See yourself performing at your peak. Visualize the outcome you want before it happens."
      checkboxLabel="I visualized today"
      notesPlaceholder="What did you visualize? How did it feel?"
    />
  )
}
