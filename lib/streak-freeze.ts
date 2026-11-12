// Streak freezes. A freeze is earned for every 7 active days in a streak,
// up to MAX_BANK saved. A missed day uses one and the streak carries on.
// Everything is worked out from the list of active days, so there is
// nothing to store and nothing to get out of sync.

export const EARN_EVERY = 7
export const MAX_BANK = 2

export interface Frozen {
  /** Active days plus the days a freeze covered, sorted. Use this for streak math. */
  days: string[]
  /** The days a freeze was used on. */
  frozen: string[]
  /** Freezes the athlete holds after `through`. */
  bank: number
}

function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

// `through` is the last day that can count as missed: pass yesterday, since
// today is not a miss until it is over. Without it, only gaps between
// active days are bridged.
export function withFreezes(activeDays: Iterable<string>, through?: string): Frozen {
  const active = new Set(activeDays)
  const sorted = [...active].sort()
  if (sorted.length === 0) return { days: [], frozen: [], bank: 0 }
  const last = sorted[sorted.length - 1]
  const end = through && through > last ? through : last

  const frozen: string[] = []
  let bank = 0
  let alive = false
  let sinceEarn = 0
  for (let day = sorted[0]; day <= end; day = nextDay(day)) {
    if (active.has(day)) {
      alive = true
      sinceEarn++
      if (sinceEarn % EARN_EVERY === 0) bank = Math.min(MAX_BANK, bank + 1)
    } else if (alive && bank > 0) {
      bank--
      frozen.push(day)
    } else {
      alive = false
      sinceEarn = 0
    }
  }
  return { days: [...sorted, ...frozen].sort(), frozen, bank }
}
