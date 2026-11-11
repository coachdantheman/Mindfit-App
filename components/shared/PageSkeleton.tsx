type Variant = 'mindset' | 'nutrition' | 'exercise' | 'sleep' | 'progress' | 'board' | 'learn' | 'list'

const Bar = ({ className = '' }: { className?: string }) => <div className={`skeleton ${className}`} />

function Tabs({ n = 4 }: { n?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => <Bar key={i} className="h-9 w-24 shrink-0" />)}
    </div>
  )
}

function Cards({ n = 3, h = 'h-20' }: { n?: number; h?: string }) {
  return <>{Array.from({ length: n }).map((_, i) => <Bar key={i} className={`${h} rounded-2xl`} />)}</>
}

const BODY: Record<Variant, React.ReactNode> = {
  mindset: <><Bar className="h-28 rounded-2xl" /><Tabs n={3} /><Bar className="h-16 rounded-2xl" /><Bar className="h-56 rounded-2xl" /></>,
  nutrition: <><Tabs /><Bar className="h-12" /><Bar className="h-40 rounded-2xl" /><Cards n={3} h="h-24" /></>,
  exercise: <><Tabs n={5} /><Bar className="h-32 rounded-2xl" /><Cards n={4} h="h-16" /></>,
  sleep: <><Bar className="h-12" /><Bar className="h-64 rounded-2xl" /><Bar className="h-48 rounded-2xl" /></>,
  progress: <><Bar className="h-32 rounded-2xl" /><div className="grid grid-cols-2 gap-3"><Cards n={4} h="h-24" /></div><Bar className="h-56 rounded-2xl" /></>,
  board: <><Bar className="h-44 rounded-2xl" /><div className="grid grid-cols-3 gap-3 items-end"><Bar className="h-24 rounded-2xl" /><Bar className="h-32 rounded-2xl" /><Bar className="h-20 rounded-2xl" /></div><Cards n={6} h="h-12" /></>,
  learn: <><Tabs n={2} /><Cards n={4} h="h-24" /></>,
  list: <Cards n={5} h="h-16" />,
}

export function variantFor(pathname: string): Variant {
  const seg = pathname.split('/')[1]
  if (seg === 'leaderboard') return 'board'
  return (['mindset', 'nutrition', 'exercise', 'sleep', 'progress', 'learn'] as const).find(v => v === seg) ?? 'list'
}

// Grey blocks in the shape of the page that is about to appear. Pass the
// real title so the heading never jumps when the data lands.
export default function PageSkeleton({ variant, title, subtitle }: { variant: Variant; title?: string; subtitle?: string }) {
  return (
    <div role="status" aria-label="Loading" className="mf-skeleton-page space-y-4">
      {title
        ? <div><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>
        : <div className="space-y-2"><Bar className="h-8 w-40" /><Bar className="h-4 w-56" /></div>}
      {BODY[variant]}
    </div>
  )
}
