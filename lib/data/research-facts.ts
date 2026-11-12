// One research fact per Progress section. Each line says only what the
// cited paper found. Do not add a fact without checking the source.
import type { InsightSection } from '@/lib/insights'

export interface ResearchFact { section: InsightSection; text: string; source: string }

export const RESEARCH_FACTS: ResearchFact[] = [
  {
    section: 'mindset',
    text: 'Goals about what you do each day beat goals about results. In a review of 27 studies, process goals improved performance far more than outcome goals.',
    source: 'Williamson et al., 2022. International Review of Sport and Exercise Psychology.',
  },
  {
    section: 'mindset',
    text: 'Self-talk works. Across 32 studies, athletes who trained their self-talk performed better, most of all on precise skills.',
    source: 'Hatzigeorgiadis et al., 2011. Perspectives on Psychological Science.',
  },
  {
    section: 'flow',
    text: 'Flow and performance move together. Across 22 studies in sport and gaming, more flow went with better performance.',
    source: 'Harris, Allen, Vine & Wilson, 2021. International Review of Sport and Exercise Psychology.',
  },
  {
    section: 'flow',
    text: 'Athletes who use a consistent pre-performance routine perform better, in practice and under pressure.',
    source: 'Rupprecht, Tran & Gröpel, 2021. International Review of Sport and Exercise Psychology.',
  },
  {
    section: 'nutrition',
    text: 'Fuel is part of the game plan. Sports nutrition bodies advise carbohydrate in the hours before competing to top up the fuel your muscles and brain use.',
    source: 'Thomas, Erdman & Burke, 2016. Joint position on nutrition and athletic performance.',
  },
  {
    section: 'exercise',
    text: 'Strength training protects you. In a review of 25 trials, it cut sports injuries to less than a third and almost halved overuse injuries.',
    source: 'Lauersen, Bertelsen & Andersen, 2014. British Journal of Sports Medicine.',
  },
  {
    section: 'sleep',
    text: 'More sleep, better play. College basketball players who extended their sleep ran faster sprints and shot about 9% better on free throws and threes.',
    source: 'Mah et al., 2011. Sleep. A small study of 11 players.',
  },
]

// One fact per section, changing weekly so it stays fresh.
export function factFor(section: InsightSection, dateKey: string): ResearchFact | null {
  const list = RESEARCH_FACTS.filter(f => f.section === section)
  if (list.length === 0) return null
  const week = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / (7 * 86_400_000))
  return list[((week % list.length) + list.length) % list.length]
}
