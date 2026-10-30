import TabBar from './TabBar'

export type Section = 'mindset' | 'flow' | 'nutrition' | 'exercise' | 'sleep'

const SECTIONS: Section[] = ['mindset', 'flow', 'nutrition', 'exercise', 'sleep']

export default function SectionTabs({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <TabBar
      label="Section"
      tabs={SECTIONS.map(s => ({ key: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
      active={active}
      onSelect={onSelect}
    />
  )
}
