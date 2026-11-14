// Title outfits and sport props for the guide characters. Each is drawn once
// in a small unit space and placed on a character's anchor (head, neck, waist
// or hand), scaled to that character, so one drawing fits every body.

export type Anchor = [x: number, y: number, half: number]
export interface Anchors { head: Anchor; neck: Anchor; waist: Anchor; hand: Anchor }

const place = (a: Anchor) => `translate(${a[0]} ${a[1]}) scale(${a[2]})`

type Slot = 'head' | 'neck' | 'waist'
const OUTFITS: Record<string, { slot: Slot; art: React.ReactNode }> = {
  warming_up: { slot: 'head', art: <path className="gc-t" d="M-0.98 0.35 Q0 0.1 0.98 0.35 L0.98 0.62 Q0 0.37 -0.98 0.62 Z" /> },
  gym_monk: {
    slot: 'head',
    art: <><path className="gc-s" d="M-0.98 0.35 Q0 0.1 0.98 0.35 L0.98 0.6 Q0 0.35 -0.98 0.6 Z" /><path className="gc-s" d="M0.93 0.42 l0.5 -0.22 l-0.12 0.32 l0.42 0.2 l-0.78 0.06 Z" /></>,
  },
  chef: {
    slot: 'head',
    art: <><path className="gc-f" d="M-0.6 0.15 L-0.6 -0.3 Q-1 -0.5 -0.75 -0.85 Q-0.5 -1.15 -0.2 -0.95 Q0 -1.25 0.2 -0.95 Q0.5 -1.15 0.75 -0.85 Q1 -0.5 0.6 -0.3 L0.6 0.15 Z" /><path d="M-0.6 -0.1 H0.6" /></>,
  },
  recharger: {
    slot: 'head',
    art: <><path className="gc-t" d="M-0.75 0.3 Q-0.75 0.05 -0.4 0.05 Q-0.05 0.05 0 0.25 Q0.05 0.05 0.4 0.05 Q0.75 0.05 0.75 0.3 Q0.75 0.6 0.4 0.6 Q0.1 0.6 0 0.4 Q-0.1 0.6 -0.4 0.6 Q-0.75 0.6 -0.75 0.3 Z" /><path d="M-0.75 0.3 L-1 0.42 M0.75 0.3 L1 0.42" /></>,
  },
  dreamer: {
    slot: 'head',
    art: <><path className="gc-t" d="M-0.8 0.3 Q-0.6 -0.9 0.4 -0.8 Q1.1 -0.7 1.25 0 Q0.9 -0.35 0.5 -0.3 Q0.75 0 0.8 0.3 Z" /><circle className="gc-f" cx="1.25" cy="0.14" r="0.17" /><path d="M-0.85 0.3 H0.85" /></>,
  },
  machine: {
    slot: 'head',
    art: <><circle className="gc-f" cx="-0.4" cy="0.36" r="0.3" /><circle className="gc-f" cx="0.4" cy="0.36" r="0.3" /><path d="M-1 0.36 H-0.7 M0.7 0.36 H1 M-0.1 0.36 H0.1" /></>,
  },
  clutch: { slot: 'head', art: <path className="gc-s" d="M-0.7 0.2 L-0.82 -0.5 L-0.36 -0.15 L0 -0.72 L0.36 -0.15 L0.82 -0.5 L0.7 0.2 Z" /> },
  monk: {
    slot: 'neck',
    art: <>{[-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].map(x => <circle key={x} className="gc-s" cx={x} cy={0.5 * (1 - x * x)} r="0.13" />)}</>,
  },
  zen_chef: { slot: 'neck', art: <path className="gc-t" d="M-0.9 -0.1 Q0 0.3 0.9 -0.1 L0 0.95 Z" /> },
  tank: {
    slot: 'neck',
    art: <><path className="gc-f" d="M-1.5 0 Q-1.5 -0.6 -0.7 -0.5 L-0.6 0.2 Q-1.1 0.4 -1.5 0 Z M1.5 0 Q1.5 -0.6 0.7 -0.5 L0.6 0.2 Q1.1 0.4 1.5 0 Z" /><circle className="gc-s" cx="-1.05" cy="-0.12" r="0.09" /><circle className="gc-s" cx="1.05" cy="-0.12" r="0.09" /></>,
  },
  fully_charged: {
    slot: 'neck',
    art: <><path className="gc-t" d="M-1 -0.15 Q0 0.35 1 -0.15 L1 0.2 Q0 0.7 -1 0.2 Z" /><path className="gc-s" d="M0.1 0.4 L-0.25 1 H0.05 L-0.1 1.5 L0.4 0.8 H0.1 Z" /></>,
  },
  gym_rat: {
    slot: 'waist',
    art: <><path className="gc-t" d="M-1 -0.22 H1 V0.22 H-1 Z" /><path className="gc-f" d="M-0.2 -0.3 H0.2 V0.3 H-0.2 Z" /></>,
  },
  utility: {
    slot: 'waist',
    art: <><path className="gc-t" d="M-1 -0.15 H1 V0.15 H-1 Z" /><path className="gc-f" d="M-0.75 0.15 h0.4 v0.5 h-0.4 Z M0.35 0.15 h0.4 v0.5 h-0.4 Z" /></>,
  },
}

export const OUTFIT_KEYS = Object.keys(OUTFITS)

export function Outfit({ outfit, anchors }: { outfit: string; anchors: Anchors }) {
  const o = OUTFITS[outfit]
  return o ? <g transform={place(anchors[o.slot])}>{o.art}</g> : null
}

// The move each sport's prop makes; the motion is in globals.css (gc-move-*).
type Move = 'toss' | 'swing' | 'hop' | 'stance'
const ball = (seams: React.ReactNode) => <><circle className="gc-f" cx="0" cy="0" r="1" />{seams}</>
const stick = (head: React.ReactNode) => <><path d="M0 1.2 L0.5 -1.6" />{head}</>

const SPORTS: Record<string, { move: Move; on?: 'head'; art: React.ReactNode }> = {
  basketball: { move: 'toss', art: ball(<path d="M-1 0 H1 M0 -1 V1 M-0.7 -0.7 Q0 0 -0.7 0.7 M0.7 -0.7 Q0 0 0.7 0.7" />) },
  football: { move: 'toss', art: <><ellipse className="gc-t" cx="0" cy="0" rx="1.3" ry="0.8" transform="rotate(-25)" /><path d="M-0.45 0.2 L0.45 -0.2 M-0.25 -0.1 l0.15 0.35 M0.05 -0.2 l0.15 0.35" /></> },
  soccer: { move: 'toss', art: ball(<path className="gc-t" d="M0 -0.45 L0.43 -0.14 L0.27 0.37 H-0.27 L-0.43 -0.14 Z" />) },
  baseball: { move: 'toss', art: ball(<path d="M-0.55 -0.8 Q-0.1 0 -0.55 0.8 M0.55 -0.8 Q0.1 0 0.55 0.8" />) },
  softball: { move: 'toss', art: ball(<path d="M-0.55 -0.8 Q-0.1 0 -0.55 0.8 M0.55 -0.8 Q0.1 0 0.55 0.8" />) },
  volleyball: { move: 'toss', art: ball(<path d="M0 -1 Q0.6 -0.2 0 0 Q-0.9 0.2 -0.85 0.5 M0 0 Q0.5 0.6 0.5 0.85 M0 0 Q0.8 -0.3 1 -0.1" />) },
  tennis: { move: 'swing', art: stick(<><ellipse className="gc-f" cx="0.75" cy="-2.3" rx="0.7" ry="0.9" transform="rotate(10 0.75 -2.3)" /><path d="M0.3 -2.3 H1.2 M0.75 -3 V-1.5" opacity="0.6" /></>) },
  golf: { move: 'swing', art: stick(<path className="gc-s" d="M0.5 -1.6 l0.7 -0.15 l0.05 0.35 l-0.7 0.1 Z" />) },
  lacrosse: { move: 'swing', art: stick(<><path className="gc-f" d="M0.5 -1.6 Q0 -2.4 0.5 -2.9 Q1.2 -2.8 1.1 -2 Z" /><path d="M0.4 -2.2 H0.95 M0.6 -2.7 V-1.8" opacity="0.6" /></>) },
  hockey: { move: 'swing', art: <><path d="M0.5 -1.6 L0 1.1 Q-0.1 1.5 -0.9 1.5" /><ellipse className="gc-s" cx="-1.5" cy="1.6" rx="0.4" ry="0.15" /></> },
  track: { move: 'hop', art: <path d="M-1.1 1 V-0.4 H1.1 V1 M-1.1 0.1 H1.1" /> },
  crosscountry: { move: 'hop', art: <path className="gc-t" d="M-1.1 0.5 Q-1.1 -0.3 -0.4 -0.3 L0.1 0 Q0.9 0.1 1.2 0.5 V0.8 H-1.1 Z" /> },
  gymnastics: { move: 'hop', art: <path d="M-1 0.8 Q-0.4 -0.6 0 0.2 Q0.4 1 1 -0.6 M0.6 -0.9 l0.4 0.3 l-0.5 0.2" /> },
  cheer: { move: 'hop', art: <><circle className="gc-t" cx="0" cy="0" r="1" /><path d="M0 -1.3 V-0.9 M0 0.9 V1.3 M-1.3 0 H-0.9 M0.9 0 H1.3 M-0.9 -0.9 l0.3 0.3 M0.9 -0.9 l-0.3 0.3 M-0.9 0.9 l0.3 -0.3 M0.9 0.9 l-0.3 -0.3" /></> },
  swimming: { move: 'stance', on: 'head', art: <><circle className="gc-t" cx="-0.4" cy="0.36" r="0.28" /><circle className="gc-t" cx="0.4" cy="0.36" r="0.28" /><path d="M-1 0.36 H-0.68 M0.68 0.36 H1 M-0.12 0.36 H0.12" /></> },
  wrestling: { move: 'stance', on: 'head', art: <><path className="gc-t" d="M-1.05 0.5 Q-1.25 0.9 -0.95 1.2 Q-0.7 0.9 -0.85 0.5 Z M1.05 0.5 Q1.25 0.9 0.95 1.2 Q0.7 0.9 0.85 0.5 Z" /><path d="M-0.95 0.5 Q0 -0.15 0.95 0.5" /></> },
}

// Sports are free text on the profile; this finds the one we draw for.
export function sportKey(sport: string | null | undefined): string | null {
  const s = (sport ?? '').toLowerCase().replace(/[^a-z]/g, '')
  if (!s) return null
  if (s.includes('track')) return 'track'
  if (s === 'xc') return 'crosscountry'
  if (s.includes('swim') || s.includes('dive') || s.includes('waterpolo')) return 'swimming'
  if (s.includes('cheer') || s.includes('dance')) return 'cheer'
  if (s.includes('gymnast')) return 'gymnastics'
  return Object.keys(SPORTS).find(k => s.includes(k)) ?? null
}

export const moveFor = (sport: string | null): Move | null => (sport && SPORTS[sport] ? SPORTS[sport].move : null)

export function SportProp({ sport, anchors }: { sport: string; anchors: Anchors }) {
  const p = SPORTS[sport]
  if (!p) return null
  const a: Anchor = p.on === 'head' ? anchors.head : [anchors.hand[0], anchors.hand[1], anchors.hand[2]]
  return <g transform={place(a)}><g className="gc-prop">{p.art}</g></g>
}
