export type Section = 'mindset' | 'flow' | 'nutrition' | 'exercise' | 'sleep'

const SECTIONS: Section[] = ['mindset', 'flow', 'nutrition', 'exercise', 'sleep']

export default function SectionTabs({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
      {SECTIONS.map(s => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={active === s ? 'tab-btn-active' : 'tab-btn'}
        >
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>
  )
}
