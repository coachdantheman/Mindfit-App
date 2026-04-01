import { JournalEntry } from '@/types'

const ratingColors: Record<string, string> = {
  motivation: 'bg-blue-500',
  focus: 'bg-purple-500',
  confidence: 'bg-green-500',
  anxiety: 'bg-orange-500',
}

function RatingBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 rounded-full ${color} text-white font-bold text-lg flex items-center justify-center mx-auto`}>
        {value}
      </div>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function TodayEntry({ entry }: { entry: JournalEntry }) {
  return (
    <div className="space-y-6">
      <div className="bg-brand-600/10 border border-brand-600/30 rounded-2xl p-4 text-center">
        <p className="text-cta font-semibold">Journal submitted for today!</p>
        <p className="text-gray-400 text-sm mt-1">Come back tomorrow for your next entry.</p>
      </div>

      {/* Ratings summary */}
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        <h3 className="font-semibold text-gray-100 mb-4">Today&apos;s Ratings</h3>
        <div className="grid grid-cols-4 gap-4">
          <RatingBadge label="Motivation" value={entry.rating_motivation} color={ratingColors.motivation} />
          <RatingBadge label="Focus" value={entry.rating_focus} color={ratingColors.focus} />
          <RatingBadge label="Confidence" value={entry.rating_confidence} color={ratingColors.confidence} />
          <RatingBadge label="Anxiety" value={entry.rating_anxiety} color={ratingColors.anxiety} />
        </div>
      </div>

      {/* Entry details */}
      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6 space-y-5">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objective</h4>
          <p className="text-gray-200">{entry.objective}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Action Steps</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-200 text-sm">
            <li>{entry.action_step_1}</li>
            <li>{entry.action_step_2}</li>
            <li>{entry.action_step_3}</li>
          </ol>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Strengths</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-200 text-sm">
            <li>{entry.strength_1}</li>
            <li>{entry.strength_2}</li>
            <li>{entry.strength_3}</li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Weakness to Focus On</h4>
          <p className="text-gray-200">{entry.weakness}</p>
        </div>
        {entry.extra_notes && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</h4>
            <p className="text-gray-200">{entry.extra_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
