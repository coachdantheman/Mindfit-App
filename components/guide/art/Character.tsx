import type { GuideKey } from '@/lib/guide-characters'

export type Species = GuideKey
type Body = 'sparrow' | 'falcon' | 'eagle' | 'dog' | 'wolf' | 'bear' | 'fish' | 'dolphin' | 'shark'

// Each starter line grows through three forms (lib/guide-characters.ts stageFor).
const FORMS: Record<Species, [Body, Body, Body]> = {
  sparrow: ['sparrow', 'falcon', 'eagle'],
  dog: ['dog', 'wolf', 'bear'],
  fish: ['fish', 'dolphin', 'shark'],
}
export type CharacterState = 'idle' | 'talk' | 'point' | 'cheer' | 'steady' | 'sleep'

// Line art on a 100×100 grid, painted back to front: gc-f (body) and gc-t (darker tone)
// fills hide the lines behind them, gc-s is solid gold, gc-h an eye highlight.
// Moving parts carry gc-* classes; the motion is in globals.css. `vars` holds the pivots
// (grid units) and the angles of the point pose; `face` is the crop used for small icons.
const BODIES: Record<Body, { vars: Record<string, string>; face: string; art: React.ReactNode }> = {
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
  falcon: {
    face: '22 24 56 56',
    vars: { '--gc-limb': '70px 46px', '--gc-point': '-95deg', '--gc-lean': '4deg' },
    art: (
      <>
        <path className="gc-t" d="M43 78 L46 92 L50 86 L54 92 L57 78 Z" />
        <path d="M44 82 v6 M40 88 h8 M56 82 v6 M52 88 h8" />
        <g className="gc-body">
          <ellipse className="gc-f" cx="50" cy="56" rx="22" ry="27" />
          <path className="gc-t" stroke="none" d="M30 44 A22 27 0 0 1 70 44 Q50 36 30 44 Z" />
          <ellipse cx="50" cy="56" rx="22" ry="27" />
          <path className="gc-t" d="M30 46 Q14 62 22 84 Q33 66 30 46 Z" />
          <g className="gc-limb"><path className="gc-t" d="M70 46 Q86 62 78 84 Q67 66 70 46 Z" /></g>
          <path d="M37 43 l8 2 M63 43 l-8 2" />
          <g className="gc-eye"><circle className="gc-s" cx="41" cy="49" r="3.2" /><circle className="gc-s" cx="59" cy="49" r="3.2" /><circle className="gc-h" cx="42.2" cy="47.8" r="1.1" /><circle className="gc-h" cx="60.2" cy="47.8" r="1.1" /></g>
          <path className="gc-eye-closed" d="M38 49 q3 3 6 0 M56 49 q3 3 6 0" />
          <path className="gc-mouth gc-s" d="M45 54 Q50 52 55 54 L50 63 Z" />
        </g>
      </>
    ),
  },
  eagle: {
    face: '24 12 52 52',
    vars: { '--gc-limb': '73px 52px', '--gc-point': '-95deg', '--gc-lean': '4deg' },
    art: (
      <>
        <path className="gc-f" d="M40 86 L43 97 L50 90 L57 97 L60 86 Z" />
        <path d="M42 88 v6 M38 94 h8 M58 88 v6 M54 94 h8" />
        <g className="gc-body">
          <path className="gc-t" d="M26 62 Q26 88 50 90 Q74 88 74 62 Q74 42 50 42 Q26 42 26 62 Z" />
          <path className="gc-t" d="M27 52 Q8 66 16 92 Q30 76 30 56 Z" />
          <g className="gc-limb"><path className="gc-t" d="M73 52 Q92 66 84 92 Q70 76 70 56 Z" /></g>
          <circle className="gc-f" cx="50" cy="35" r="17" />
          <path d="M38 28 l10 4 M62 28 l-10 4" />
          <g className="gc-eye"><circle className="gc-s" cx="43" cy="36" r="3.2" /><circle className="gc-s" cx="57" cy="36" r="3.2" /><circle className="gc-h" cx="44.2" cy="34.8" r="1.1" /><circle className="gc-h" cx="58.2" cy="34.8" r="1.1" /></g>
          <path className="gc-eye-closed" d="M40 36 q3 3 6 0 M54 36 q3 3 6 0" />
          <path className="gc-mouth gc-s" d="M44.5 41 Q50 39 55.5 41 L50 52 Z" />
        </g>
      </>
    ),
  },
  wolf: {
    face: '20 8 60 60',
    vars: { '--gc-limb': '61px 63px', '--gc-point': '-72deg', '--gc-lean': '4deg', '--gc-tail': '37px 84px' },
    art: (
      <>
        <g className="gc-tail"><path className="gc-t" d="M38 86 Q18 88 15 70 Q26 75 35 72 Z" /></g>
        <g className="gc-body">
          <path className="gc-f" d="M37 60 Q30 86 40 88 H60 Q70 86 63 60 Z" />
          <path d="M45 88 v-10 M55 88 v-10" />
          <g className="gc-limb"><path className="gc-f" d="M60 62 Q72 64 73 78 Q69 83 64 79 Q63 70 60 62 Z" /></g>
          <path className="gc-t" d="M35 30 L32 14 L46 25 Z M65 30 L68 14 L54 25 Z" />
          <circle className="gc-f" cx="50" cy="42" r="19" />
          <path className="gc-f" d="M32 46 L24 51 L33 54 M68 46 L76 51 L67 54" />
          <path d="M38 35 l7 1.5 M62 35 l-7 1.5" />
          <g className="gc-eye"><circle className="gc-s" cx="42" cy="41" r="3.2" /><circle className="gc-s" cx="58" cy="41" r="3.2" /><circle className="gc-h" cx="43.2" cy="39.8" r="1.1" /><circle className="gc-h" cx="59.2" cy="39.8" r="1.1" /></g>
          <path className="gc-eye-closed" d="M39 41 q3 3 6 0 M55 41 q3 3 6 0" />
          <ellipse className="gc-f" cx="50" cy="51" rx="9" ry="7" />
          <ellipse className="gc-s" cx="50" cy="47.5" rx="3.4" ry="2.4" />
          <path className="gc-mouth" d="M50 50 v2.5 M50 52.5 q-3.5 3.5 -6 1 M50 52.5 q3.5 3.5 6 1" />
        </g>
      </>
    ),
  },
  bear: {
    face: '22 8 56 56',
    vars: { '--gc-limb': '72px 57px', '--gc-point': '-75deg', '--gc-lean': '3deg' },
    art: (
      <>
        <g className="gc-body">
          <ellipse className="gc-f" cx="38" cy="89" rx="9" ry="5" /><ellipse className="gc-f" cx="62" cy="89" rx="9" ry="5" />
          <ellipse className="gc-f" cx="50" cy="66" rx="26" ry="24" />
          <ellipse className="gc-t" cx="50" cy="70" rx="14" ry="13" stroke="none" />
          <path className="gc-f" d="M29 56 Q16 64 20 80 Q27 82 30 76 Q28 66 31 58 Z" />
          <g className="gc-limb"><path className="gc-f" d="M71 56 Q84 64 80 80 Q73 82 70 76 Q72 66 69 58 Z" /></g>
          <circle className="gc-t" cx="33" cy="20" r="7" /><circle className="gc-t" cx="67" cy="20" r="7" />
          <circle className="gc-f" cx="50" cy="36" r="20" />
          <g className="gc-eye"><circle className="gc-s" cx="42" cy="34" r="3.2" /><circle className="gc-s" cx="58" cy="34" r="3.2" /><circle className="gc-h" cx="43.2" cy="32.8" r="1.1" /><circle className="gc-h" cx="59.2" cy="32.8" r="1.1" /></g>
          <path className="gc-eye-closed" d="M39 34 q3 3 6 0 M55 34 q3 3 6 0" />
          <ellipse className="gc-f" cx="50" cy="44" rx="9" ry="7" />
          <ellipse className="gc-s" cx="50" cy="41" rx="3.6" ry="2.6" />
          <path className="gc-mouth" d="M50 43.5 v2.5 M50 46 q-3.5 3 -6 0.5 M50 46 q3.5 3 6 0.5" />
        </g>
      </>
    ),
  },
  dolphin: {
    face: '8 8 88 88',
    vars: { '--gc-limb': '54px 60px', '--gc-point': '-55deg', '--gc-lean': '-14deg', '--gc-tail': '17px 60px' },
    art: (
      <>
        <circle cx="92" cy="30" r="2.4" opacity="0.6" /><circle cx="96" cy="21" r="1.5" opacity="0.6" />
        <g className="gc-body">
          <g className="gc-tail"><path className="gc-t" d="M18 60 L4 46 Q10 60 5 74 Z" /></g>
          <path className="gc-t" d="M44 36 Q52 18 60 35 Z" />
          <path className="gc-f" d="M14 60 Q30 30 58 34 Q76 36 84 46 L95 49 Q88 56 80 56 Q64 72 40 69 Q24 67 14 60 Z" />
          <path d="M28 61 Q52 67 78 55" opacity="0.5" />
          <g className="gc-limb"><path className="gc-t" d="M54 60 Q59 75 46 75 Q46 66 54 60 Z" /></g>
          <g className="gc-eye"><circle className="gc-s" cx="72" cy="46" r="3.4" /><circle className="gc-h" cx="73.3" cy="44.7" r="1.2" /></g>
          <path className="gc-eye-closed" d="M68.5 46 q3.5 3.5 7 0" />
          <path className="gc-mouth" d="M93 50.5 q-8 4 -14 1.5" />
        </g>
      </>
    ),
  },
  shark: {
    face: '6 6 92 92',
    vars: { '--gc-limb': '50px 62px', '--gc-point': '-50deg', '--gc-lean': '-12deg', '--gc-tail': '13px 56px' },
    art: (
      <>
        <g className="gc-body">
          <g className="gc-tail"><path className="gc-t" d="M14 56 L2 36 Q10 54 4 74 Z" /></g>
          <path className="gc-t" d="M42 36 L54 13 Q58 28 63 36 Z" />
          <path className="gc-f" d="M10 56 Q30 30 60 34 Q82 38 95 54 Q80 68 58 70 Q32 72 10 56 Z" />
          <path d="M56 44 q-3 7 0 14 M61 45 q-3 6.5 0 13 M66 46 q-3 6 0 12" opacity="0.5" />
          <g className="gc-limb"><path className="gc-t" d="M50 62 Q55 81 38 79 Q42 68 50 62 Z" /></g>
          <path d="M72 42 l8 3" />
          <g className="gc-eye"><circle className="gc-s" cx="78" cy="49" r="3.4" /><circle className="gc-h" cx="79.3" cy="47.7" r="1.2" /></g>
          <path className="gc-eye-closed" d="M74.5 49 q3.5 3.5 7 0" />
          <path className="gc-mouth" d="M91 58 q-8 5 -16 1" />
          <path className="gc-h" stroke="currentColor" d="M79 60.3 l1.6 2.6 l1.6 -2.2 M84 60.2 l1.6 2.4 l1.6 -2.8" />
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

export default function Character({ species, stage = 1, state = 'idle', size = 64, face = false, className = '' }: {
  species: Species
  stage?: 1 | 2 | 3
  state?: CharacterState
  size?: number
  face?: boolean
  className?: string
}) {
  const body = BODIES[FORMS[species][stage - 1]]
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
