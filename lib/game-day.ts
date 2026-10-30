import { shiftDate } from './nutrition'

export type GameDayPhase = 'night_before' | 'game_day' | 'none'

export interface GuideBlock { heading: string; items: string[] }
export interface GameDayGuide { title: string; summary: string; blocks: GuideBlock[] }

export function gameDayPhase(nextCompetitionAt: string | null | undefined, today: string): GameDayPhase {
  if (!nextCompetitionAt) return 'none'
  const game = nextCompetitionAt.slice(0, 10)
  if (game === today) return 'game_day'
  if (game === shiftDate(today, 1)) return 'night_before'
  return 'none'
}

export function daysUntil(nextCompetitionAt: string | null | undefined, today: string): number | null {
  if (!nextCompetitionAt) return null
  const [gy, gm, gd] = nextCompetitionAt.slice(0, 10).split('-').map(Number)
  const [ty, tm, td] = today.split('-').map(Number)
  return Math.round((Date.UTC(gy, gm - 1, gd) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

const kg = (lb: number) => lb / 2.2046
const r5 = (n: number) => Math.round(n / 5) * 5

// Targets scale with body weight when known; otherwise generic ranges.
function targets(bodyWeightLb?: number | null) {
  const w = bodyWeightLb && bodyWeightLb > 0 ? kg(bodyWeightLb) : null
  return {
    dinnerCarbs: w ? `${r5(w * 1.5)}–${r5(w * 2)} g` : '100–150 g',
    dayCarbs: w ? `${r5(w * 5)}–${r5(w * 7)} g` : '350–500 g',
    preMealCarbs: w ? `${r5(w * 1)}–${r5(w * 2)} g` : '75–150 g',
    protein: w ? `${r5(w * 0.4)} g` : '25–35 g',
    fluidOz: w ? `${Math.round(w * 6 / 29.57)}–${Math.round(w * 8 / 29.57)} oz` : '16–20 oz',
  }
}

// ---- Timing windows -------------------------------------------------

export type WindowKey = 'main' | 'topup' | 'during' | 'after'

export interface GameWindow {
  key: WindowKey
  title: string
  when: string          // "9:00–10:00 AM" when a game time is set, else "3–4 hours before"
  eat: string
  drink: string
  tip: string
}

export function parseTime(t: string | null | undefined): number | null {
  if (!t) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(t)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440
  const h24 = Math.floor(m / 60)
  const mm = m % 60
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const suffix = h24 < 12 ? 'AM' : 'PM'
  return mm === 0 ? `${h12} ${suffix}` : `${h12}:${String(mm).padStart(2, '0')} ${suffix}`
}

// Offsets in minutes relative to game start.
const WINDOW_OFFSETS: Record<WindowKey, [number, number]> = {
  main: [-240, -180],
  topup: [-60, -45],
  during: [0, 120],
  after: [0, 120],
}

export function gameDayWindows(gameTime: string | null | undefined, bodyWeightLb?: number | null): GameWindow[] {
  const t = targets(bodyWeightLb)
  const start = parseTime(gameTime)
  const when = (key: WindowKey, fallback: string) => {
    if (start === null) return fallback
    const [a, b] = WINDOW_OFFSETS[key]
    if (key === 'during') return `${formatClock(start + a)} start`
    if (key === 'after') return `by ${formatClock(start + 120 + b)}`
    return `${formatClock(start + a)}–${formatClock(start + b)}`
  }
  return [
    {
      key: 'main',
      title: 'Main meal',
      when: when('main', '3–4 hours before'),
      eat: `${t.preMealCarbs} carbs plus about ${t.protein} protein. Oatmeal with banana and eggs, a turkey sandwich with fruit, or a rice bowl with chicken.`,
      drink: `${t.fluidOz} of water with the meal.`,
      tip: 'Low fat, low fiber, nothing spicy. Familiar foods only.',
    },
    {
      key: 'topup',
      title: 'Top-up snack',
      when: when('topup', '45–60 minutes before'),
      eat: 'Around 30 g of quick carbs: a banana, granola bar, applesauce pouch, pretzels or a sports drink.',
      drink: '8–16 oz of water or an electrolyte drink. Stop chugging 20 minutes before start.',
      tip: 'Caffeine only if you have used it in practice. Never try it first on game day.',
    },
    {
      key: 'during',
      title: 'During the game',
      when: when('during', 'Game time'),
      eat: 'Over 60 minutes or in heat: 30–60 g carbs per hour from a sports drink, chews or orange slices.',
      drink: 'Sip water or a sports drink at every break. Halftime: a few sips and a quick carb.',
      tip: 'Nothing that needs long chewing. Keep it light and fast.',
    },
    {
      key: 'after',
      title: 'Refuel',
      when: when('after', 'Within 2 hours after'),
      eat: `${t.protein} protein plus carbs: chocolate milk, a chicken burrito, pasta with meat sauce or a yogurt smoothie.`,
      drink: '16–24 oz of fluid for every pound lost in sweat.',
      tip: `Game-day carb target: ${t.dayCarbs}, spread across the day.`,
    },
  ]
}

// Which window the athlete is in right now, given minutes since midnight
// on game day. Null when no game time is known.
export function currentWindow(gameTime: string | null | undefined, nowMinutes: number): WindowKey | null {
  const start = parseTime(gameTime)
  if (start === null) return null
  const d = nowMinutes - start
  if (d < -90) return 'main'
  if (d < -10) return 'topup'
  if (d < 120) return 'during'
  return 'after'
}

export function gameDayGuide(phase: Exclude<GameDayPhase, 'none'>, bodyWeightLb?: number | null, gameTime?: string | null): GameDayGuide {
  const t = targets(bodyWeightLb)
  if (phase === 'night_before') {
    return {
      title: 'Tomorrow is game day — fuel tonight',
      summary: 'Tonight is where most of tomorrow’s energy gets stored. Nothing new, nothing heavy, plenty of carbs.',
      blocks: [
        { heading: 'Dinner (2–3 h before bed)', items: [
          `Carbs first: ${t.dinnerCarbs} from rice, pasta, potatoes, bread or tortillas.`,
          'Lean protein, palm-sized portion (chicken, fish, lean beef, eggs, tofu).',
          'Cooked vegetables or fruit. Skip big raw salads and beans so your stomach is calm tomorrow.',
        ] },
        { heading: 'Hydration', items: [
          `Sip ${t.fluidOz} of water with dinner, then keep a bottle nearby through the evening.`,
          'Add salt to dinner or drink an electrolyte mix so you hold the water.',
          'Pale-yellow urine before bed means you are on track.',
        ] },
        { heading: 'Rules for tonight', items: [
          'Only foods you have eaten before a game without trouble.',
          'No energy drinks or late caffeine. Sleep is part of the fueling plan.',
          'Hungry at bedtime? Cereal with milk, toast with honey, or a banana.',
        ] },
      ],
    }
  }
  return {
    title: 'Game day — here’s the plan',
    summary: 'Eat on a schedule, not on nerves. Carbs power the engine, fluids keep it cool.',
    blocks: gameDayWindows(gameTime, bodyWeightLb).map(w => ({
      heading: `${w.title} · ${w.when}`,
      items: [w.eat, w.drink, w.tip],
    })),
  }
}
