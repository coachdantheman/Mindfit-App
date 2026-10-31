'use client'
import BottomSheet from '@/components/shared/BottomSheet'
import { MIN_TITLE_POINTS, PILLARS, TITLES, TITLE_RULES } from '@/lib/leaderboard-config'

const pct = (f: number) => `${Math.round(f * 100)}%`
const pillarName = (k: string) => PILLARS.find(p => p.key === k)?.name ?? k

export default function TitlesGuideSheet({ onClose }: { onClose: () => void }) {
  const singles = TITLES.filter(t => t.pillars.length === 1)
  const pairs = TITLES.filter(t => t.pillars.length === 2)
  const clutch = TITLES.find(t => t.key === 'clutch')!
  const utility = TITLES.find(t => t.key === 'utility')!

  const Group = ({ heading, rule, items }: { heading: string; rule: string; items: typeof TITLES }) => (
    <div>
      <p className="text-xs uppercase tracking-wide text-fg-4">{heading}</p>
      <p className="text-xs text-fg-4 mb-2">{rule}</p>
      <ul className="space-y-2">
        {items.map(t => (
          <li key={t.key} className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden>{t.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-fg-1">{t.name} <span className="text-xs font-normal text-fg-4">· {t.pillars.map(pillarName).join(' + ')}</span></p>
              <p className="text-xs text-fg-3">{t.blurb}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <BottomSheet title="Titles" onClose={onClose}>
      <p className="text-sm text-fg-3 mb-4">Your title says what kind of athlete you&rsquo;ve been this month. It needs {MIN_TITLE_POINTS}+ points and follows where your points come from.</p>
      <div className="space-y-5">
        <Group heading="Specialists" rule={`One pillar is ${pct(TITLE_RULES.single)}+ of your points`} items={singles} />
        <Group heading="Hybrids" rule={`Your top two pillars are each ${pct(TITLE_RULES.pair)}+`} items={pairs} />
        <Group heading="The complete athlete" rule={`All four pillars are ${pct(TITLE_RULES.balanced)}+`} items={[clutch]} />
        <Group heading="Otherwise" rule="Points spread out with no clear lane yet" items={[utility]} />
      </div>
    </BottomSheet>
  )
}
