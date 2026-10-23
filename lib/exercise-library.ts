import type { ExerciseLibraryRow } from '@/types/exercise'

export type SearchableExercise = Pick<ExerciseLibraryRow, 'name' | 'aliases'>

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[—–/-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// "barbell rows" → "barbell row"; leaves "press", "dips"→"dip" (fine, we
// index both forms so either side matches).
function singularize(norm: string): string {
  return norm
    .split(' ')
    .map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ')
}

const compact = (s: string) => s.replace(/\s+/g, '')

export function searchExercises<T extends SearchableExercise>(list: T[], q: string, limit = 25): T[] {
  const query = normalizeName(q)
  const tokens = query.split(' ').filter(Boolean)
  if (tokens.length === 0) return []
  const scored: { ex: T; score: number }[] = []
  for (const ex of list) {
    const name = normalizeName(ex.name)
    const aliases = (ex.aliases ?? []).map(normalizeName)
    const hay = [name, ...aliases].join(' | ')
    const words = hay.split(/[\s|]+/)
    let score = 0
    let ok = true
    if (tokens.length > 1) {
      if (name.includes(query)) score += 8
      else if (aliases.some(a => a.includes(query))) score += 4
    }
    if (compact(name) === compact(query)) score += 8
    else if (aliases.some(a => compact(a) === compact(query))) score += 6
    for (const t of tokens) {
      if (name.startsWith(t)) score += 5
      else if (aliases.some(a => a.startsWith(t))) score += 4
      else if (words.some(w => w.startsWith(t))) score += 3
      else if (hay.includes(t)) score += 1
      else { ok = false; break }
    }
    if (!ok) continue
    score -= name.length / 100
    scored.push({ ex, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.ex)
}

const indexCache = new WeakMap<object, Map<string, unknown>>()

function indexFor<T extends SearchableExercise>(list: T[]): Map<string, T> {
  const cached = indexCache.get(list) as Map<string, T> | undefined
  if (cached) return cached
  const idx = new Map<string, T>()
  const put = (k: string, ex: T) => { if (k && !idx.has(k)) idx.set(k, ex) }
  const putAll = (raw: string, ex: T) => {
    const n = normalizeName(raw)
    put(n, ex)
    put(singularize(n), ex)
    put(compact(n), ex)
    put(compact(singularize(n)), ex)
  }
  // Names first so a name always wins over another row's alias.
  for (const ex of list) putAll(ex.name, ex)
  for (const ex of list) for (const a of ex.aliases ?? []) putAll(a, ex)
  indexCache.set(list, idx)
  return idx
}

// Resolve a legacy free-text or plan exercise name to a library row.
// Tolerates case, punctuation, hyphen/space ("pull-ups", "pull ups",
// "pullups") and simple plurals.
export function matchExercise<T extends SearchableExercise>(list: T[], name: string): T | null {
  const n = normalizeName(name)
  if (!n) return null
  const idx = indexFor(list)
  return idx.get(n) ?? idx.get(singularize(n)) ?? idx.get(compact(n)) ?? idx.get(compact(singularize(n))) ?? null
}

export const MUSCLE_GROUP_LABELS: Record<ExerciseLibraryRow['muscle_group'], string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  full_body: 'Full body',
  conditioning: 'Conditioning',
  mobility: 'Mobility',
}

export function slugify(name: string): string {
  return normalizeName(name).replace(/\s+/g, '-').slice(0, 60)
}
