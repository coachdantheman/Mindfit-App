// Team schedules: games and practices. Pure helpers, unit-tested.

export type EventKind = 'game' | 'practice'
export type HomeAway = 'home' | 'away' | 'neutral'

export interface ScheduleEvent {
  id?: string
  team_id?: string
  kind: EventKind
  event_date: string          // YYYY-MM-DD
  start_time: string | null   // HH:MM
  opponent: string | null
  location: string | null
  home_away: HomeAway | null
  notes: string | null
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?/i

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const t = v.trim().slice(0, max)
  return t || null
}

function validDate(s: string): boolean {
  if (!DATE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// Accepts loose input (from a form or the AI parser); null when unusable.
export function cleanEvent(raw: any): ScheduleEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const kind: EventKind = raw.kind === 'practice' ? 'practice' : 'game'
  const event_date = typeof raw.event_date === 'string' ? raw.event_date.slice(0, 10) : ''
  if (!validDate(event_date)) return null
  const t = typeof raw.start_time === 'string' ? TIME.exec(raw.start_time.trim()) : null
  let hour = t ? Number(t[1]) : 0
  if (t?.[3]) {
    const pm = t[3].toLowerCase() === 'pm'
    if (hour > 12) hour = -1
    else hour = (hour % 12) + (pm ? 12 : 0)
  }
  const start_time = t && hour >= 0 ? `${String(hour).padStart(2, '0')}:${t[2]}` : null
  const home_away = raw.home_away === 'home' || raw.home_away === 'away' || raw.home_away === 'neutral' ? raw.home_away : null
  return {
    kind,
    event_date,
    start_time,
    opponent: kind === 'game' ? str(raw.opponent, 80) : null,
    location: str(raw.location, 120),
    home_away: kind === 'game' ? home_away : null,
    notes: str(raw.notes, 300),
  }
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

function isoDow(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return js === 0 ? 7 : js
}

// Practice rows for the picked weekdays (1=Mon..7=Sun) between two dates,
// skipping days that already have a game. Capped at 200 rows.
export function expandRecurring(
  input: { days: number[]; start_time: string | null; from: string; to: string; location?: string | null },
  gameDates: Set<string> = new Set(),
): ScheduleEvent[] {
  if (!validDate(input.from) || !validDate(input.to) || input.to < input.from) return []
  const days = new Set(input.days.filter(d => d >= 1 && d <= 7))
  const out: ScheduleEvent[] = []
  for (let day = input.from; day <= input.to && out.length < 200; day = addDays(day, 1)) {
    if (!days.has(isoDow(day)) || gameDates.has(day)) continue
    const e = cleanEvent({ kind: 'practice', event_date: day, start_time: input.start_time, location: input.location ?? null })
    if (e) out.push(e)
  }
  return out
}

export type TrainingDayKind = 'game' | 'pre_game' | null

// Strength rule around competition: no heavy lifting on a game day or the
// day before. Returns what kind of day `date` is for this athlete.
export function trainingDayKind(date: string, gameDates: Iterable<string>): TrainingDayKind {
  const games = new Set(gameDates)
  if (games.has(date)) return 'game'
  if (games.has(addDays(date, 1))) return 'pre_game'
  return null
}

export function nextGame<T extends Pick<ScheduleEvent, 'kind' | 'event_date' | 'start_time'>>(events: T[], today: string): T | null {
  return events
    .filter(e => e.kind === 'game' && e.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))[0] ?? null
}

// Athlete-entered schedule (v37). Primary = the athlete's main team
// schedule; a coach's posted schedule always wins over the athlete's own.
// Secondary = extra sessions (trainer, MindFit, extra training, another
// sport) that may never overlap a primary event.
export interface TimedEvent { kind: string; event_date: string; start_time: string | null; end_time?: string | null }

const DEFAULT_MINUTES: Record<string, number> = { game: 180, practice: 120 }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// Minutes since midnight, or null when there is no start time (no
// overlap check is possible then). Missing or earlier end times fall back
// to a default length: 3h game, 2h practice, 1h anything else.
export function eventSpan(e: TimedEvent): [number, number] | null {
  if (!e.start_time) return null
  const start = toMin(e.start_time)
  const end = e.end_time ? toMin(e.end_time) : NaN
  return [start, end > start ? end : start + (DEFAULT_MINUTES[e.kind] ?? 60)]
}

export function findOverlap<T extends TimedEvent>(candidate: TimedEvent, events: T[]): T | null {
  const a = eventSpan(candidate)
  if (!a) return null
  for (const e of events) {
    if (e.event_date !== candidate.event_date) continue
    const b = eventSpan(e)
    if (b && a[0] < b[1] && b[0] < a[1]) return e
  }
  return null
}

export function effectivePrimary<T, U>(teamEvents: T[], ownPrimary: U[]): { source: 'coach' | 'athlete' | 'none'; events: (T | U)[]; hiddenOwn: number } {
  if (teamEvents.length > 0) return { source: 'coach', events: teamEvents, hiddenOwn: ownPrimary.length }
  if (ownPrimary.length > 0) return { source: 'athlete', events: ownPrimary, hiddenOwn: 0 }
  return { source: 'none', events: [], hiddenOwn: 0 }
}
