import type { Insight, InsightSection } from '@/lib/insights'
import type { ResearchFact } from '@/lib/data/research-facts'

export default function InsightsCard({ section, insights, fact }: {
  section: InsightSection
  insights: Insight[]
  fact: ResearchFact | null
}) {
  const mine = insights.filter(i => i.section === section)
  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-fg-1 text-sm">Your patterns</h3>
      {mine.length > 0 ? (
        <ul className="space-y-2.5">
          {mine.map((insight, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-fg-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cta shrink-0" />
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-4">Keep logging. Patterns show up after about a week of entries.</p>
      )}
      {fact && (
        <div className="border-t border-edge-muted pt-4">
          <p className="text-xs uppercase tracking-wider text-fg-4 font-mono mb-1.5">Research says</p>
          <p className="text-sm text-fg-2 leading-relaxed">{fact.text}</p>
          <p className="text-xs text-fg-4 mt-1.5">{fact.source}</p>
        </div>
      )}
    </div>
  )
}
