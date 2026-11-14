import type { GuideKey } from '@/lib/guide-characters'
import { Outfit, SportProp, moveFor, type Anchors } from './Wear'

export type Species = GuideKey
type Body = 'sparrow' | 'falcon' | 'eagle' | 'dog' | 'wolf' | 'bear' | 'fish' | 'dolphin' | 'shark' | Unlock
type Unlock = 'fox' | 'lion' | 'phoenix' | 'owl' | 'bull' | 'raccoon' | 'sloth' | 'tiger' | 'stag' | 'ram' | 'chameleon' | 'beaver' | 'dragon'

// Each starter line grows through three forms (lib/guide-characters.ts stageFor).
const FORMS: Partial<Record<Species, [Body, Body, Body]>> = {
  sparrow: ['sparrow', 'falcon', 'eagle'],
  dog: ['dog', 'wolf', 'bear'],
  fish: ['fish', 'dolphin', 'shark'],
}
export type CharacterState = 'idle' | 'talk' | 'point' | 'cheer' | 'steady' | 'sleep' | 'emote'

// Line art on a 100×100 grid, painted back to front: gc-f (body) and gc-t (darker tone)
// fills hide the lines behind them, gc-s is solid gold, gc-h an eye highlight.
// Moving parts carry gc-* classes; the motion is in globals.css. `vars` holds the pivots
// (grid units) and the angles of the point pose; `face` is the crop used for small icons.
const BODIES: Record<Exclude<Body, Unlock>, { vars: Record<string, string>; face: string; at: Anchors; art: React.ReactNode }> = {
  sparrow: {
    face: '21 25 58 58',
    at: { head: [50, 31, 20], neck: [50, 66, 19], waist: [50, 75, 22], hand: [88, 56, 7] },
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
    at: { head: [50, 30, 16], neck: [50, 66, 16], waist: [50, 75, 19], hand: [88, 54, 7] },
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
    at: { head: [50, 19, 15], neck: [50, 53, 15], waist: [50, 74, 22], hand: [91, 56, 7] },
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
    at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] },
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
    at: { head: [50, 17, 17], neck: [50, 56, 14], waist: [50, 76, 24], hand: [90, 60, 7] },
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
    at: { head: [70, 36, 9], neck: [64, 59, 9], waist: [44, 52, 12], hand: [90, 72, 6] },
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
    at: { head: [76, 39, 9], neck: [66, 63, 9], waist: [42, 52, 12], hand: [90, 76, 6] },
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
    at: { head: [50, 23, 17], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] },
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
    at: { head: [64, 36, 11], neck: [60, 63, 10], waist: [44, 54, 12], hand: [90, 70, 6] },
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


type Art = { vars: Record<string, string>; face: string; at: Anchors; art: React.ReactNode }

const SIT = { '--gc-limb': '61px 63px', '--gc-point': '-72deg', '--gc-lean': '4deg', '--gc-tail': '37px 84px' }

// The shared sitting body for four-legged characters: `back` paints behind the
// head (mane, horns), `ears` over it, `marks` on the face under the eyes,
// `behind` behind everything (wings), and `muzzle` replaces the nose and mouth.
function sitter(o: { behind?: React.ReactNode; muzzle?: React.ReactNode; back?: React.ReactNode; ears?: React.ReactNode; marks?: React.ReactNode; tail?: React.ReactNode; extra?: React.ReactNode }): React.ReactNode {
  return (
    <>
      {o.behind}
      {o.tail && <g className="gc-tail">{o.tail}</g>}
      <g className="gc-body">
        <path className="gc-f" d="M37 60 Q30 86 40 88 H60 Q70 86 63 60 Z" />
        <path d="M45 88 v-10 M55 88 v-10" />
        <g className="gc-limb"><path className="gc-f" d="M60 62 Q72 64 73 78 Q69 83 64 79 Q63 70 60 62 Z" /></g>
        {o.back}
        <circle className="gc-f" cx="50" cy="42" r="19" />
        {o.ears}
        {o.marks}
        <g className="gc-eye">
          <circle className="gc-s" cx="42" cy="41" r="3.2" /><circle className="gc-s" cx="58" cy="41" r="3.2" />
          <circle className="gc-h" cx="43.2" cy="39.8" r="1.1" /><circle className="gc-h" cx="59.2" cy="39.8" r="1.1" />
        </g>
        <path className="gc-eye-closed" d="M39 41 q3 3 6 0 M55 41 q3 3 6 0" />
        {o.muzzle ?? (
          <>
            <ellipse className="gc-f" cx="50" cy="51" rx="8" ry="6.5" />
            <ellipse className="gc-s" cx="50" cy="48" rx="3.2" ry="2.3" />
            <path className="gc-mouth" d="M50 50.3 v2.2 M50 52.5 q-3.5 3.5 -6 1 M50 52.5 q3.5 3.5 6 1" />
          </>
        )}
        {o.extra}
      </g>
    </>
  )
}

const UNLOCKS: Record<Unlock, Art> = {
  fox: {
    face: '20 6 60 60', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <><path className="gc-t" d="M38 86 Q16 90 12 68 Q24 74 35 72 Z" /><path className="gc-f" d="M12 68 Q13 76 20 80 Q19 73 21 72 Z" /></>,
      back: <path className="gc-t" d="M35 31 L29 8 L47 24 Z M65 31 L71 8 L53 24 Z" />,
      marks: <path className="gc-f" d="M32 46 L23 52 L34 55 M68 46 L77 52 L66 55" />,
    }),
  },
  lion: {
    face: '18 10 64 64', at: { head: [50, 17, 16], neck: [50, 62, 12], waist: [50, 77, 14], hand: [84, 64, 7] }, vars: SIT,
    art: sitter({
      tail: <><path d="M37 84 Q22 84 20 70" /><path className="gc-t" d="M20 70 q-5 -3 -3 -9 q5 2 6 7 Z" /></>,
      back: <><circle className="gc-t" cx="50" cy="42" r="27" /><path d="M50 15 v5 M31 23 l3 4 M69 23 l-3 4 M23 42 h5 M77 42 h-5 M31 61 l3 -4 M69 61 l-3 -4" opacity="0.5" /></>,
      ears: <path className="gc-f" d="M36 27 q-6 -6 -2 -11 q7 1 8 8 M64 27 q6 -6 2 -11 q-7 1 -8 8" />,
    }),
  },
  bull: {
    face: '16 6 68 68', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <path d="M37 84 Q24 86 22 72 m0 0 l-3 -4 m3 4 l3 -4" />,
      back: <path className="gc-f" d="M34 30 Q18 26 20 8 Q28 20 40 24 Z M66 30 Q82 26 80 8 Q72 20 60 24 Z" />,
      ears: <path className="gc-t" d="M32 36 Q22 34 20 40 Q26 44 33 42 Z M68 36 Q78 34 80 40 Q74 44 67 42 Z" />,
      extra: <circle cx="50" cy="56" r="3" />,
    }),
  },
  raccoon: {
    face: '22 12 56 56', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <><path className="gc-f" d="M38 86 Q18 88 15 68 Q25 72 35 72 Z" /><path d="M19 72 l8 2 M22 80 l8 -3 M29 86 l5 -6" /></>,
      back: <path className="gc-t" d="M36 29 Q30 18 38 16 Q44 20 44 26 Z M64 29 Q70 18 62 16 Q56 20 56 26 Z" />,
      marks: <path className="gc-t" stroke="none" d="M33 38 Q41 32 48 39 Q46 47 38 47 Q32 44 33 38 Z M67 38 Q59 32 52 39 Q54 47 62 47 Q68 44 67 38 Z" />,
    }),
  },
  tiger: {
    face: '22 12 56 56', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <><path d="M37 84 Q20 86 20 68 Q20 60 26 60" /><path d="M21 76 l5 -1 M20 68 l5 1" opacity="0.7" /></>,
      back: <><circle className="gc-t" cx="35" cy="26" r="6.5" /><circle className="gc-t" cx="65" cy="26" r="6.5" /></>,
      marks: <path d="M50 24 v6 M44 25 l1.5 5 M56 25 l-1.5 5 M32 44 l6 1 M32 49 l5 -0.5 M68 44 l-6 1 M68 49 l-5 -0.5" />,
      extra: <path d="M40 66 l4 2 M40 72 l4 1 M60 66 l-4 2 M60 72 l-4 1" opacity="0.6" />,
    }),
  },
  stag: {
    face: '14 0 72 72', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <path className="gc-f" d="M37 84 q-7 -1 -8 -7 q6 0 9 4 Z" />,
      back: <path d="M40 26 Q36 14 30 6 M36 17 L28 15 M33 11 L27 4 M60 26 Q64 14 70 6 M64 17 L72 15 M67 11 L73 4" />,
      ears: <path className="gc-t" d="M33 34 Q22 28 20 34 Q24 42 33 40 Z M67 34 Q78 28 80 34 Q76 42 67 40 Z" />,
    }),
  },
  ram: {
    face: '14 10 72 72', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <path className="gc-f" d="M37 84 q-7 -1 -8 -7 q6 0 9 4 Z" />,
      back: <path d="M38 27 Q22 22 19 36 Q18 48 27 48 Q34 47 32 40 Q30 36 26 39 M40 31 Q28 28 25 37 M62 27 Q78 22 81 36 Q82 48 73 48 Q66 47 68 40 Q70 36 74 39 M60 31 Q72 28 75 37" />,
      marks: <path d="M44 27 q3 -3 6 0 q3 -3 6 0" opacity="0.6" />,
    }),
  },
  beaver: {
    face: '22 14 56 56', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      tail: <><ellipse className="gc-t" cx="22" cy="80" rx="13" ry="7" transform="rotate(-18 22 80)" /><path d="M14 80 l14 -5 M16 85 l14 -5" opacity="0.5" /></>,
      back: <><circle className="gc-t" cx="35" cy="27" r="5" /><circle className="gc-t" cx="65" cy="27" r="5" /></>,
      extra: <path className="gc-h" stroke="currentColor" d="M47.5 55.5 h5 v4.5 h-5 Z M50 55.5 v4.5" />,
    }),
  },
  dragon: {
    face: '18 4 64 64', at: { head: [50, 24, 16], neck: [50, 61, 12], waist: [50, 77, 14], hand: [84, 62, 7] }, vars: SIT,
    art: sitter({
      behind: <path className="gc-t" d="M38 64 Q14 44 6 20 Q14 32 22 32 Q18 44 28 46 Q26 54 38 58 Z M62 64 Q86 44 94 20 Q86 32 78 32 Q82 44 72 46 Q74 54 62 58 Z" />,
      tail: <><path d="M38 85 Q22 92 15 77" /><path className="gc-t" d="M15 77 L6 78 L12 66 L20 72 Z" /></>,
      back: <path className="gc-f" d="M41 27 Q37 14 30 9 Q40 11 46 23 Z M59 27 Q63 14 70 9 Q60 11 54 23 Z" />,
      ears: <path className="gc-t" d="M32 38 L22 33 L30 45 Z M68 38 L78 33 L70 45 Z" />,
      marks: <path d="M37 34.5 l8 1.5 M63 34.5 l-8 1.5 M47 25 l3 -5 l3 5" />,
      muzzle: (
        <>
          <path className="gc-f" d="M39 50 Q39 45 50 45 Q61 45 61 50 Q61 59 50 59 Q39 59 39 50 Z" />
          <circle className="gc-s" cx="46" cy="49.5" r="1.2" /><circle className="gc-s" cx="54" cy="49.5" r="1.2" />
          <path className="gc-mouth" d="M43 54 q7 3.5 14 0" />
          <path className="gc-h" stroke="currentColor" d="M44 54.4 l1.4 3.6 l1.8 -3 Z M56 54.4 l-1.4 3.6 l-1.8 -3 Z" />
        </>
      ),
      extra: <path d="M43 68 h14 M42 74 h16 M43 80 h14" opacity="0.5" />,
    }),
  },
  sloth: {
    face: '22 16 56 56', at: { head: [50, 24, 16], neck: [50, 61, 13], waist: [50, 79, 15], hand: [86, 66, 7] },
    vars: { '--gc-limb': '63px 62px', '--gc-point': '-60deg', '--gc-lean': '3deg' },
    art: (
      <g className="gc-body">
        <path className="gc-f" d="M36 60 Q28 88 40 90 H60 Q72 88 64 60 Z" />
        <path className="gc-f" d="M37 62 Q24 70 26 90 Q32 92 33 86 Q32 74 40 68 Z" />
        <g className="gc-limb"><path className="gc-f" d="M63 62 Q76 70 74 90 Q68 92 67 86 Q68 74 60 68 Z" /></g>
        <path d="M27 90 l-2 3 M30 91 l-1 3 M73 90 l2 3 M70 91 l1 3" />
        <circle className="gc-f" cx="50" cy="42" r="19" />
        <path className="gc-t" stroke="none" d="M33 44 Q38 34 47 38 Q47 46 40 49 Q34 49 33 44 Z M67 44 Q62 34 53 38 Q53 46 60 49 Q66 49 67 44 Z" />
        <g className="gc-eye">
          <circle className="gc-s" cx="42" cy="42" r="2.8" /><circle className="gc-s" cx="58" cy="42" r="2.8" />
          <circle className="gc-h" cx="43" cy="41" r="1" /><circle className="gc-h" cx="59" cy="41" r="1" />
        </g>
        <path className="gc-eye-closed" d="M39 42 q3 3 6 0 M55 42 q3 3 6 0" />
        <ellipse className="gc-s" cx="50" cy="48" rx="3" ry="2.2" />
        <path className="gc-mouth" d="M44 53 q6 4 12 0" />
      </g>
    ),
  },
  owl: {
    face: '22 22 56 56', at: { head: [50, 30, 18], neck: [50, 66, 18], waist: [50, 75, 20], hand: [88, 56, 7] },
    vars: { '--gc-limb': '71px 50px', '--gc-point': '-95deg', '--gc-lean': '4deg' },
    art: (
      <>
        <path d="M44 82 v6 M40 88 h8 M56 82 v6 M52 88 h8" />
        <g className="gc-body">
          <path className="gc-t" d="M32 34 L28 20 L42 30 Z M68 34 L72 20 L58 30 Z" />
          <ellipse className="gc-f" cx="50" cy="56" rx="24" ry="27" />
          <path className="gc-t" d="M29 50 Q16 62 24 80 Q33 66 30 50 Z" />
          <g className="gc-limb"><path className="gc-t" d="M71 50 Q84 62 76 80 Q67 66 70 50 Z" /></g>
          <circle className="gc-f" cx="40" cy="47" r="9" /><circle className="gc-f" cx="60" cy="47" r="9" />
          <g className="gc-eye">
            <circle className="gc-s" cx="40" cy="47" r="4" /><circle className="gc-s" cx="60" cy="47" r="4" />
            <circle className="gc-h" cx="41.5" cy="45.5" r="1.4" /><circle className="gc-h" cx="61.5" cy="45.5" r="1.4" />
          </g>
          <path className="gc-eye-closed" d="M36 47 q4 4 8 0 M56 47 q4 4 8 0" />
          <path className="gc-mouth gc-s" d="M47 54 L50 60 L53 54 Z" />
          <path d="M42 68 q3 3 6 0 M52 68 q3 3 6 0 M47 74 q3 3 6 0" opacity="0.5" />
        </g>
      </>
    ),
  },
  phoenix: {
    face: '20 14 60 60', at: { head: [50, 32, 15], neck: [50, 65, 15], waist: [50, 73, 18], hand: [90, 48, 6] },
    vars: { '--gc-limb': '70px 52px', '--gc-point': '-100deg', '--gc-lean': '4deg' },
    art: (
      <>
        <path className="gc-t" d="M44 78 Q30 92 14 90 Q28 84 34 72 Z M50 80 Q50 96 40 99 Q46 90 44 80 Z M56 78 Q70 92 86 90 Q72 84 66 72 Z" />
        <g className="gc-body">
          <path className="gc-t" d="M50 30 Q44 20 50 8 Q52 16 58 18 Q54 22 56 30 Z M42 32 Q34 26 36 16 Q40 22 46 24 Z M58 32 Q66 26 66 18 Q62 22 56 24 Z" />
          <ellipse className="gc-f" cx="50" cy="56" rx="21" ry="25" />
          <path className="gc-t" d="M31 50 Q12 52 10 70 Q24 66 32 60 Z" />
          <g className="gc-limb"><path className="gc-t" d="M69 50 Q88 52 90 70 Q76 66 68 60 Z" /></g>
          <g className="gc-eye">
            <circle className="gc-s" cx="42" cy="50" r="3.2" /><circle className="gc-s" cx="58" cy="50" r="3.2" />
            <circle className="gc-h" cx="43.2" cy="48.8" r="1.1" /><circle className="gc-h" cx="59.2" cy="48.8" r="1.1" />
          </g>
          <path className="gc-eye-closed" d="M39 50 q3 3 6 0 M55 50 q3 3 6 0" />
          <path className="gc-mouth gc-s" d="M46 55 L50 62 L54 55 Z" />
        </g>
      </>
    ),
  },
  chameleon: {
    face: '10 14 80 80', at: { head: [73, 35, 8], neck: [64, 57, 8], waist: [44, 56, 11], hand: [90, 72, 6] },
    vars: { '--gc-limb': '56px 62px', '--gc-point': '-40deg', '--gc-lean': '-6deg', '--gc-tail': '26px 62px' },
    art: (
      <g className="gc-body">
        <g className="gc-tail"><path d="M28 62 Q10 62 10 74 Q10 84 20 84 Q27 84 27 77 Q27 72 22 72 Q18 73 19 77" /></g>
        <path className="gc-f" d="M26 62 Q30 38 54 38 Q62 30 72 34 Q86 40 88 52 Q84 60 74 60 Q66 70 46 70 Q32 70 26 62 Z" />
        <path className="gc-t" d="M56 38 Q62 26 72 34 Z" />
        <path d="M38 48 q6 -4 12 0 M36 56 q8 -4 16 0" opacity="0.5" />
        <path d="M40 70 v10 h-5 M48 70 v10 h5" />
        <g className="gc-limb"><path d="M60 66 v12 h6" /></g>
        <circle className="gc-f" cx="74" cy="46" r="6.5" />
        <g className="gc-eye"><circle className="gc-s" cx="75" cy="46" r="2.8" /><circle className="gc-h" cx="76" cy="45" r="1" /></g>
        <path className="gc-eye-closed" d="M71.5 46 q3.5 3 7 0" />
        <path className="gc-mouth" d="M87 54 q-6 3 -12 1" />
      </g>
    ),
  },
}

const ALL: Record<Body, Art> = { ...BODIES, ...UNLOCKS }

export default function Character({ species, stage = 1, state = 'idle', size = 64, face = false, outfit, sport, className = '' }: {
  species: Species
  stage?: 1 | 2 | 3
  state?: CharacterState
  size?: number
  face?: boolean
  // A title key (lib/leaderboard-config.ts TITLES) the character dresses as.
  outfit?: string | null
  // A sport key (Wear.tsx sportKey); its prop shows in the emote state.
  sport?: string | null
  className?: string
}) {
  // Starters have three forms; unlocked characters have one.
  const body = ALL[FORMS[species]?.[stage - 1] ?? (species as Body)]
  return (
    <svg
      viewBox={face ? body.face : '0 0 100 100'}
      width={size}
      height={size}
      aria-hidden
      className={`gc gc-${species} gc-${state} ${state === 'emote' ? `gc-move-${moveFor(sport ?? null) ?? 'hop'}` : ''} ${face ? 'gc-face' : ''} text-cta ${className}`}
      style={body.vars as React.CSSProperties}
      fill="none"
      stroke="currentColor"
      strokeWidth={size >= 48 ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="gc-all">
        {body.art}
        {outfit && <Outfit outfit={outfit} anchors={body.at} />}
        {state === 'emote' && sport && <SportProp sport={sport} anchors={body.at} />}
        <path className="gc-spark" d="M12 20 v8 M8 24 h8 M88 8 v6 M85 11 h6 M92 72 v6 M89 75 h6" />
        <g className="gc-zzz gc-s">
          <text x="74" y="26" fontSize="12">z</text><text x="83" y="16" fontSize="9">z</text>
        </g>
      </g>
    </svg>
  )
}
