import type { DistanceUnit } from '@/types/exercise'

// Shared by the Track tab and the progress API. Times are stored as
// seconds (hundredths kept for sprints); distances as entered, with unit.

export const DISTANCE_UNITS: DistanceUnit[] = ['yd', 'm', 'mi', 'km']

// Short efforts (sprints, shuttles, erg pieces) read best as a fastest
// split; longer units read as pace.
export function isPaceUnit(unit: DistanceUnit | null | undefined): boolean {
  return unit === 'mi' || unit === 'km'
}

// Sprints default to yards, runs to miles, erg to meters.
export function defaultUnit(slug: string | null | undefined, name: string): DistanceUnit {
  const key = (slug ?? name).toLowerCase()
  if (/sprint|shuttle|dash|fly|agility/.test(key)) return 'yd'
  if (/row|erg/.test(key)) return 'm'
  return 'mi'
}

// "4.62" → 4.62, "5:30" → 330, "1:02:10.5" → 3730.5. null when unparseable.
export function parseTime(raw: string | null | undefined): number | null {
  if (!raw) return null
  const s = raw.trim().replace(/\s+/g, '')
  if (!s) return null
  const parts = s.split(':')
  if (parts.length > 3 || parts.some(p => p === '' || !/^\d+(\.\d+)?$/.test(p))) return null
  let sec = 0
  for (const p of parts) sec = sec * 60 + Number(p)
  return Number.isFinite(sec) ? Math.round(sec * 100) / 100 : null
}

// 4.62 → "4.62", 330 → "5:30", 3730.5 → "1:02:10.5". Hundredths only
// appear under a minute, where they matter.
export function formatTime(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return ''
  if (sec < 60) return (Math.round(sec * 100) / 100).toString()
  const whole = Math.round(sec)
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const s = whole % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

// Seconds per unit of distance, e.g. 492 → "8:12 /mi".
export function paceSec(distance: number, sec: number): number | null {
  if (!(distance > 0) || !(sec > 0)) return null
  return sec / distance
}

export function formatPace(secPerUnit: number | null, unit: DistanceUnit): string {
  if (secPerUnit == null) return ''
  return `${formatTime(Math.round(secPerUnit))} /${unit}`
}

export interface DistanceTimeRow {
  workout_log_id: string | null
  distance: number | null
  distance_unit: DistanceUnit | null
  duration_sec: number | null
  created_at?: string
}

export interface DistanceTimePoint { date: string; value: number; workout_log_id: string | null }

export interface DistanceTimeSummary {
  metric: 'split' | 'pace'
  unit: DistanceUnit
  refDistance: number | null   // the distance a split series is measured at
  series: DistanceTimePoint[]  // lower is better for both metrics
}

// Per-session series. Split mode (yd/m): fastest time at the most-logged
// distance. Pace mode (mi/km): total time over total distance.
export function distanceTimeSeries(rows: DistanceTimeRow[]): DistanceTimeSummary | null {
  const valid = rows.filter(r => r.distance != null && r.distance > 0 && r.duration_sec != null && r.duration_sec > 0 && r.distance_unit)
  if (valid.length === 0) return null

  const unitCount = new Map<DistanceUnit, number>()
  for (const r of valid) unitCount.set(r.distance_unit!, (unitCount.get(r.distance_unit!) ?? 0) + 1)
  const unit = [...unitCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
  const inUnit = valid.filter(r => r.distance_unit === unit)

  const groups = new Map<string, { date: string; rows: DistanceTimeRow[]; logId: string | null }>()
  for (const r of inUnit) {
    const date = (r.created_at ?? '').slice(0, 10)
    const key = r.workout_log_id ?? `day:${date}`
    const g = groups.get(key)
    if (g) g.rows.push(r)
    else groups.set(key, { date, rows: [r], logId: r.workout_log_id ?? null })
  }

  if (isPaceUnit(unit)) {
    const series: DistanceTimePoint[] = []
    for (const g of groups.values()) {
      const dist = g.rows.reduce((a, r) => a + r.distance!, 0)
      const sec = g.rows.reduce((a, r) => a + r.duration_sec!, 0)
      const p = paceSec(dist, sec)
      if (p != null) series.push({ date: g.date, value: Math.round(p), workout_log_id: g.logId })
    }
    return { metric: 'pace', unit, refDistance: null, series: series.sort((a, b) => a.date.localeCompare(b.date)) }
  }

  const distCount = new Map<number, number>()
  for (const r of inUnit) distCount.set(r.distance!, (distCount.get(r.distance!) ?? 0) + 1)
  const refDistance = [...distCount.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  const series: DistanceTimePoint[] = []
  for (const g of groups.values()) {
    const at = g.rows.filter(r => r.distance === refDistance)
    if (at.length === 0) continue
    const best = Math.min(...at.map(r => r.duration_sec!))
    series.push({ date: g.date, value: Math.round(best * 100) / 100, workout_log_id: g.logId })
  }
  return { metric: 'split', unit, refDistance, series: series.sort((a, b) => a.date.localeCompare(b.date)) }
}

// Sessions that beat every earlier one (lower is better).
export function lowsFromSeries(series: DistanceTimePoint[]): DistanceTimePoint[] {
  const out: DistanceTimePoint[] = []
  let best = Infinity
  for (const p of series) {
    if (p.value < best) { out.push(p); best = p.value }
  }
  return out
}
