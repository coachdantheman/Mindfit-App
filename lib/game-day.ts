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

export function gameDayGuide(phase: Exclude<GameDayPhase, 'none'>, bodyWeightLb?: number | null): GameDayGuide {
  const t = targets(bodyWeightLb)
  if (phase === 'night_before') {
    return {
      title: 'Tomorrow is game day — fuel tonight',
      summary: 'Tonight is where most of tomorrow’s energy gets stored. Nothing new, nothing heavy, plenty of carbs.',
      blocks: [
        { heading: 'Dinner (2–3 h before bed)', items: [
          `Carbs first: ${t.dinnerCarbs} from rice, pasta, potatoes, bread or tortillas.`,
          `Lean protein, palm-sized portion (chicken, fish, lean beef, eggs, tofu).`,
          'Cooked vegetables or fruit. Skip big raw salads and beans — less fiber means a calmer stomach tomorrow.',
          'Keep fat and fried food low. It slows digestion and sits heavy in the morning.',
        ] },
        { heading: 'Hydration', items: [
          `Sip ${t.fluidOz} of water with dinner, then keep a bottle nearby through the evening.`,
          'Add salt to dinner or drink an electrolyte mix — sodium is what lets you hold the water.',
          'Pale-yellow urine before bed means you are on track.',
        ] },
        { heading: 'Rules for tonight', items: [
          'Only foods you have eaten before a game without trouble. Game-day eve is not the night to experiment.',
          'No energy drinks or late caffeine. Sleep is part of the fueling plan.',
          'If you go to bed hungry, add a small carb snack: cereal with milk, toast with honey, or a banana.',
        ] },
      ],
    }
  }
  return {
    title: 'Game day — here’s the plan',
    summary: 'Eat on a schedule, not on nerves. Carbs power the engine, fluids keep it cool, and the identity you are building shows up fueled.',
    blocks: [
      { heading: '3–4 hours before', items: [
        `Your main meal: ${t.preMealCarbs} carbs plus about ${t.protein} protein.`,
        'Easy choices: oatmeal with banana and eggs, turkey sandwich with fruit, rice bowl with chicken, pancakes with yogurt.',
        'Low fat, low fiber, nothing spicy. Familiar foods only.',
        `Drink ${t.fluidOz} of water with the meal.`,
      ] },
      { heading: '60 minutes before', items: [
        'Small carb top-up: banana, granola bar, applesauce pouch, pretzels or a sports drink (around 30 g carbs).',
        'Another 8–16 oz of water or electrolyte drink. Stop chugging 20 minutes before start.',
        'Caffeine only if you have used it in practice. Never try it first on game day.',
      ] },
      { heading: 'During the game', items: [
        'Sip water or a sports drink at every break. In heat or anything over 60 minutes, aim for 30–60 g carbs per hour (sports drink, chews, orange slices).',
        'Halftime: a few sips, a quick carb, and nothing that needs chewing for long.',
      ] },
      { heading: 'Within 2 hours after', items: [
        `Protein ${t.protein} plus carbs to refill: chocolate milk, a chicken burrito, pasta with meat sauce or a smoothie with yogurt and fruit.`,
        'Rehydrate: 16–24 oz of fluid for every pound lost in sweat. Weigh in before and after if you can.',
        `Daily carb target on game day: ${t.dayCarbs}. Spread it across the day; no need to force it all at once.`,
      ] },
    ],
  }
}
