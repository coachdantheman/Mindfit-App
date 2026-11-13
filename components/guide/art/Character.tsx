import type { GuideKey } from '@/lib/guide-characters'

export type Species = GuideKey
export type CharacterState = 'idle' | 'talk' | 'point' | 'cheer' | 'steady' | 'sleep'

// Line art on a 100×100 grid, painted back to front: gc-f (body) and gc-t (darker tone)
// fills hide the lines behind them, gc-s is solid gold, gc-h an eye highlight.
// Moving parts carry gc-* classes; the motion is in globals.css. `vars` holds the pivots
// (grid units) and the angles of the point pose; `face` is the crop used for small icons.
const BODIES: Record<Species, { vars: Record<string, string>; face: string; art: React.ReactNode }> = {
  sparrow: {
    face: '21 25 58 58',
    vars: { '--gc-limb': '72px 50px', '--gc-point': '-100deg', '--gc-lean': '4deg' },
    art: (
      <>
        <path className="gc-t" d="M33 70 L17 63 Q13 70 16 78 L33 77 Z" />
        <path d="M44 80 v8 M40 88 h8 M56 80 v8 M52 88 h8" />
        <g className="gc-body">
          <circle className="gc-f" cx="50" cy="56" r="26" />
          <path className="gc-t" stroke="none" d="M28 43 A26 26 0 0 1 72 43 Q50 34 28 43 Z" />
          <circle cx="50" cy="56" r="26" />
          <path d="M49 30 q-3 -6 1 -10 M52 30 q0 -5 5 -7" />
          <path className="gc-t" d="M28 50 Q16 58 24 72 Q31 64 28 50 Z" />
          <g className="gc-limb"><path className="gc-t" d="M72 50 Q84 58 76 72 Q69 64 72 50 Z" /></g>
          <g className="gc-eye">
            <circle className="gc-s" cx="41" cy="50" r="3.2" /><circle className="gc-s" cx="59" cy="50" r="3.2" />
            <circle className="gc-h" cx="42.2" cy="48.8" r="1.1" /><circle className="gc-h" cx="60.2" cy="48.8" r="1.1" />
          </g>
          <path className="gc-eye-closed" d="M38 50 q3 3 6 0 M56 50 q3 3 6 0" />
          <path className="gc-mouth gc-s" d="M45.5 54.5 L50 61.5 L54.5 54.5 Z" />
        </g>
      </>
    ),
  },
  dog: {
    face: '19 16 62 62',
    vars: { '--gc-limb': '61px 63px', '--gc-point': '-72deg', '--gc-lean': '4deg', '--gc-tail': '37px 82px' },
    art: (
      <>
        <g className="gc-tail"><path d="M37 82 Q23 80 24 67" /></g>
        <g className="gc-body">
          <path className="gc-f" d="M37 60 Q30 86 40 88 H60 Q70 86 63 60 Z" />
          <path d="M45 88 v-10 M55 88 v-10" />
          <g className="gc-limb"><path className="gc-f" d="M60 62 Q72 64 73 78 Q69 83 64 79 Q63 70 60 62 Z" /></g>
          <circle className="gc-f" cx="50" cy="42" r="20" />
          <path className="gc-t" d="M35 27 Q20 27 22 49 Q31 47 34 37 Z" />
          <path className="gc-t" d="M65 27 Q80 27 78 49 Q69 47 66 37 Z" />
          <g className="gc-eye">
            <circle className="gc-s" cx="42" cy="41" r="3.2" /><circle className="gc-s" cx="58" cy="41" r="3.2" />
            <circle className="gc-h" cx="43.2" cy="39.8" r="1.1" /><circle className="gc-h" cx="59.2" cy="39.8" r="1.1" />
          </g>
          <path className="gc-eye-closed" d="M39 41 q3 3 6 0 M55 41 q3 3 6 0" />
          <ellipse className="gc-s" cx="50" cy="48" rx="3.4" ry="2.4" />
          <path className="gc-mouth" d="M50 50.5 v2.5 M50 53 q-4 4 -7 1 M50 53 q4 4 7 1" />
        </g>
      </>
    ),
  },
  fish: {
    face: '8 8 80 80',
    vars: { '--gc-limb': '48px 58px', '--gc-point': '-55deg', '--gc-lean': '-14deg', '--gc-tail': '26px 52px' },
    art: (
      <>
        <circle cx="90" cy="38" r="2.6" opacity="0.6" /><circle cx="94" cy="28" r="1.6" opacity="0.6" />
        <g className="gc-body">
          <g className="gc-tail"><path className="gc-t" d="M27 52 L10 38 Q15 52 10 66 Z" /></g>
          <path className="gc-t" d="M38 38 Q48 20 60 35 Z" />
          <path className="gc-f" d="M24 52 Q38 28 62 34 Q82 40 84 54 Q80 70 60 72 Q38 76 24 52 Z" />
          <path d="M60 44 Q56 54 60 64" opacity="0.5" />
          <g className="gc-limb"><path className="gc-t" d="M48 58 Q54 70 42 72 Q40 64 48 58 Z" /></g>
          <g className="gc-eye">
            <circle className="gc-s" cx="69" cy="50" r="3.8" /><circle className="gc-h" cx="70.4" cy="48.6" r="1.3" />
          </g>
          <path className="gc-eye-closed" d="M65.5 50 q3.5 3.5 7 0" />
          <path className="gc-mouth" d="M81 60 q-4 3 -8 0" />
        </g>
      </>
    ),
  },
}

export default function Character({ species, state = 'idle', size = 64, face = false, className = '' }: {
  species: Species
  state?: CharacterState
  size?: number
  face?: boolean
  className?: string
}) {
  const body = BODIES[species]
  return (
    <svg
      viewBox={face ? body.face : '0 0 100 100'}
      width={size}
      height={size}
      aria-hidden
      className={`gc gc-${species} gc-${state} ${face ? 'gc-face' : ''} text-cta ${className}`}
      style={body.vars as React.CSSProperties}
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 48 ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="gc-all">
        {body.art}
        <path className="gc-spark" d="M12 20 v8 M8 24 h8 M88 8 v6 M85 11 h6 M92 72 v6 M89 75 h6" />
        <g className="gc-zzz gc-s">
          <text x="74" y="26" fontSize="12">z</text><text x="83" y="16" fontSize="9">z</text>
        </g>
      </g>
    </svg>
  )
}
