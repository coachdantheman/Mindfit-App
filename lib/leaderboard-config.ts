// Everything tunable about the leaderboard lives here. Changing a number
// or a name is a redeploy, never a migration: the database only returns
// raw per-day counts (see supabase-migration-v21-leaderboard.sql).

export type Pillar = 'mind' | 'body' | 'fuel' | 'rest'

export const PILLARS: { key: Pillar; name: string; emoji: string; blurb: string }[] = [
  { key: 'mind', name: 'Mind', emoji: '🧠', blurb: 'Journal, flow, visualization, meditation, goals' },
  { key: 'body', name: 'Body', emoji: '💪', blurb: 'Workouts and sets' },
  { key: 'fuel', name: 'Fuel', emoji: '🍽️', blurb: 'Meals logged' },
  { key: 'rest', name: 'Rest', emoji: '😴', blurb: 'Sleep and recovery check-ins' },
]

// Column names match get_leaderboard_activity(). Food is scored separately (FUEL).
export type ActionKey =
  | 'journal' | 'assessments' | 'flow_sessions' | 'flow_logs' | 'flow_checkins'
  | 'visualization' | 'meditation' | 'affirmations' | 'goals_done'
  | 'workouts' | 'sets' | 'sleep' | 'recovery'

export interface ActionRule {
  key: ActionKey
  pillar: Pillar
  label: string
  points: number
  /** Max times per day (or per ISO week when `per` is 'week') that count. */
  cap: number
  per?: 'day' | 'week'
}

export const ACTIONS: ActionRule[] = [
  { key: 'journal',       pillar: 'mind', label: 'Daily journal',            points: 10, cap: 1 },
  { key: 'assessments',   pillar: 'mind', label: 'Weekly assessment',        points: 25, cap: 1, per: 'week' },
  { key: 'flow_sessions', pillar: 'mind', label: 'Flow State session',       points: 20, cap: 1 },
  { key: 'flow_logs',     pillar: 'mind', label: 'Post-competition flow log', points: 15, cap: 1 },
  { key: 'flow_checkins', pillar: 'mind', label: 'Flow stage check-in',      points: 5,  cap: 3 },
  { key: 'visualization', pillar: 'mind', label: 'Visualization',            points: 10, cap: 1 },
  { key: 'meditation',    pillar: 'mind', label: 'Meditation',               points: 10, cap: 1 },
  { key: 'affirmations',  pillar: 'mind', label: 'New affirmation',          points: 5,  cap: 2 },
  { key: 'goals_done',    pillar: 'mind', label: 'Goal completed',           points: 20, cap: 2 },
  { key: 'workouts',      pillar: 'body', label: 'Workout logged',           points: 25, cap: 2 },
  { key: 'sets',          pillar: 'body', label: 'Each set logged',          points: 1,  cap: 10 },
  { key: 'sleep',         pillar: 'rest', label: 'Sleep logged',             points: 10, cap: 1 },
  { key: 'recovery',      pillar: 'rest', label: 'Recovery check-in',        points: 5,  cap: 1 },
]

export const FUEL = {
  /** Any food logged that day. */
  dayPoints: 10,
  /** Extra when at least this many entries were logged that day. */
  fullDayEntries: 3,
  fullDayBonus: 5,
}

/** All four pillars active on the same day. */
export const CLUTCH_DAY_BONUS = 20

export interface Level { key: string; name: string; min: number }

export const LEVELS: Level[] = [
  { key: 'rookie',       name: 'Rookie',       min: 0 },
  { key: 'starter',      name: 'Starter',      min: 200 },
  { key: 'captain',      name: 'Captain',      min: 600 },
  { key: 'all_state',    name: 'All-State',    min: 1200 },
  { key: 'all_american', name: 'All-American', min: 2000 },
  { key: 'legend',       name: 'Legend',       min: 3000 },
]

/** Points needed this month before a title is awarded. */
export const MIN_TITLE_POINTS = 100

/** Pillar share thresholds (fraction of non-bonus points). */
export const TITLE_RULES = {
  single: 0.5,   // one pillar at least this share
  pair: 0.3,     // top two pillars each at least this share
  balanced: 0.15 // all four pillars at least this share
}

export interface Title {
  key: string
  name: string
  emoji: string
  blurb: string
  /** Pillars that define the title; empty for fallbacks. */
  pillars: Pillar[]
}

export const TITLES: Title[] = [
  { key: 'warming_up',   name: 'Warming Up',   emoji: '🌱', pillars: [],               blurb: `Earn ${MIN_TITLE_POINTS} points this month to unlock a title.` },
  { key: 'monk',         name: 'Monk',         emoji: '🧘', pillars: ['mind'],         blurb: 'Most of your work happens between the ears.' },
  { key: 'gym_rat',      name: 'Gym Rat',      emoji: '🏋️', pillars: ['body'],         blurb: 'Practically lives in the weight room.' },
  { key: 'chef',         name: 'Chef',         emoji: '🍳', pillars: ['fuel'],         blurb: 'Fuels like a pro, every day.' },
  { key: 'recharger',    name: 'Recharger',    emoji: '🔋', pillars: ['rest'],         blurb: 'Sleep and recovery come first.' },
  { key: 'gym_monk',     name: 'Gym Monk',     emoji: '🥋', pillars: ['mind', 'body'], blurb: 'Trains the mind as hard as the body.' },
  { key: 'zen_chef',     name: 'Zen Chef',     emoji: '🍵', pillars: ['mind', 'fuel'], blurb: 'Calm head, clean plate.' },
  { key: 'dreamer',      name: 'Dreamer',      emoji: '🌙', pillars: ['mind', 'rest'], blurb: 'Visualizes by day, recovers by night.' },
  { key: 'machine',      name: 'Machine',      emoji: '⚙️', pillars: ['body', 'fuel'], blurb: 'Lifts heavy and eats to match.' },
  { key: 'tank',         name: 'Tank',         emoji: '🛡️', pillars: ['body', 'rest'], blurb: 'Hard sessions, full recovery.' },
  { key: 'fully_charged', name: 'Fully Charged', emoji: '⚡', pillars: ['fuel', 'rest'], blurb: 'Fueled and rested, ready to go.' },
  { key: 'utility',      name: 'Utility Player', emoji: '🧩', pillars: [],             blurb: 'Spread across the board, no single lane yet.' },
  { key: 'clutch',       name: 'Clutch',       emoji: '⭐', pillars: ['mind', 'body', 'fuel', 'rest'], blurb: 'All four pillars, every week. The complete athlete.' },
]
